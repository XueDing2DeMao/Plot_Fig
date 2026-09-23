import { expect, it } from 'vitest';
import { chartTemplate, chartData } from './helpers/chart-fixtures.js';
import { createScale } from '../packages/svg-renderer/src/scales.js';
import { planAxisTicks } from '../packages/svg-renderer/src/tick-plan.js';
it('UTC日历月主刻度跨闰年，日期标签不依赖主机时区', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  Object.assign(axis, {
    advanced: {
      calendar: { unit: 'month', step: 1 },
      labels: { source: 'date', format: 'yyyy-MM-dd', timeZone: 'UTC' },
    },
  });
  const min = Date.UTC(2024, 0, 1),
    max = Date.UTC(2024, 3, 1),
    scale = createScale(axis, min, max)!;
  const plan = planAxisTicks(axis, scale);
  expect(plan.major.map((t) => t.value)).toEqual([
    min,
    Date.UTC(2024, 1, 1),
    Date.UTC(2024, 2, 1),
    max,
  ]);
  expect(
    plan.major
      .slice(1)
      .map((t, i) => (t.value - plan.major[i]!.value) / 86400000),
  ).toEqual([31, 29, 31]);
  expect(plan.major.map((t) => (t as any).label)).toEqual([
    '2024-01-01',
    '2024-02-01',
    '2024-03-01',
    '2024-04-01',
  ]);
});
it('自定义主次刻度排序去重、特殊端点标签并映射真实坐标', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[1]!;
  Object.assign(axis, {
    scale: 'log2',
    advanced: {
      ticks: {
        major: { mode: 'values', values: [8, 1, 2, 2, 16] },
        minor: { mode: 'values', values: [3, 2, 6] },
      },
      specialTicks: [{ at: 'max', label: '上界' }],
    },
  });
  const plan = planAxisTicks(axis, createScale(axis, 1, 8)!);
  expect(plan.major.map((t) => t.value)).toEqual([1, 2, 8]);
  expect((plan.major[2] as any).label).toBe('上界');
  expect(plan.minor.map((t) => t.value)).toEqual([3, 6]);
  expect(plan.minor[0]!.ratio).toBeCloseTo(Math.log2(3) / 3, 10);
});
it('列刻度和按值标签使用同一数据绑定，不靠字符串拼接', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!,
    data = chartData({ x: [1, 3, 9], y: [11, 33, 99] });
  Object.assign(axis, {
    advanced: {
      ticks: { major: { mode: 'column', dataSlotId: 'slot-x' } },
      labels: {
        source: 'column',
        dataSlotId: 'slot-y',
        positionSlotId: 'slot-x',
        match: 'value',
      },
    },
  });
  const scale = { ...createScale(axis, 1, 9)!, data };
  expect(planAxisTicks(axis, scale).major.map((t) => (t as any).label)).toEqual(
    ['11', '33', '99'],
  );
});
