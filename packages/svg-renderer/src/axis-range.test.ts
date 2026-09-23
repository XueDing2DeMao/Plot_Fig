import { describe, expect, it } from 'vitest';
import { resolveAxisRange, type AxisRangeOptions } from './axis-range.js';

describe('resolveAxisRange', () => {
  it('uses finite numeric extents without changing the input', () => {
    const values = Object.freeze([2.5, NaN, -0.25, Infinity, 0.55, -Infinity]);
    expect(resolveAxisRange({ scale: 'linear', values })).toEqual({
      min: -0.25,
      max: 2.5,
    });
    expect(values).toEqual([2.5, NaN, -0.25, Infinity, 0.55, -Infinity]);
  });

  it('uses independent percentages of the original visible linear span', () => {
    expect(
      resolveAxisRange({
        scale: 'linear',
        values: [-0.25, 0.55],
        padding: { minPercent: 25, maxPercent: 50 },
      }),
    ).toEqual({ min: -0.45, max: 0.9500000000000001 });
  });

  it('optionally aligns padded automatic linear ranges to a nice tick grid', () => {
    expect(
      resolveAxisRange({
        scale: 'linear',
        values: [0.1, 0.3],
        padding: { minPercent: 8, maxPercent: 8 },
        nice: true,
      }),
    ).toEqual({ min: 0.05, max: 0.35 });
    expect(
      resolveAxisRange({
        scale: 'linear',
        values: [0.1, 0.3],
        min: 0.1,
        padding: { minPercent: 8, maxPercent: 8 },
        nice: true,
      }),
    ).toEqual({ min: 0.1, max: 0.35 });
  });

  it('does not mutate frozen options or padding', () => {
    const options = Object.freeze({
      scale: 'linear' as const,
      values: Object.freeze([10, 20]),
      padding: Object.freeze({ minPercent: 10 }),
    });
    expect(resolveAxisRange(options)).toEqual({ min: 9, max: 20 });
  });

  it.each([
    [0, -0.5, 0.5],
    [-0.1, -0.6, 0.4],
    [100, 99, 101],
    [-100, -101, -99],
    [1e308, 1e308 - 1e306, 1e308 + 1e306],
    [Number.MIN_VALUE, Number.MIN_VALUE - 0.5, Number.MIN_VALUE + 0.5],
  ])(
    'preserves the legacy constant linear expansion for %s',
    (value, min, max) => {
      expect(resolveAxisRange({ scale: 'linear', values: [value!] })).toEqual({
        min,
        max,
      });
    },
  );

  it('adds padding after constant expansion', () => {
    expect(
      resolveAxisRange({
        scale: 'linear',
        values: [0],
        padding: { minPercent: 10, maxPercent: 20 },
      }),
    ).toEqual({ min: -0.6, max: 0.7 });
  });

  it.each([
    [{ min: -10 }, { min: -10, max: 22 }],
    [{ max: 30 }, { min: -6, max: 30 }],
  ])('pads only the free end with fixed bounds %j', (bounds, expected) => {
    expect(
      resolveAxisRange({
        scale: 'linear',
        values: [0, 10],
        ...bounds,
        padding: { minPercent: 20, maxPercent: 60 },
      }),
    ).toEqual(expected);
  });

  it('keeps both fixed ends exact and ignores valid padding for them', () => {
    const result = resolveAxisRange({
      scale: 'linear',
      values: [-50, 100],
      min: -0,
      max: 0.3,
      padding: { minPercent: 100, maxPercent: 100 },
    });
    expect(Object.is(result!.min, -0)).toBe(true);
    expect(result!.max).toBe(0.3);
  });

  it.each([
    [{ min: 5 }, { min: 5, max: 5.5 }],
    [{ max: 5 }, { min: 4.5, max: 5 }],
    [{ min: 4 }, { min: 4, max: 5 }],
    [{ max: 6 }, { min: 5, max: 6 }],
  ])(
    'expands only an equal free end for a constant and %j',
    (bounds, expected) => {
      expect(
        resolveAxisRange({ scale: 'linear', values: [5], ...bounds }),
      ).toEqual(expected);
    },
  );

  it.each([
    [{ min: 10 }, { min: 10, max: 10.5 }],
    [{ max: 1 }, { min: 0.5, max: 1 }],
  ])(
    'expands a free end equal to a locked data endpoint %j',
    (bounds, expected) => {
      expect(
        resolveAxisRange({ scale: 'linear', values: [1, 10], ...bounds }),
      ).toEqual(expected);
    },
  );

  it.each([{ min: 11 }, { max: 0 }])(
    'rejects a locked end that crosses all data %j',
    (bounds) => {
      expect(() =>
        resolveAxisRange({ scale: 'linear', values: [1, 10], ...bounds }),
      ).toThrow(/minimum.*maximum|反序|最小值/);
    },
  );

  it('rejects a bound beyond the raw constant instead of silently using an expanded extent', () => {
    expect(() =>
      resolveAxisRange({ scale: 'linear', values: [5], min: 5.1 }),
    ).toThrow(/minimum.*maximum|反序|最小值/);
  });

  it.each(['linear', 'log10', 'ln'] as const)(
    '%s returns undefined without valid data unless both bounds are fixed',
    (scale) => {
      const values = scale === 'linear' ? [NaN, Infinity] : [NaN, -1, 0];
      expect(resolveAxisRange({ scale, values })).toBeUndefined();
      expect(resolveAxisRange({ scale, values, min: 1 })).toBeUndefined();
      expect(resolveAxisRange({ scale, values, max: 10 })).toBeUndefined();
      expect(resolveAxisRange({ scale, values, min: 1, max: 10 })).toEqual({
        min: 1,
        max: 10,
      });
    },
  );

  it.each(['log10', 'ln'] as const)(
    '%s filters nonpositive samples',
    (scale) => {
      expect(
        resolveAxisRange({ scale, values: [-10, -0, 0, 0.01, 1, NaN] }),
      ).toEqual({
        min: 0.01,
        max: 1,
      });
    },
  );

  it.each(['log10', 'ln'] as const)(
    '%s uses legacy constant expansion',
    (scale) => {
      expect(resolveAxisRange({ scale, values: [0.1] })).toEqual({
        min: 0.05,
        max: 0.2,
      });
      expect(resolveAxisRange({ scale, values: [2], min: 2 })).toEqual({
        min: 2,
        max: 4,
      });
      expect(resolveAxisRange({ scale, values: [2], max: 2 })).toEqual({
        min: 1,
        max: 2,
      });
    },
  );

  it.each(['log10', 'ln'] as const)(
    '%s applies padding in transformed space',
    (scale) => {
      const result = resolveAxisRange({
        scale,
        values: [1, 100],
        padding: { minPercent: 50, maxPercent: 100 },
      })!;
      expect(result.min).toBeCloseTo(0.1, 13);
      expect(result.max).toBeCloseTo(10000, 8);
    },
  );

  it.each(['log10', 'ln'] as const)(
    '%s never round-trips locked or zero-padding endpoints',
    (scale) => {
      const min = 0.3;
      const max = 123.456;
      expect(
        resolveAxisRange({
          scale,
          values: [min, max],
          padding: { minPercent: 0, maxPercent: 0 },
        }),
      ).toEqual({ min, max });
      const lowerLocked = resolveAxisRange({
        scale,
        values: [1, max],
        min,
        padding: { minPercent: 100, maxPercent: 5 },
      })!;
      expect(lowerLocked.min).toBe(min);
      expect(lowerLocked.max).toBeGreaterThan(max);
      const upperLocked = resolveAxisRange({
        scale,
        values: [min, 100],
        max,
        padding: { minPercent: 5, maxPercent: 100 },
      })!;
      expect(upperLocked.max).toBe(max);
      expect(upperLocked.min).toBeLessThan(min);
    },
  );

  it('handles a finite linear range whose subtraction would overflow', () => {
    const result = resolveAxisRange({
      scale: 'linear',
      values: [-1e308, 1e308],
      padding: { minPercent: 10, maxPercent: 20 },
    })!;
    expect(result.min / 1e308).toBeCloseTo(-1.2, 14);
    expect(result.max / 1e308).toBeCloseTo(1.4, 14);
  });

  it.each([
    {
      values: [0, 1e308],
      padding: { minPercent: Number.MIN_VALUE },
      lower: true,
    },
    {
      values: [-1e308, 0],
      padding: { maxPercent: Number.MIN_VALUE },
      lower: false,
    },
  ])(
    'preserves a representable padding from a subnormal percentage %j',
    ({ values, padding, lower }) => {
      const result = resolveAxisRange({ scale: 'linear', values, padding })!;
      const distance = (1e308 / 100) * Number.MIN_VALUE;
      expect(distance).toBeGreaterThan(0);
      expect(lower ? result.min : result.max).toBe(
        lower ? -distance : distance,
      );
      expect(lower ? result.max : result.min).toBe(lower ? 1e308 : -1e308);
    },
  );

  it('calculates symmetric percentages when the signed span and unscaled products overflow', () => {
    const result = resolveAxisRange({
      scale: 'linear',
      values: [-1e308, 1e308],
      padding: { minPercent: 20, maxPercent: 20 },
    })!;
    expect(result.min / 1e308).toBeCloseTo(-1.4, 14);
    expect(result.max / 1e308).toBeCloseTo(1.4, 14);
    expect(result.min).toBe(-result.max);
  });

  it.each([
    { scale: 'log10', values: [0.3, 123.456], padding: { minPercent: 1e-20 } },
    { scale: 'ln', values: [0.3, 123.456], padding: { minPercent: 1e-20 } },
    { scale: 'log10', values: [0.3, 123.45], padding: { maxPercent: 1e-20 } },
    { scale: 'ln', values: [0.3, 100], padding: { maxPercent: 1e-20 } },
  ] satisfies AxisRangeOptions[])(
    'rejects logarithmic padding lost before inversion instead of accepting round-trip error %j',
    (options) => {
      expect(() => resolveAxisRange(options)).toThrow(/cannot be represented/);
    },
  );

  it('preserves valid subnormal extents when no padding is requested', () => {
    const min = Number.MIN_VALUE;
    const max = min * 2;
    for (const scale of ['linear', 'log10', 'ln'] as const) {
      expect(resolveAxisRange({ scale, values: [min, max] })).toEqual({
        min,
        max,
      });
    }
  });

  it.each(['linear', 'log10', 'ln'] as const)(
    '%s does not expand or pad a fixed extreme endpoint',
    (scale) => {
      const value = Number.MAX_VALUE;
      const result = resolveAxisRange({
        scale,
        values: [value],
        max: value,
        padding: { maxPercent: 100 },
      })!;
      expect(result.max).toBe(value);
      expect(result.min).toBe(
        scale === 'linear' ? value - value * 0.01 : value / 2,
      );
    },
  );

  it.each(['log10', 'ln'] as const)(
    '%s preserves a fixed smallest positive endpoint when expanding the free end',
    (scale) => {
      expect(
        resolveAxisRange({
          scale,
          values: [Number.MIN_VALUE],
          min: Number.MIN_VALUE,
          padding: { minPercent: 100 },
        }),
      ).toEqual({ min: Number.MIN_VALUE, max: Number.MIN_VALUE * 2 });
    },
  );

  it.each([
    { scale: 'linear', values: [-1e308, 1e308], padding: { maxPercent: 100 } },
    { scale: 'linear', values: [Number.MAX_VALUE] },
    { scale: 'log10', values: [1, 1e308], padding: { maxPercent: 100 } },
    { scale: 'ln', values: [1, 1e308], padding: { maxPercent: 100 } },
    {
      scale: 'log10',
      values: [Number.MIN_VALUE, 1],
      padding: { minPercent: 100 },
    },
    {
      scale: 'ln',
      values: [Number.MIN_VALUE, 1],
      padding: { minPercent: 100 },
    },
    { scale: 'log10', values: [Number.MIN_VALUE] },
    { scale: 'ln', values: [Number.MAX_VALUE] },
    { scale: 'log10', values: [1e308, 1e308 + 2e292] },
    { scale: 'ln', values: [1e308, 1e308 + 2e292] },
    {
      scale: 'linear',
      values: [Number.MIN_VALUE, Number.MIN_VALUE * 2],
      padding: { maxPercent: 1 },
    },
  ] satisfies AxisRangeOptions[])(
    'rejects overflow, underflow, or collapsed transformed range %j',
    (options) => {
      expect(() => resolveAxisRange(options)).toThrow(
        /finite|positive|represent|collapse|overflow|下溢|溢出|有效/,
      );
    },
  );

  it.each([
    { min: NaN },
    { max: Infinity },
    { min: -Infinity },
    { min: 10, max: 1 },
    { min: 1, max: 1 },
    { padding: { minPercent: -1 } },
    { padding: { maxPercent: 101 } },
    { padding: { minPercent: NaN } },
    { padding: { maxPercent: Infinity } },
  ])('rejects invalid explicit options even without data %j', (options) => {
    expect(() =>
      resolveAxisRange({ scale: 'linear', values: [], ...options }),
    ).toThrow();
  });

  it.each(['log10', 'ln'] as const)(
    '%s rejects nonpositive fixed endpoints even without data',
    (scale) => {
      expect(() => resolveAxisRange({ scale, values: [], min: 0 })).toThrow(
        /positive|正/,
      );
      expect(() => resolveAxisRange({ scale, values: [], max: -1 })).toThrow(
        /positive|正/,
      );
    },
  );
});
