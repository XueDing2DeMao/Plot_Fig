import { expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { createScale, type PlotScale } from './scales.js';
import { planAxisTicks, MAX_AXIS_TICKS } from './tick-plan.js';
import { renderTemplateSvg } from './render.js';

function axisWith(scale: Axis['scale'] = 'linear', reverse = false): Axis {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.scale = scale;
  axis.reverse = reverse;
  return axis;
}

it.each([false, true])(
  'plans automatic linear ticks with original endpoints (reverse: %s)',
  (reverse) => {
    const axis = axisWith('linear', reverse);
    const scale = createScale(axis, -0.1, 0.3)!;
    const plan = planAxisTicks(axis, scale);
    expect(plan.major.map((tick) => tick.value)).toEqual([
      -0.1, 0, 0.1, 0.20000000000000004, 0.3,
    ]);
    expect(plan.major.map((tick) => tick.ratio)).toEqual(
      plan.major.map((tick) => scale.map(tick.value)),
    );
    expect(plan.minor).toEqual([]);
  },
);

it.each(['log10', 'ln'] as const)(
  'plans automatic %s powers and falls back to endpoints for short domains',
  (kind) => {
    const axis = axisWith(kind);
    const inverse =
      kind === 'log10' ? (value: number) => 10 ** value : Math.exp;
    const plan = planAxisTicks(axis, createScale(axis, 1, inverse(3))!);
    expect(plan.major.map((tick) => tick.value)).toEqual(
      [0, 1, 2, 3].map(inverse),
    );
    expect(plan.major.map((tick) => tick.ratio)).toEqual([0, 1 / 3, 2 / 3, 1]);
    const short = planAxisTicks(axis, createScale(axis, 2, 2.1)!);
    expect(short.major.map((tick) => tick.value)).toEqual([2, 2.1]);
  },
);

it.each([false, true])(
  'plans category indices at their band centers (reverse: %s)',
  (reverse) => {
    const axis = axisWith('category', reverse);
    const scale: PlotScale = {
      min: 0,
      max: 3,
      scale: 'category',
      categories: ['A', 'B', 'C'].map((label) => ({ key: label, label })),
      map: (value) => (reverse ? 1 - (value + 0.5) / 3 : (value + 0.5) / 3),
    };
    expect(planAxisTicks(axis, scale).major).toEqual(
      [0, 1, 2].map((value) => ({ value, ratio: scale.map(value) })),
    );
  },
);

it.each([false, true])(
  'keeps legacy logarithmic minor ratios without remapping inverse values (reverse: %s)',
  (reverse) => {
    const axis = axisWith('log10', reverse);
    axis.minorTicks = { ...axis.minorTicks, visible: true, count: 3 };
    const scale = createScale(axis, 1, 1000)!;
    const plan = planAxisTicks(axis, scale);
    const ratios: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const start = scale.map(10 ** index),
        end = scale.map(10 ** (index + 1));
      for (const fraction of [1 / 4, 2 / 4, 3 / 4])
        ratios.push(start + (end - start) * fraction);
    }
    expect(plan.minor.map((tick) => tick.ratio)).toEqual(ratios);
    expect(plan.minor).toHaveLength(9);
    plan.minor.forEach((tick, index) =>
      expect(tick.value).toBeCloseTo(
        10 ** (Math.floor(index / 3) + ((index % 3) + 1) / 4),
        10,
      ),
    );
  },
);

it('keeps minor values finite across an extreme linear domain', () => {
  const axis = axisWith();
  axis.minorTicks = { ...axis.minorTicks, visible: true, count: 1 };
  const plan = planAxisTicks(axis, createScale(axis, -1e308, 1e308)!);
  expect(plan.minor.length).toBeGreaterThan(0);
  expect(
    plan.minor.every(
      (tick) => Number.isFinite(tick.value) && Number.isFinite(tick.ratio),
    ),
  ).toBe(true);
});

it('allows legacy minor counts above the UI limit when the total stays within budget', () => {
  const axis = axisWith();
  axis.minorTicks = { ...axis.minorTicks, visible: true, count: 101 };
  expect(planAxisTicks(axis, createScale(axis, 0, 1)!).minor).toHaveLength(505);
});

it('rejects excessive total ticks before iterating and skips hidden minor ticks', () => {
  const axis = axisWith();
  axis.minorTicks = { ...axis.minorTicks, visible: true, count: 1e12 };
  const scale = createScale(axis, 0, 1)!;
  expect(() => planAxisTicks(axis, scale)).toThrow(/刻度.*10000/);
  axis.minorTicks.visible = false;
  expect(planAxisTicks(axis, scale).minor).toEqual([]);
  const category = axisWith('category');
  const categorical: PlotScale = {
    min: 0,
    max: MAX_AXIS_TICKS + 1,
    scale: 'category',
    map: (value) => value / (MAX_AXIS_TICKS + 1),
    categories: Array.from({ length: MAX_AXIS_TICKS + 1 }, (_, i) => ({
      key: String(i),
      label: String(i),
    })),
  };
  expect(() => planAxisTicks(category, categorical)).toThrow(/刻度.*10000/);
});

it('reports an imported over-budget axis through renderer diagnostics while hidden axes remain harmless', () => {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  panel.plotSlots = [];
  template.dataSlots = [];
  panel.axes.forEach(
    (axis) => (axis.range = { mode: 'fixed', min: 0, max: 1 }),
  );
  const axis = panel.axes[0]!;
  axis.minorTicks = { ...axis.minorTicks, visible: true, count: 2001 };
  const result = renderTemplateSvg(template, chartData({}));
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      severity: 'error',
      message: expect.stringMatching(/刻度.*10000/),
    }),
  );
  axis.visible = false;
  expect(renderTemplateSvg(template, chartData({})).ok).toBe(true);
});
