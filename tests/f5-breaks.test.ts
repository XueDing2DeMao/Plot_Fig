import { expect, it } from 'vitest';
import { chartTemplate, chartData } from './helpers/chart-fixtures.js';
import { createScale } from '../packages/svg-renderer/src/scales.js';
import { planAxisTicks } from '../packages/svg-renderer/src/tick-plan.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
it('断区开区间不可映射，区段比例与反向共用正逆映射', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  Object.assign(axis, {
    range: { mode: 'fixed', min: 0, max: 100 },
    advanced: {
      breaks: {
        intervals: [{ from: 20, to: 80, gapPercent: 10 }],
        weights: [1, 1],
      },
    },
  });
  const scale = createScale(axis, 0, 100)!;
  expect(scale.map(20)).toBeCloseTo(0.45, 10);
  expect(scale.map(80)).toBeCloseTo(0.55, 10);
  expect(scale.map(50)).toBeNaN();
  expect(scale.numeric!.invert(0.5)).toBeNaN();
  expect(scale.numeric!.invert(scale.map(90))).toBeCloseTo(90, 10);
  axis.reverse = true;
  const reverse = createScale(axis, 0, 100)!;
  expect(reverse.map(90)).toBeCloseTo(1 - scale.map(90), 10);
  expect(
    planAxisTicks(axis, reverse).major.some(
      (t) => t.value > 20 && t.value < 80,
    ),
  ).toBe(false);
});
it('跨断区曲线使用两个独立裁剪区段绘制，导出无非法数值', () => {
  const t = chartTemplate('xy'),
    x = t.panels[0]!.axes[0]!;
  Object.assign(x, {
    range: { mode: 'fixed', min: 0, max: 100 },
    advanced: { breaks: { intervals: [{ from: 20, to: 80 }] } },
  });
  const r = renderFigureSvg(
    t,
    chartData({ x: [0, 10, 50, 90, 100], y: [0, 10, 50, 90, 100] }),
  );
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.svg.match(/data-role="plot-segment"/g)).toHaveLength(2);
    expect(r.svg).not.toMatch(/NaN|Infinity/);
    expect(r.svg).toContain('axis-break');
  }
});
