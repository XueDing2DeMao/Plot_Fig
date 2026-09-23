import { expect, it } from 'vitest';
import { xyLinePath } from './xy-line-path.js';

const sample = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 2, y: 0 },
];
it('keeps the existing straight path and input order including repeated X', () => {
  const points = [
    { x: 2, y: -1 },
    { x: 0, y: 2 },
    { x: 0, y: 3 },
  ];
  const before = structuredClone(points);
  expect(xyLinePath(points, 'straight')).toBe('M2 -1 L0 2 L0 3');
  expect(points).toEqual(before);
});
it('constructs horizontal-first and vertical-first steps through every sample', () => {
  expect(xyLinePath(sample, 'step-h')).toBe('M0 0 H1 V1 H2 V0');
  expect(xyLinePath(sample, 'step-v')).toBe('M0 0 V1 H1 V0 H2');
});
it.each(['straight', 'step-h', 'step-v', 'spline'] as const)(
  'handles zero and one point for %s',
  (mode) => {
    expect(xyLinePath([], mode)).toBe('');
    expect(xyLinePath([{ x: -0.25, y: 1.5 }], mode)).toBe('M-0.25 1.5');
  },
);
it('reduces a two-point natural spline to a straight line', () => {
  expect(xyLinePath(sample.slice(0, 2), 'spline')).toBe('M0 0 L1 1');
});
it('matches the analytic natural cubic spline for a three-point arch', () => {
  expect(xyLinePath(sample, 'spline')).toBe(
    'M0 0 C0.333333 0.5 0.666667 1 1 1 C1.333333 1 1.666667 0.5 2 0',
  );
});
it('preserves the spline when axes are mirrored or physical scale changes', () => {
  const path = xyLinePath(
    sample.map((p) => ({ x: 20 - 3 * p.x, y: -2 + 4 * p.y })),
    'spline',
  );
  expect(path).toBe('M20 -2 C19 0 18 2 17 2 C16 2 15 0 14 -2');
});
it.each([
  {
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 2 },
    ],
  },
  {
    points: [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
    ],
  },
])(
  'rejects a spline with duplicate or nonmonotonic X without sorting',
  ({ points }) => {
    expect(() => xyLinePath(points, 'spline')).toThrow('样条');
  },
);
it('has continuous first and second derivatives on unequal intervals and natural endpoints', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: 3, y: 1 },
    { x: 6, y: 3 },
  ];
  const path = xyLinePath(points, 'spline');
  const segments = [...path.matchAll(/C([^C]+)/g)].map((match) =>
    match[1]!.trim().split(/\s+/).map(Number),
  );
  expect(segments).toHaveLength(3);
  const ends = segments.map((v, i) => {
    const h = points[i + 1]!.x - points[i]!.x;
    expect(v.slice(4)).toEqual([points[i + 1]!.x, points[i + 1]!.y]);
    return {
      firstStart: (3 * (v[1]! - points[i]!.y)) / h,
      firstEnd: (3 * (v[5]! - v[3]!)) / h,
      secondStart: (6 * (points[i]!.y - 2 * v[1]! + v[3]!)) / h ** 2,
      secondEnd: (6 * (v[5]! - 2 * v[3]! + v[1]!)) / h ** 2,
    };
  });
  expect(ends[0]!.secondStart).toBeCloseTo(0, 4);
  expect(ends.at(-1)!.secondEnd).toBeCloseTo(0, 4);
  for (let i = 1; i < ends.length; i++) {
    expect(ends[i]!.firstStart).toBeCloseTo(ends[i - 1]!.firstEnd, 4);
    expect(ends[i]!.secondStart).toBeCloseTo(ends[i - 1]!.secondEnd, 4);
  }
});
it('rejects nonfinite coordinates and overflowing spline arithmetic', () => {
  expect(() => xyLinePath([{ x: NaN, y: 0 }], 'straight')).toThrow();
  expect(() =>
    xyLinePath(
      [
        { x: -1e308, y: 0 },
        { x: 0, y: 1e308 },
        { x: 1e308, y: 0 },
      ],
      'spline',
    ),
  ).toThrow();
});
it('has bounded work and handles the supported large sample size without spreading arrays', () => {
  const points = Array.from({ length: 100_000 }, (_, i) => ({
    x: i,
    y: i % 7,
  }));
  const path = xyLinePath(points, 'spline');
  expect(path.match(/C/g)).toHaveLength(points.length - 1);
  expect(path).not.toMatch(/NaN|Infinity/);
  expect(() => xyLinePath([...points, { x: 100_000, y: 0 }], 'spline')).toThrow(
    '100000',
  );
});
