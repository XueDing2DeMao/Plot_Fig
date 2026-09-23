import { expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { createScale } from './scales.js';
import { planAxisTicks, type MajorTickGeneration } from './tick-plan.js';
import { renderAxis } from './axis.js';

function axisWith(
  kind: Axis['scale'] = 'linear',
  count = 0,
  reverse = false,
): Axis {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.scale = kind;
  axis.reverse = reverse;
  axis.minorTicks = { ...axis.minorTicks, visible: count > 0, count };
  return axis;
}

it.each([
  { kind: 'log10', anchor: 0.2, min: 0.02, max: 2 },
  { kind: 'ln', anchor: 3, min: 1, max: 10 },
] as const)(
  'retains the exact $kind data anchor in planned values and SVG labels',
  ({ kind, anchor, min, max }) => {
    const axis = axisWith(kind);
    const scale = createScale(axis, min, max)!;
    for (const generation of [
      { mode: 'increment', step: 1, anchor },
      { mode: 'count', count: 5, anchor },
    ] satisfies MajorTickGeneration[]) {
      const plan = planAxisTicks(axis, scale, generation);
      expect(plan.major.some((tick) => Object.is(tick.value, anchor))).toBe(
        true,
      );
      expect(
        renderAxis(
          axis,
          { x: 0, y: 0, width: 100, height: 100 },
          scale,
          generation,
        ),
      ).toContain(`>${anchor}</text>`);
    }
  },
);

it('preserves an in-range anchor before boundary snapping and omits an out-of-range anchor', () => {
  const axis = axisWith('log10');
  const anchor = 0.2;
  const generation = { mode: 'increment', step: 1, anchor } as const;
  const within = createScale(axis, anchor - Number.EPSILON * anchor, 2)!;
  expect(planAxisTicks(axis, within, generation).major[0]!.value).toBe(anchor);
  const outside = createScale(axis, anchor + Number.EPSILON * anchor, 2)!;
  expect(
    planAxisTicks(axis, outside, generation).major.map((tick) => tick.value),
  ).toEqual([2]);
});

it.each([false, true])(
  'rejects a non-auto minor that collapses onto a major endpoint (reverse: %s)',
  (reverse) => {
    const axis = axisWith('linear', 1, reverse);
    const scale = createScale(axis, 1, 1 + Number.EPSILON)!;
    expect(() => planAxisTicks(axis, scale, { mode: 'endpoints' })).toThrow(
      /次刻度.*浮点精度/,
    );
  },
);

it('rejects duplicate interior minor values even when they lie between both major endpoints', () => {
  const axis = axisWith('linear', 4);
  const scale = createScale(axis, 1, 1 + Number.EPSILON * 4)!;
  expect(() => planAxisTicks(axis, scale, { mode: 'endpoints' })).toThrow(
    /次刻度.*浮点精度/,
  );
});

it.each(['log10', 'ln'] as const)(
  'rejects %s minors that round below their major interval near the largest finite number',
  (kind) => {
    const axis = axisWith(kind, 1);
    const scale = createScale(
      axis,
      Number.MAX_VALUE * (1 - 1e-13),
      Number.MAX_VALUE,
    )!;
    expect(scale).toBeDefined();
    expect(() => planAxisTicks(axis, scale, { mode: 'endpoints' })).toThrow(
      /次刻度.*浮点精度/,
    );
  },
);

it('preserves the legacy automatic minor value and ratio even when the value is not independently representable', () => {
  const axis = axisWith('linear', 1);
  const scale = createScale(axis, 1, 1 + Number.EPSILON)!;
  expect(planAxisTicks(axis, scale).minor).toEqual([{ value: 1, ratio: 0.5 }]);
  expect(planAxisTicks(axis, scale, { mode: 'auto' })).toEqual(
    planAxisTicks(axis, scale),
  );
});
