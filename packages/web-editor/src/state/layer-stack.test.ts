import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import {
  renderFigureSvg,
  materializeCurveOffsets,
} from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import { batchYColumns } from './batch-y-columns.js';
import { layerOffsetSettings, setLayerOffsets } from './layer-stack.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { duplicatePanel } from './panel-operations.js';
import { applyBatchProperties } from './batch-properties.js';

function fixture(count = 3) {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'spectra.csv' },
        rows: [
          ['x', ...Array.from({ length: count }, (_, i) => `Y${i}`)],
          [0, ...Array.from({ length: count }, (_, i) => i)],
          [1, ...Array.from({ length: count }, (_, i) => i + 10)],
        ],
      }),
    ],
  );
  const table = model.workspace.tables[0]!;
  return batchYColumns(model, {
    panelId: 'panel-main',
    tableId: 't',
    xColumnId: table.columns[0]!.columnId,
    yColumnIds: table.columns.slice(1).map((c) => c.columnId),
  });
}
const constant = {
  mode: 'constant',
  x: false,
  y: true,
  value: 25,
  gap: 8,
} as const;

it('应用于其他图层同时复制偏移，保持目标填充与数据绑定', () => {
  const model = fixture(),
    source = model.template.panels[0]!;
  const duplicate = duplicatePanel(model, source.panelId);
  const target = duplicate.template.panels[1]!;
  const firstTarget = target.plotSlots[0]!;
  if (firstTarget.kind !== 'xy') throw new Error('XY expected');
  firstTarget.transform = {
    fill: {
      target: 'baseline',
      positiveColor: '#ff0000',
      negativeColor: '#0000ff',
      opacity: 0.2,
    },
  };
  duplicate.template.panels[0] = setLayerOffsets(source, {
    ...constant,
    mode: 'auto',
  });
  const beforeTarget = structuredClone(target);
  const request = {
    source: { kind: 'panel', panelId: source.panelId },
    targets: [{ kind: 'panel', panelId: target.panelId }],
    groups: ['panel-stack'],
  } as const;
  const next = applyBatchProperties(duplicate.template, {
    ...request,
    targets: [...request.targets],
    groups: [...request.groups],
  });
  expect(layerOffsetSettings(next.panels[1]!).mode).toBe('auto');
  expect(next.panels[1]!.plotSlots.map((p) => p.bindings)).toEqual(
    beforeTarget.plotSlots.map((p) => p.bindings),
  );
  expect(next.panels[1]!.plotSlots[0]).toMatchObject({
    transform: { fill: firstTarget.transform.fill },
  });
  next.panels[0] = setLayerOffsets(next.panels[0]!, {
    ...constant,
    mode: 'none',
  });
  const clear = applyBatchProperties(next, {
    ...request,
    targets: [...request.targets],
    groups: [...request.groups],
  });
  expect(layerOffsetSettings(clear.panels[1]!).mode).toBe('none');
  const noCurves = structuredClone(duplicate.template);
  noCurves.panels[1]!.plotSlots = [];
  expect(() =>
    applyBatchProperties(noCurves, {
      ...request,
      targets: [...request.targets],
      groups: [...request.groups],
    }),
  ).toThrow(/XY.*面积曲线/);
});

it('批量常量间隔为 0、d、2d，恢复无偏移时保留填充和原始数据', () => {
  const model = fixture(),
    panel = model.template.panels[0]!;
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('XY expected');
  plot.transform = {
    fill: {
      target: 'baseline',
      positiveColor: '#ff0000',
      negativeColor: '#0000ff',
      opacity: 0.2,
    },
  };
  const before = structuredClone(model);
  const next = setLayerOffsets(panel, constant);
  const data = bindWorkspace(model.template, model.workspace);
  expect(
    next.plotSlots.map(
      (p) => materializeCurveOffsets(next, p.plotSlotId, data)?.offsetY,
    ),
  ).toEqual([0, 25, 50].map((value) => ({ mode: 'constant', value })));
  expect(layerOffsetSettings(next)).toMatchObject(constant);
  expect(setLayerOffsets(next, { ...constant, mode: 'none' })).toEqual(panel);
  expect(model).toEqual(before);
});

it('自动 8% 间距支持两轴，转单独偏移保留当前显示位置', () => {
  const model = fixture(),
    data = bindWorkspace(model.template, model.workspace);
  const auto = setLayerOffsets(model.template.panels[0]!, {
    ...constant,
    mode: 'auto',
    x: true,
  });
  expect(layerOffsetSettings(auto)).toMatchObject({
    mode: 'auto',
    x: true,
    y: true,
    gap: 8,
  });
  const individual = setLayerOffsets(
    auto,
    { ...constant, mode: 'individual' },
    data,
  );
  expect(layerOffsetSettings(individual).mode).toBe('individual');
  individual.plotSlots.forEach((p, i) => {
    if (p.kind !== 'xy') throw new Error('XY expected');
    expect(p.transform?.offsetY).toEqual({
      mode: 'constant',
      value: i * 10 * 1.08,
    });
    expect(p.transform?.offsetX).toEqual({ mode: 'constant', value: i * 1.08 });
  });
  expect(() =>
    setLayerOffsets(auto, { ...constant, mode: 'individual' }),
  ).toThrow(/原始数据/);
});

it('隐藏曲线不占可见偏移序号；切换偏移会解除累积堆叠', () => {
  const model = fixture(),
    panel = model.template.panels[0]!;
  panel.plotSlots[1]!.visible = false;
  panel.stack = {
    mode: 'percent',
    members: panel.plotSlots.map((p) => p.plotSlotId),
  };
  const next = setLayerOffsets(panel, constant);
  expect(next.stack).toBeUndefined();
  expect(
    materializeCurveOffsets(next, next.plotSlots[2]!.plotSlotId)?.offsetY,
  ).toEqual({ mode: 'constant', value: 25 });
});

it('94 条曲线的图层草稿应用、保存重开及 SVG 导出一致，偏移草稿不进入项目格式', () => {
  const model = fixture(94),
    ref = { kind: 'panel', panelId: 'panel-main' } as const;
  const data = bindWorkspace(model.template, model.workspace);
  const value = readPropertyObjectSettings(model.template, ref);
  if (value.kind !== 'panel') throw new Error('panel expected');
  value.curveOffsets = Object.fromEntries(
    model.template.panels[0]!.plotSlots.map((p) => [
      p.plotSlotId,
      { offsetY: { mode: 'auto', gap: 0.08 } },
    ]),
  );
  const next = updatePropertyObjectSettings(model.template, ref, value, data);
  const text = serializeWorkspaceProject(next, model.workspace),
    reopened = parseWorkspaceProject(text);
  expect(text).not.toContain('curveOffsets');
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  const rendered = renderFigureSvg(next, data);
  expect(rendered.ok).toBe(true);
  expect(
    renderFigureSvg(
      reopened.template,
      bindWorkspace(reopened.template, reopened.workspace),
    ),
  ).toEqual(rendered);
  const reset = readPropertyObjectSettings(next, ref);
  if (reset.kind !== 'panel') throw new Error('panel expected');
  reset.curveOffsets = {};
  const restored = updatePropertyObjectSettings(next, ref, reset, data);
  expect(restored.panels[0]!.plotSlots).toEqual(
    model.template.panels[0]!.plotSlots,
  );
});
