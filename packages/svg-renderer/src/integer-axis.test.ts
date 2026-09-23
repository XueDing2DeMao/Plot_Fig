import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { createScale } from './scales.js';
import { planAxisTicks } from './tick-plan.js';
import { rescaleFigureRanges } from './axis-rescale-events.js';
import { preparePanel } from './panel.js';
import { prepareAxisScale } from './panel-scales.js';

it.each(['initialize', 'fit'] as const)(
  '自动重缩放 %s 保存整数范围，避免窄范围失去全部刻度',
  (reason) => {
    const before = chartTemplate('xy');
    const candidate = structuredClone(before);
    const axis = candidate.panels[0]!.axes[0]!;
    axis.tickLabels = { ...axis.tickLabels, notation: 'fixed', precision: 0 };
    axis.rescale = { mode: 'auto' };
    const data = chartData({ x: [0.2, 0.4], y: [1, 2] });
    const result = rescaleFigureRanges({
      before,
      candidate,
      beforeData: data,
      data,
      reason,
    });
    const panel = result.template.panels[0]!;
    const updated = panel.axes[0]!;
    expect(result.diagnostics).toEqual([]);
    expect(updated.range).toEqual({ mode: 'fixed', min: 0, max: 1 });
    const scale = prepareAxisScale(
      updated,
      preparePanel(panel, data, []),
      data,
    )!;
    expect(
      planAxisTicks(updated, scale).major.map((tick) => tick.value),
    ).toEqual([0, 1]);
  },
);

it('高级索引标签保留原有小数位置', () => {
  const panel = chartTemplate('xy').panels[0]!;
  const axis = panel.axes[0]!;
  axis.tickLabels = { ...axis.tickLabels, notation: 'fixed', precision: 0 };
  axis.advanced = { labels: { source: 'index' } };
  const data = chartData({ x: [0.2, 0.4], y: [1, 2] });
  const scale = prepareAxisScale(axis, preparePanel(panel, data, []), data)!;
  expect(planAxisTicks(axis, scale).major.map((tick) => tick.label)).toEqual([
    '1',
    '2',
    '3',
    '4',
    '5',
  ]);
});

it.each([
  [0, 1],
  [-3, 2],
  [0, 1000001],
  [1e20, 1e20 + 16384],
  [1e20 + 2 * 16384, 1e20 + 3 * 16384],
])('整数格式的自动刻度对应真实整数格点 [%s, %s]', (min, max) => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.tickLabels.notation = 'fixed';
  axis.tickLabels.precision = 0;
  const scale = createScale(axis, min, max)!;
  const values = planAxisTicks(axis, scale).major;
  expect(values.length).toBeGreaterThanOrEqual(2);
  expect(values.length).toBeLessThanOrEqual(10);
  expect(new Set(values.map((tick) => tick.value)).size).toBe(values.length);
  for (const tick of values) {
    expect(Number.isInteger(tick.value)).toBe(true);
    expect(tick.value).toBeGreaterThanOrEqual(min);
    expect(tick.value).toBeLessThanOrEqual(max);
    expect(tick.ratio).toBe(scale.map(tick.value));
  }
});
