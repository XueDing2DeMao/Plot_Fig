import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { duplicatePanel } from './panel-operations.js';
import { arrangePanels, alignPanels } from './panel-layout.js';
import { readFrame } from './page-geometry.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { chartData } from '../../../../tests/helpers/chart-fixtures.js';

function source() {
  let model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  for (let i = 0; i < 3; i++)
    model = duplicatePanel(model, model.template.panels[0]!.panelId);
  const t = model.template;
  t.page.size = {
    width: { value: 200, unit: 'mm' },
    height: { value: 100, unit: 'mm' },
  };
  t.panels.forEach((p, i) => {
    p.frame = {
      x: 0.1 + (i % 2) * 0.5,
      y: 0.1 + Math.floor(i / 2) * 0.5,
      width: 0.3,
      height: 0.3,
    };
  });
  return t;
}
it('在原有外接区域内以不同横纵间距排列，保留其余属性、未选隐藏层和层叠顺序', () => {
  const t = source(),
    original = structuredClone(t);
  t.panels[3]!.visible = false;
  original.panels[3]!.visible = false;
  const ids = t.panels.slice(0, 3).map((p) => p.panelId);
  const result = arrangePanels(t, {
    panelIds: [...ids].reverse(),
    columns: 2,
    gapX: 10,
    gapY: 5,
    unit: 'mm',
    reference: 'selection',
  });
  expect(result.panels.map((p) => p.panelId)).toEqual(
    t.panels.map((p) => p.panelId),
  );
  const frames = result.panels
    .slice(0, 3)
    .map((p) => readFrame(p.frame, result.page, 'mm', 'page'));
  expect(frames[0]).toEqual({ x: 20, y: 10, width: 75, height: 37.5 });
  expect(frames[1]!.x - frames[0]!.x - frames[0]!.width).toBeCloseTo(10);
  expect(frames[2]!.y - frames[0]!.y - frames[0]!.height).toBeCloseTo(5);
  expect(frames[2]!.x).toBe(frames[0]!.x);
  expect(result.panels[3]).toEqual(t.panels[3]);
  result.panels.forEach((p, i) =>
    expect({ ...p, frame: t.panels[i]!.frame }).toEqual(t.panels[i]),
  );
  expect(t).toEqual(original);
  expect(validateFigureTemplate(result).issues).toEqual([]);
});
it.each(['mm', 'cm', 'in', 'px'] as const)(
  '物理单位 %s 在非正方形页面中保持横纵实际间距',
  (unit) => {
    const t = source();
    const perMm = { mm: 1, cm: 0.1, in: 1 / 25.4, px: 96 / 25.4 };
    const result = arrangePanels(t, {
      panelIds: t.panels.map((p) => p.panelId),
      columns: 2,
      gapX: 7.25 * perMm[unit],
      gapY: 3.5 * perMm[unit],
      unit,
      reference: 'page',
    });
    const f = result.panels.map((p) =>
      readFrame(p.frame, t.page, 'mm', 'page'),
    );
    expect(f[1]!.x - f[0]!.width).toBeCloseTo(7.25);
    expect(f[2]!.y - f[0]!.height).toBeCloseTo(3.5);
    expect(f[3]!.x + f[3]!.width).toBeCloseTo(200);
    expect(f[3]!.y + f[3]!.height).toBeCloseTo(100);
  },
);
it('页边距内排列使用该区域的百分比，允许零间距且不产生越界舍入', () => {
  const t = source();
  t.page.margins = { top: 10, right: 20, bottom: 30, left: 40 };
  const result = arrangePanels(t, {
    panelIds: t.panels.map((p) => p.panelId),
    columns: 2,
    gapX: 10,
    gapY: 20,
    unit: '%',
    reference: 'content',
  });
  const f = result.panels.map((p) =>
    readFrame(p.frame, t.page, '%', 'content'),
  );
  expect(f[0]!.x).toBeCloseTo(0);
  expect(f[0]!.width).toBeCloseTo(45);
  expect(f[0]!.height).toBeCloseTo(40);
  expect(f[3]!.x).toBeCloseTo(55);
  expect(f[3]!.y).toBeCloseTo(60);
  expect(
    validateFigureTemplate(
      arrangePanels(t, {
        panelIds: t.panels.map((p) => p.panelId),
        columns: 3,
        gapX: 0,
        gapY: 0,
        unit: '%',
        reference: 'page',
      }),
    ).ok,
  ).toBe(true);
});
it.each([
  { columns: 0 },
  { columns: 1.5 },
  { columns: 5 },
  { gapX: -1 },
  { gapY: Number.NaN },
  { gapX: Infinity },
  { gapX: 100 },
  { gapY: 100 },
  { panelIds: [] },
  { panelIds: ['missing'] },
])('网格参数无效时整体拒绝：%j', (override) => {
  const t = source(),
    before = structuredClone(t);
  expect(() =>
    arrangePanels(t, {
      panelIds: t.panels.map((p) => p.panelId),
      columns: 2,
      gapX: 5,
      gapY: 5,
      unit: '%',
      reference: 'page',
      ...override,
    }),
  ).toThrow();
  expect(t).toEqual(before);
});
it('重复 ID 不重复排布，主动选中的隐藏图层可以排列', () => {
  const t = source();
  t.panels[1]!.visible = false;
  const ids = t.panels.map((p) => p.panelId);
  const result = arrangePanels(t, {
    panelIds: [...ids, ids[0]!],
    columns: 2,
    gapX: 0,
    gapY: 0,
    unit: '%',
    reference: 'page',
  });
  expect(result.panels[1]!.frame.x).toBe(0.5);
  expect(result.panels[1]!.visible).toBe(false);
});
it.each([
  'left',
  'centerX',
  'right',
  'top',
  'centerY',
  'bottom',
  'width',
  'height',
  'size',
] as const)('按基准图层 %s 对齐，只修改选择的对应分量', (action) => {
  const t = source();
  const a = t.panels[0]!,
    b = t.panels[1]!;
  b.frame = { x: 0.4, y: 0.5, width: 0.2, height: 0.15 };
  const r = alignPanels(t, {
    panelIds: [a.panelId, b.panelId],
    anchorPanelId: a.panelId,
    action,
  });
  const f = r.panels[1]!.frame;
  const expected = { ...b.frame };
  if (action === 'left') expected.x = a.frame.x;
  if (action === 'centerX')
    expected.x = a.frame.x + (a.frame.width - b.frame.width) / 2;
  if (action === 'right')
    expected.x = a.frame.x + a.frame.width - b.frame.width;
  if (action === 'top') expected.y = a.frame.y;
  if (action === 'centerY')
    expected.y = a.frame.y + (a.frame.height - b.frame.height) / 2;
  if (action === 'bottom')
    expected.y = a.frame.y + a.frame.height - b.frame.height;
  if (action === 'width' || action === 'size') expected.width = a.frame.width;
  if (action === 'height' || action === 'size')
    expected.height = a.frame.height;
  Object.entries(expected).forEach(([k, v]) =>
    expect(f[k as keyof typeof f]).toBeCloseTo(v),
  );
  expect(r.panels.filter((p) => p.panelId !== b.panelId)).toEqual(
    t.panels.filter((p) => p.panelId !== b.panelId),
  );
  expect(validateFigureTemplate(r).ok).toBe(true);
});
it('对齐导致越界、基准未选中或不足两层时拒绝，原图不变', () => {
  const t = source(),
    before = structuredClone(t),
    ids = t.panels.map((p) => p.panelId);
  t.panels[1]!.frame = { x: 0.01, y: 0.01, width: 0.9, height: 0.9 };
  expect(() =>
    alignPanels(t, { panelIds: ids, anchorPanelId: ids[0]!, action: 'right' }),
  ).toThrow(/超出/);
  expect(() =>
    alignPanels(before, {
      panelIds: ids.slice(1),
      anchorPanelId: ids[0]!,
      action: 'left',
    }),
  ).toThrow();
  expect(() =>
    alignPanels(before, {
      panelIds: [ids[0]!],
      anchorPanelId: ids[0]!,
      action: 'left',
    }),
  ).toThrow();
  expect(t.panels[0]).toEqual(before.panels[0]);
});
it('排列仍用 1.6 保存，重开后图层坐标和 SVG 相同', () => {
  const t = source();
  // 无曲线图层也应能排列、显示固定范围的坐标轴。
  t.panels.forEach((p) => {
    p.plotSlots = [];
    p.axes.forEach((a) => {
      a.range = { mode: 'fixed', min: -1.25, max: 3.5 };
    });
  });
  const arranged = arrangePanels(t, {
    panelIds: t.panels.map((p) => p.panelId),
    columns: 2,
    gapX: 10,
    gapY: 20,
    unit: '%',
    reference: 'selection',
  });
  const saved = serializeWorkspaceProject(arranged, emptyWorkspace());
  const loaded = parseWorkspaceProject(saved);
  expect(loaded.ok).toBe(true);
  if (!loaded.ok) throw new Error('重开失败');
  expect(loaded.template.schemaVersion).toBe('1.22.0');
  expect(loaded.template).toEqual(arranged);
  const data = chartData({ x: [-1, 0, 1], y: [1, 2, 3] });
  const result = renderFigureSvg(arranged, data);
  expect(result.ok).toBe(true);
  expect(renderFigureSvg(loaded.template, data)).toEqual(result);
  expect(renderFigureSvg(t, data)).not.toEqual(result);
});
