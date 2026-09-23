import { expect, it } from 'vitest';
import { chartTemplate, chartData } from './helpers/chart-fixtures.js';
import {
  renderFigureSvg,
  validateFixedAxisTicks,
} from '@plot-fig/svg-renderer';
import { createScale } from '../packages/svg-renderer/src/scales.js';
import { preparePanel } from '../packages/svg-renderer/src/panel.js';
import { prepareAxisScale } from '../packages/svg-renderer/src/panel-scales.js';
import { planAxisGridTicks } from '../packages/svg-renderer/src/axis-grid.js';
import { alignYAxisScales } from '../packages/svg-renderer/src/axis-alignment.js';
const symlog = { threshold: 1, linearLength: 1 };
it('SymLog增量主刻度精确保留原始范围端点，正式验证与渲染一致', () => {
  const t = chartTemplate('xy'),
    y = t.panels[0]!.axes[1]!;
  Object.assign(y, {
    scale: 'log2',
    symLog: { threshold: 0.1, linearLength: 0.1 },
    range: { mode: 'fixed', min: -0.2, max: 0.2 },
  });
  y.majorTicks.generation = { mode: 'increment', step: 0.1 };
  y.minorTicks.count = 1;
  const plan = planAxisGridTicks(y, createScale(y, -0.2, 0.2)!);
  expect(plan.major[0]).toEqual({ value: -0.2, ratio: 0 });
  expect(plan.major.at(-1)).toEqual({ value: 0.2, ratio: 1 });
  expect(validateFixedAxisTicks(t)).toEqual([]);
  expect(
    renderFigureSvg(t, chartData({ x: [1, 2, 3], y: [-0.2, 0, 0.2] })).ok,
  ).toBe(true);
});
it('正式Log2坐标映射和主刻度等距，普通Log2过滤非正原行', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    y = p.axes[1]!;
  y.scale = 'log2';
  const scale = createScale(y, 1, 16)!;
  expect(scale.map(2)).toBeCloseTo(0.25, 12);
  expect(planAxisGridTicks(y, scale).major.map((v) => v.value)).toEqual([
    1, 2, 4, 8, 16,
  ]);
  const plots = preparePanel(
    p,
    chartData({ x: [1, 2, 3, 4, 5], y: [-2, 0, 2, 4, 8] }),
    [],
  );
  expect(plots[0]!.segments.flat().map((row) => row.y)).toEqual([2, 4, 8]);
  expect(prepareAxisScale(y, plots)!.min).toBe(2);
});
it('正式SymLog保留负值零值，自动范围、交叉轴和渲染一致', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    y = p.axes[1]!;
  Object.assign(y, {
    scale: 'log10',
    symLog: symlog,
    rescale: { mode: 'auto' },
  });
  p.axes[0]!.placement = { mode: 'cross', axisId: y.axisId, value: 0 };
  const data = chartData({ x: [1, 2, 3], y: [-10, 0, 10] }),
    plots = preparePanel(p, data, []);
  expect(plots[0]!.yValues).toEqual([-10, 0, 10]);
  const scale = prepareAxisScale(y, plots)!;
  expect(scale.min).toBe(-10);
  expect(scale.max).toBe(10);
  expect(scale.map(0)).toBe(0.5);
  const rendered = renderFigureSvg(t, data);
  expect(rendered.ok).toBe(true);
  if (rendered.ok) {
    expect(rendered.svg).toContain('>-10</text>');
    expect(rendered.svg).not.toMatch(/NaN|Infinity/);
  }
});
it('正式对数网格启用真实次刻度和窄区间策略', () => {
  const y = chartTemplate('xy').panels[0]!.axes[1]!;
  Object.assign(y, { scale: 'log10', logTicks: { mode: 'logarithmic' } });
  y.minorTicks = { ...y.minorTicks, visible: false, count: 8 };
  const scale = createScale(y, 1, 1000)!;
  const plan = planAxisGridTicks(y, scale, {
    minor: { visible: true, color: '#aaa', widthPt: 1, dash: 'solid' },
  });
  expect(plan.minor[0]!.value).toBe(2);
  expect(plan.minor[0]!.ratio).toBeCloseTo(Math.log10(2) / 3, 12);
  y.logTicks = { mode: 'origin-log10' };
  const narrow = planAxisGridTicks(y, createScale(y, 2, 8)!);
  expect(narrow.major.map((v) => v.value)).toEqual([2, 4, 6, 8]);
});
it('SymLog双Y轴在变换空间按零点对齐', () => {
  const p = chartTemplate('xy').panels[0]!,
    left = p.axes[1]!;
  Object.assign(left, {
    scale: 'log10',
    symLog: symlog,
    rescale: { mode: 'auto' },
  });
  const right = {
    ...structuredClone(left),
    axisId: 'y-right',
    position: 'right' as const,
  };
  p.axes.push(right);
  p.yAxisAlignment = {
    leftAxisId: left.axisId,
    rightAxisId: right.axisId,
    value: 0,
  };
  const l = createScale(left, -10, 100),
    r = createScale(right, -100, 10);
  expect(l).toBeDefined();
  expect(r).toBeDefined();
  const aligned = alignYAxisScales(
    p,
    new Map([
      [left.axisId, l!],
      [right.axisId, r!],
    ]),
  );
  expect(aligned.ok).toBe(true);
  expect(aligned.scales.get(left.axisId)!.map(0)).toBeCloseTo(
    aligned.scales.get(right.axisId)!.map(0),
    12,
  );
});
it('负数箱线样本在SymLog上可显示，普通对数仍拒绝', () => {
  const t = chartTemplate('box'),
    y = t.panels[0]!.axes[1]!;
  Object.assign(y, { scale: 'log10', symLog: symlog });
  const data = chartData({ values: [-10, -1, 0, 1, 10] });
  expect(renderFigureSvg(t, data).ok).toBe(true);
  delete y.symLog;
  expect(renderFigureSvg(t, data).ok).toBe(false);
});
