import { expect, it } from 'vitest';
import * as statistics from './charts/statistics.js';

it('bins right endpoint once and normalizes by included samples', () => {
  const result = statistics.histogram([0, 1, 2, 9, null], {
    bins: { mode: 'edges', edges: [0, 1, 2] },
    normalization: 'density',
  });
  expect(result.bins.map((b) => b.count)).toEqual([1, 2]);
  expect(
    result.bins.reduce((sum, b) => sum + b.value * (b.high - b.low), 0),
  ).toBeCloseTo(1);
  expect(result.excluded).toBe(1);
  expect(result.skipped).toBe(1);
});
it('handles constant samples and type7 quartiles independently of whisker fences', () => {
  expect(
    statistics.histogram([5, 5], {
      bins: { mode: 'auto' },
      normalization: 'count',
    }).bins,
  ).toEqual([{ low: 4.5, high: 5.5, count: 2, value: 2 }]);
  expect(statistics.boxSummary([1, 2, 3, 4, 100])).toEqual({
    q1: 2,
    median: 3,
    q3: 4,
    low: 1,
    high: 4,
    outliers: [100],
    min: 1,
    max: 100,
  });
  expect(statistics.boxSummary([7])).toMatchObject({
    q1: 7,
    median: 7,
    q3: 7,
    low: 7,
    high: 7,
    outliers: [],
  });
});
