import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { importTables, changeSeries } from './workspace-editor.js';
import {
  configureMarkerMapping,
  markerMappingInputColumns,
} from './marker-mapping-settings.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import type { XyPlot } from '@plot-fig/figure-schema';
import { markerSourceForPlot } from '@plot-fig/svg-renderer';
import { applyBatchProperties } from './batch-properties.js';
import { duplicatePanel } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
export function mappingModel() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'data.csv' },
        rows: [
          ['X', 'Y', 'C', 'S'],
          ['0', '2', '-1', 'A'],
          ['1', '3', '0', 'B'],
          ['2', '4', '1', 'A'],
        ],
      }),
    ],
  );
}
it('复制图层、跨层移动与保存重开保留映射绑定和原行覆盖', () => {
  let model = mappingModel(),
    data = bindWorkspace(model.template, model.workspace);
  model = configureMarkerMapping(model, 'series-1', {
    mapping: { shape: { shapes: ['circle', 'square'] } },
    columns: { shape: data.columns[3]!.columnId },
  });
  data = bindWorkspace(model.template, model.workspace);
  const source = model.template.panels[0]!.plotSlots[0]! as XyPlot;
  source.markerOverrides = {
    source: markerSourceForPlot(source, data)!,
    points: [{ row: 2, style: { sizePt: 11 } }],
  };
  model = duplicatePanel(model, model.template.panels[0]!.panelId);
  const target = model.template.panels[1]!;
  model = movePlotToPanel(model, 'series-1', {
    panelId: target.panelId,
    xAxisId: target.axes.find((a) => a.dimension === 'x')!.axisId,
    yAxisId: target.axes.find((a) => a.dimension === 'y')!.axisId,
  });
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(model.template, model.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  for (const plot of reopened.template.panels[1]!.plotSlots as XyPlot[]) {
    expect(plot.markerMapping).toEqual(source.markerMapping);
    expect(plot.markerOverrides).toEqual(source.markerOverrides);
  }
  const rendered = renderFigureSvg(
    reopened.template,
    bindWorkspace(reopened.template, reopened.workspace),
    { purpose: 'export' },
  );
  expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
  expect(rendered.diagnostics.some((d) => d.message.includes('暂停'))).toBe(
    false,
  );
});
it('原子创建映射数据槽，复制曲线保留独立绑定，关闭映射清除孤立数据槽', () => {
  const initial = mappingModel(),
    data = bindWorkspace(initial.template, initial.workspace);
  const id = initial.template.panels[0]!.plotSlots[0]!.plotSlotId;
  const configured = configureMarkerMapping(initial, id, {
    mapping: {
      color: {
        mode: 'continuous',
        target: 'fill',
        colors: ['#000000', '#ffffff'],
      },
    },
    columns: { color: data.columns[2]!.columnId },
  });
  expect(
    renderFigureSvg(
      configured.template,
      bindWorkspace(configured.template, configured.workspace),
    ).ok,
  ).toBe(true);
  const plot = configured.template.panels[0]!.plotSlots[0]! as XyPlot;
  expect(plot.bindings.color).toBeTruthy();
  expect(initial.template.dataSlots).toHaveLength(2);
  const copied = changeSeries(configured, 'duplicate', id),
    copy = copied.template.panels[0]!.plotSlots[1]! as XyPlot;
  expect(copy.markerMapping).toEqual(plot.markerMapping);
  expect(copy.bindings.color).not.toBe(plot.bindings.color);
  const cleared = configureMarkerMapping(copied, id, {
    mapping: {},
    columns: {},
  });
  expect(
    cleared.template.dataSlots.some(
      (s) => s.dataSlotId === plot.bindings.color,
    ),
  ).toBe(false);
  expect(
    (cleared.template.panels[0]!.plotSlots[1]! as XyPlot).markerMapping,
  ).toEqual(plot.markerMapping);
});
it('连续颜色拒绝文本列，失败不修改原图', () => {
  const model = mappingModel(),
    before = structuredClone(model),
    data = bindWorkspace(model.template, model.workspace);
  expect(() =>
    configureMarkerMapping(model, 'series-1', {
      mapping: {
        color: {
          mode: 'continuous',
          target: 'fill',
          colors: ['#000000', '#ffffff'],
        },
      },
      columns: { color: data.columns[3]!.columnId },
    }),
  ).toThrow(/数值/);
  expect(model).toEqual(before);
});
it('日期列不作为符号映射来源', () => {
  const model = mappingModel();
  model.workspace.tables[0]!.columns[2]!.settings.type = 'date';
  const data = bindWorkspace(model.template, model.workspace);
  expect(
    markerMappingInputColumns(data, model.workspace).map((c) => c.columnId),
  ).not.toContain(data.columns[2]!.columnId);
  expect(() =>
    configureMarkerMapping(model, 'series-1', {
      mapping: {
        color: {
          mode: 'continuous',
          target: 'fill',
          colors: ['#000000', '#ffffff'],
        },
      },
      columns: { color: data.columns[2]!.columnId },
    }),
  ).toThrow(/类型/);
});
it('旧线图未保存基础符号时也能启用映射，并保持线图模式', () => {
  const model = mappingModel(),
    plot = model.template.panels[0]!.plotSlots[0]! as XyPlot;
  plot.mode = 'line';
  delete plot.markerStyle;
  const data = bindWorkspace(model.template, model.workspace);
  const next = configureMarkerMapping(model, plot.plotSlotId, {
    mapping: { size: { mode: 'area', minSize: 4, maxSize: 12, unit: 'pt' } },
    columns: { size: data.columns[2]!.columnId },
  });
  const xy = next.template.panels[0]!.plotSlots[0]! as XyPlot;
  expect(xy.mode).toBe('line');
  expect(xy.markerStyle).toEqual({
    visible: true,
    ...model.template.theme.marker,
    strokeWidthPt: 1,
  });
  expect(
    renderFigureSvg(next.template, bindWorkspace(next.template, next.workspace))
      .ok,
  ).toBe(true);
});
it('批量映射保留各自数据绑定，单点覆盖只允许复制至同源 XY', () => {
  let model = mappingModel();
  const data = bindWorkspace(model.template, model.workspace);
  model = configureMarkerMapping(model, 'series-1', {
    mapping: { size: { mode: 'area', minSize: 3, maxSize: 9, unit: 'pt' } },
    columns: { size: data.columns[2]!.columnId },
  });
  model = changeSeries(model, 'duplicate', 'series-1');
  const plots = model.template.panels[0]!.plotSlots as XyPlot[],
    bound = bindWorkspace(model.template, model.workspace);
  plots[0]!.markerOverrides = {
    source: markerSourceForPlot(plots[0]!, bound)!,
    points: [{ row: 2, style: { sizePt: 20 } }],
  };
  const source = {
      kind: 'plot' as const,
      panelId: model.template.panels[0]!.panelId,
      plotSlotId: 'series-1',
    },
    target = { ...source, plotSlotId: plots[1]!.plotSlotId };
  const next = applyBatchProperties(
    model.template,
    {
      source,
      targets: [target],
      groups: ['plot-marker-mapping', 'plot-marker-overrides'],
    },
    bound,
  );
  expect((next.panels[0]!.plotSlots[1]! as XyPlot).markerOverrides).toEqual(
    plots[0]!.markerOverrides,
  );
  expect(next.panels[0]!.plotSlots[1]!.bindings).toEqual(plots[1]!.bindings);
  const y = bound.bindings.find((b) => b.dataSlotId === plots[1]!.bindings.y)!;
  y.columnId = data.columns[2]!.columnId;
  expect(() =>
    applyBatchProperties(
      model.template,
      { source, targets: [target], groups: ['plot-marker-overrides'] },
      bound,
    ),
  ).toThrow(/同源/);
  delete plots[1]!.markerMapping;
  delete plots[1]!.bindings.size;
  expect(() =>
    applyBatchProperties(
      model.template,
      { source, targets: [target], groups: ['plot-marker-mapping'] },
      bound,
    ),
  ).toThrow();
});
