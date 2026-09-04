import { describe, expect, it } from 'vitest';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { createScale, generateMajorTicks } from './scales.js';

type AxisLike = Pick<
  FigureTemplate['panels'][number]['axes'][number],
  'scale' | 'reverse'
>;

function axisWith(
  scale: AxisLike['scale'],
  reverse = false,
): AxisLike {
  return { scale, reverse };
}

describe('plot scales', () => {
  it('maps linear, log10 and ln scales deterministically', () => {
    expect(createScale(axisWith('linear'), 1, 100)?.map(10)).toBeCloseTo(
      9 / 99,
    );
    expect(createScale(axisWith('log10'), 1, 100)?.map(10)).toBeCloseTo(0.5);
    expect(
      createScale(axisWith('ln'), 1, Math.E ** 2)?.map(Math.E),
    ).toBeCloseTo(0.5);
  });

  it('honors reverse axes', () => {
    expect(createScale(axisWith('linear', true), 0, 10)?.map(0)).toBe(1);
  });

  it('rejects invalid logarithmic ranges', () => {
    expect(createScale(axisWith('log10'), -1, 10)).toBeUndefined();
    expect(createScale(axisWith('ln'), 0, 10)).toBeUndefined();
  });

  it('returns stable major ticks for the same range', () => {
    const first = generateMajorTicks(0, 10, 5);
    expect(generateMajorTicks(0, 10, 5)).toEqual(first);
    expect(first.length).toBeGreaterThan(1);
    expect(first[0]).toBe(0);
    expect(first.at(-1)).toBe(10);
  });
});
