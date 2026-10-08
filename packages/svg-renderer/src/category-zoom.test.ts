// @vitest-environment jsdom
import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg, figureCoordinates } from './index.js';

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])(
  '分类窗口仅显示相应刻度，柱宽按窗口放大且数据不变：横向 %s，反向 %s',
  (horizontal, reverse) => {
    const t = chartTemplate('bar');
    const panel = t.panels[0]!;
    const plot = panel.plotSlots[0]!;
    if (plot.kind !== 'bar') throw new Error('Expected a bar chart');
    plot.orientation = horizontal ? 'horizontal' : 'vertical';
    panel.axes[0]!.scale = horizontal ? 'linear' : 'category';
    panel.axes[1]!.scale = horizontal ? 'category' : 'linear';
    const data = chartData({
      category: ['A', 'B', 'C', 'D', 'E', 'F'],
      value: [1, 2, 3, 4, 5, 6],
    });
    const axis = panel.axes[horizontal ? 1 : 0]!;
    axis.reverse = reverse;
    const before = renderFigureSvg(t, data);
    expect(before.ok).toBe(true);
    axis.range = { mode: 'fixed', min: 2, max: 4 };
    const copy = structuredClone(data);
    const result = renderFigureSvg(t, data);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok || !before.ok) return;
    const parse = (svg: string) =>
      new DOMParser().parseFromString(svg, 'image/svg+xml');
    const dom = parse(result.svg);
    const labels = [
      ...dom.querySelectorAll(
        `[data-axis-id="${axis.axisId}"] [data-role="tick-label"]`,
      ),
    ].map((n) => n.textContent);
    expect(labels).toEqual(['C', 'D']);
    const bars = dom.querySelectorAll('[data-role="bar"]');
    expect(bars).toHaveLength(6);
    const extent = horizontal ? 'height' : 'width';
    expect(Number(bars[2]!.getAttribute(extent))).toBeCloseTo(
      Number(
        parse(before.svg)
          .querySelector('[data-role="bar"]')!
          .getAttribute(extent),
      ) * 3,
      2,
    );
    expect(data).toEqual(copy);
    const scale = figureCoordinates(t, data)
      .panels.get(t.panels[0]!.panelId)!
      .scales.get(axis.axisId)!;
    expect(scale.map(2)).toBeCloseTo(reverse ? 0.75 : 0.25);
  },
);

it('分类窗口保留高级索引标签和表格的原始类别序号', () => {
  const t = chartTemplate('bar');
  const axis = t.panels[0]!.axes[0]!;
  axis.range = { mode: 'fixed', min: 2, max: 4 };
  axis.advanced = {
    labels: { source: 'index' },
    labelTable: { rows: [{ source: 'index' }] },
  };
  const r = renderFigureSvg(
    t,
    chartData({ category: ['A', 'B', 'C', 'D', 'E'], value: [1, 2, 3, 4, 5] }),
  );
  expect(r.ok, JSON.stringify(r.diagnostics)).toBe(true);
  if (!r.ok) return;
  const dom = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
  for (const role of ['tick-label', 'axis-label-table'])
    expect(
      [
        ...dom.querySelectorAll(
          `[data-axis-id="${axis.axisId}"] [data-role="${role}"]`,
        ),
      ].map((e) => e.textContent),
    ).toEqual(['3', '4']);
});
