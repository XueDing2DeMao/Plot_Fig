import { expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { createScale } from './scales.js';
import { renderAxis } from './axis.js';
import { planAxisTicks, type MajorTickGeneration } from './tick-plan.js';

function plan(
  min: number,
  max: number,
  generation: MajorTickGeneration,
  kind: Axis['scale'] = 'linear',
  reverse = false,
) {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.scale = kind;
  axis.reverse = reverse;
  const scale = createScale(axis, min, max)!;
  return planAxisTicks(axis, scale, generation);
}
function values(
  min: number,
  max: number,
  generation: MajorTickGeneration,
  kind: Axis['scale'] = 'linear',
) {
  return plan(min, max, generation, kind).major.map((tick) => tick.value);
}

it('keeps an explicit auto configuration equivalent to omitted configuration', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  const scale = createScale(axis, -0.25, 0.55)!;
  expect(planAxisTicks(axis, scale, { mode: 'auto' })).toEqual(
    planAxisTicks(axis, scale),
  );
});

it.each([
  {
    min: -0.25,
    max: 0.55,
    step: 0.2,
    anchor: 0.1,
    expected: [-0.1, 0.1, 0.3, 0.5],
  },
  { min: -3, max: 3, step: 2, anchor: 1, expected: [-3, -1, 1, 3] },
  { min: 0.1, max: 0.3, step: 0.1, anchor: 0, expected: [0.1, 0.2, 0.3] },
])(
  'places increment ticks on the anchor grid within [$min,$max]',
  ({ min, max, step, anchor, expected }) => {
    const result = values(min, max, { mode: 'increment', step, anchor });
    expect(result).toHaveLength(expected.length);
    result.forEach((value, index) =>
      expect(value).toBeCloseTo(expected[index]!, 12),
    );
  },
);

it('does not add arbitrary range endpoints and permits a domain between grid points', () => {
  expect(values(0.1, 0.9, { mode: 'increment', step: 1 })).toEqual([]);
  expect(values(-0.25, 0.55, { mode: 'increment', step: 0.2 })).toEqual([
    -0.2, 0, 0.2, 0.4,
  ]);
});

it('treats count as a nice target and leaves the domain unchanged', () => {
  const result = plan(-0.25, 0.55, { mode: 'count', count: 5 });
  expect(result.major.map((tick) => tick.value)).toEqual([-0.2, 0, 0.2, 0.4]);
  expect(result.major[0]!.ratio).toBeCloseTo(0.0625, 12);
  const anchored = values(-0.25, 0.55, {
    mode: 'count',
    count: 5,
    anchor: 0.1,
  });
  expect(anchored).toHaveLength(4);
  anchored.forEach((value, index) =>
    expect(value).toBeCloseTo([-0.1, 0.1, 0.3, 0.5][index]!, 12),
  );
});

it.each(['log10', 'ln'] as const)(
  'uses %s transformed increments with a data-space anchor',
  (kind) => {
    const inverse =
      kind === 'log10' ? (value: number) => 10 ** value : Math.exp;
    const result = plan(
      1,
      inverse(3),
      { mode: 'increment', step: 1, anchor: inverse(0.5) },
      kind,
    );
    expect(result.major).toHaveLength(3);
    result.major.forEach((tick, index) => {
      expect(tick.value).toBeCloseTo(inverse(index + 0.5), 10);
      expect(tick.ratio).toBeCloseTo((index + 0.5) / 3, 12);
    });
  },
);

it('plans endpoint mode and mirrors only ratios when reversed', () => {
  expect(values(2, 80, { mode: 'endpoints' }, 'log10')).toEqual([2, 80]);
  expect(values(1, 1000, { mode: 'endpoints' }, 'log10')).toEqual([1, 1000]);
  const generation = { mode: 'increment', step: 2, anchor: 1 } as const;
  const forward = plan(-3, 3, generation),
    reverse = plan(-3, 3, generation, 'linear', true);
  expect(reverse.major.map((tick) => tick.value)).toEqual(
    forward.major.map((tick) => tick.value),
  );
  expect(reverse.major.map((tick) => tick.ratio)).toEqual(
    forward.major.map((tick) => 1 - tick.ratio),
  );
});

it('retains decimal grid precision for tiny steps and large decimal offsets', () => {
  expect(
    values(1e-9, 5e-9, { mode: 'increment', step: 1e-9, anchor: 1e-9 }),
  ).toEqual([1e-9, 2e-9, 3e-9, 4e-9, 5e-9]);
  expect(
    values(100000000000000.1, 100000000000000.5, {
      mode: 'increment',
      step: 0.1,
    }),
  ).toEqual([
    100000000000000.1, 100000000000000.2, 100000000000000.3, 100000000000000.4,
    100000000000000.5,
  ]);
  expect(() =>
    plan(1e16, 1e16 + 8, { mode: 'increment', step: 1, anchor: 1e16 }),
  ).toThrow(/无法生成递增刻度/);
});

it('formats non-auto small and large tick labels without turning nonzero values into zero', () => {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  const rect = { x: 0, y: 0, width: 100, height: 100 };
  const small = renderAxis(axis, rect, createScale(axis, 1e-9, 5e-9)!, {
    mode: 'increment',
    step: 1e-9,
  });
  expect(small).toContain('>1e-9</text>');
  expect(small).toContain('>3e-9</text>');
  expect(small).not.toContain('>0</text>');
  const large = renderAxis(
    axis,
    rect,
    createScale(axis, 100000000000000.1, 100000000000000.5)!,
    { mode: 'increment', step: 0.1 },
  );
  expect(large).toContain('>100000000000000.1</text>');
  expect(large).toContain('>100000000000000.2</text>');
});

it.each([
  { mode: 'increment', step: 0 },
  { mode: 'increment', step: -1 },
  { mode: 'increment', step: Infinity },
  { mode: 'increment', step: NaN },
  { mode: 'count', count: -5 },
  { mode: 'count', count: 1 },
  { mode: 'count', count: 2.5 },
  { mode: 'count', count: 1001 },
  { mode: 'count', count: Infinity },
] as MajorTickGeneration[])(
  'rejects invalid generation $mode parameters without coercion',
  (generation) => {
    expect(() => plan(0, 10, generation)).toThrow(/刻度/);
  },
);

it.each([0, -1, Infinity, NaN])(
  'rejects a nonpositive or nonfinite logarithmic anchor %s',
  (anchor) => {
    expect(() =>
      plan(1, 100, { mode: 'increment', step: 1, anchor }, 'log10'),
    ).toThrow(/锚点/);
  },
);

it('rejects unsafe grid indices, impossible tiny steps, and excessive major/minor totals promptly', () => {
  expect(() => plan(1e16, 1e16 + 100, { mode: 'increment', step: 1 })).toThrow(
    /刻度/,
  );
  expect(() =>
    plan(0, 1, { mode: 'increment', step: Number.MIN_VALUE }),
  ).toThrow(/刻度/);
  expect(() =>
    plan(Number.MIN_VALUE, Number.MIN_VALUE * 2, {
      mode: 'count',
      count: 1000,
    }),
  ).toThrow(/刻度/);
  expect(() => plan(0, 1, { mode: 'increment', step: 1 / 20000 })).toThrow(
    /刻度.*10000/,
  );
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.minorTicks = { ...axis.minorTicks, visible: true, count: 1000 };
  expect(() =>
    planAxisTicks(axis, createScale(axis, 0, 1)!, {
      mode: 'increment',
      step: 0.1,
    }),
  ).toThrow(/刻度.*10000/);
});
