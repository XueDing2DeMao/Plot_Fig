import { expect, it } from 'vitest';
import { xyLinePath } from './xy-line-path.js';
import {
  lineMetrics,
  visibleLinePieces,
  pointAtLength,
} from './xy-line-metrics.js';
import {
  renderLineExtras,
  renderDropLines,
  validateLineExtras,
} from './xy-line-extras.js';
import { createScale } from './scales.js';

const points = [
  { x: 0, y: 0 },
  { x: 50, y: 100 },
  { x: 100, y: 20 },
];
const line = {
  visible: true,
  color: '#128080',
  widthPt: 1,
  dash: 'solid' as const,
};
const marker = {
  visible: true,
  shape: 'circle' as const,
  sizePt: 8,
  fill: 'none',
  stroke: '#333333',
  strokeWidthPt: 1,
};
it.each(['straight', 'step-h', 'step-v', 'spline'] as const)(
  'keeps the old %s path without extras and closes with a straight edge',
  (connection) => {
    expect(lineMetrics(points, connection, false).d).toBe(
      xyLinePath(points, connection),
    );
    const closed = lineMetrics(points, connection, true);
    expect(closed.d).toBe(xyLinePath(points, connection) + ' Z');
    expect(closed.segments.at(-1)!.end).toEqual(points[0]);
    expect(renderLineExtras({ points, connection, line, extras: {} })).toBe(
      `<path d="${xyLinePath(points, connection)}" fill="none" stroke="#128080" stroke-width="1" />`,
    );
  },
);
it('handles empty, single and repeated points without invalid geometry', () => {
  for (const sample of [
    [],
    [{ x: 1, y: 1 }],
    [
      { x: 1, y: 1 },
      { x: 1, y: 1 },
    ],
  ]) {
    const metric = lineMetrics(sample, 'straight', true);
    expect(metric.length).toBe(0);
    expect(pointAtLength(metric, 0)).toBeUndefined();
    expect(
      renderLineExtras({
        points: sample,
        connection: 'straight',
        line,
        extras: { lineArrows: { position: 'both', lengthPt: 6, angleDeg: 40 } },
      }),
    ).not.toContain('data-role="curve-arrow"');
  }
});
it('cuts out the union of overlapping gaps rather than restoring their intersection', () => {
  const m = lineMetrics(
    [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    'straight',
    false,
  );
  const pieces = visibleLinePieces(
    m,
    [
      { x: 45, y: 0 },
      { x: 55, y: 0 },
    ],
    10,
  );
  expect(pieces.map((p) => [p.from, p.to])).toEqual([
    [0, 35],
    [65, 100],
  ]);
  expect(pieces.map((p) => p.d)).toEqual(['M0 0 L35 0', 'M65 0 L100 0']);
});
it('preserves cubic curves in visible pieces and returns actual tangents', () => {
  const m = lineMetrics(points, 'spline', false);
  const pieces = visibleLinePieces(m, points, 6);
  expect(pieces.length).toBeGreaterThan(1);
  expect(pieces.every((p) => p.d.includes(' C'))).toBe(true);
  const end = pointAtLength(m, m.length)!;
  expect(end.point.x).toBeCloseTo(100, 5);
  expect(end.point.y).toBeCloseTo(20, 5);
  expect(end.tangent.x).toBeGreaterThan(0);
  expect(end.tangent.y).toBeLessThan(0);
});
it('measures nearly vertical nonuniform cubic parameterization accurately', () => {
  const sample = [
    { x: 0, y: 0 },
    { x: 0.001, y: 50 },
    { x: 0.002, y: 120 },
  ];
  const m = lineMetrics(sample, 'spline', false);
  expect(pointAtLength(m, 25)!.point.y).toBeCloseTo(25, 1);
  const first = visibleLinePieces(m, sample, 6)[0]!;
  expect(pointAtLength(m, first.from)!.point.y).toBeCloseTo(6, 1);
});
it('includes the final endpoint arrow in the complexity limit', () => {
  expect(() =>
    renderLineExtras({
      points: [
        { x: 0, y: 0 },
        { x: 20006, y: 0 },
      ],
      connection: 'straight',
      line,
      extras: {
        lineArrows: {
          position: 'repeat',
          lengthPt: 1,
          angleDeg: 40,
          spacingFactor: 10,
        },
      },
    }),
  ).toThrow(/上限/);
});
it('preserves dash phase after a symbol gap and does not use white covers or masks', () => {
  const svg = renderLineExtras({
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    connection: 'straight',
    line: { ...line, customDash: { lengthsPt: [8, 3], offsetPt: -0.5 } },
    marker,
    extras: { symbolGapPct: 25 },
  });
  expect(svg).toContain('stroke-dasharray="8 3"');
  expect(svg).toMatch(/stroke-dashoffset="[1-9]/);
  expect(svg).not.toMatch(/mask|clipPath|white|#fff|data-role="marker"/);
});
it('keeps thick miter corners of square symbols clear of the diagonal line', () => {
  const svg = renderLineExtras({
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ],
    connection: 'straight',
    line,
    marker: { ...marker, shape: 'square', strokeWidthPt: 20 },
    extras: { symbolGapPct: 1 },
  });
  const start = /d="M([\d.]+) ([\d.]+)/.exec(svg)!;
  expect(Math.hypot(Number(start[1]), Number(start[2]))).toBeGreaterThan(
    Math.SQRT2 * (4 + 10) + 0.08,
  );
});
it('ignores gap when symbols are hidden and draws arrows with inherited opacity', () => {
  const sample = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];
  const svg = renderLineExtras({
    points: sample,
    connection: 'straight',
    line: { ...line, opacity: 0.25 },
    marker: { ...marker, visible: false },
    extras: {
      symbolGapPct: 50,
      lineArrows: { position: 'both', lengthPt: 6, angleDeg: 40 },
    },
  });
  expect(svg).toContain('d="M0 0 L100 0"');
  expect(svg.match(/data-role="curve-arrow"/g)).toHaveLength(2);
  expect(svg.match(/fill-opacity="0.25"/g)).toHaveLength(2);
});
it('places repeated arrows at physical spacing and bounds explosive settings', () => {
  const svg = renderLineExtras({
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
    connection: 'straight',
    line,
    extras: {
      lineArrows: {
        position: 'repeat',
        lengthPt: 5,
        angleDeg: 40,
        spacingFactor: 5,
      },
    },
  });
  expect(svg.match(/data-role="curve-arrow"/g)).toHaveLength(4);
  expect(() =>
    renderLineExtras({
      points: [
        { x: 0, y: 0 },
        { x: 1e8, y: 0 },
      ],
      connection: 'straight',
      line,
      extras: {
        lineArrows: {
          position: 'repeat',
          lengthPt: 1,
          angleDeg: 40,
          spacingFactor: 1,
        },
      },
    }),
  ).toThrow(/上限/);
});
it('maps drop line targets by the bound axis including reverse and custom negative decimals', () => {
  const context = {
    rect: { x: 10, y: 20, width: 200, height: 100 },
    xScale: createScale({ scale: 'linear', reverse: true }, -1, 1)!,
    yScale: createScale({ scale: 'linear', reverse: false }, -2, 2)!,
  };
  const svg = renderDropLines(
    [{ x: 80, y: 50, sourceIndex: 3 }],
    context,
    {
      horizontal: { target: { mode: 'axis-min' } },
      vertical: { target: { mode: 'value', value: -0.5 } },
    },
    '#123456',
  );
  expect(svg).toContain('x2="210" y2="50"');
  expect(svg).toContain('x2="80" y2="82.5"');
  expect(svg.match(/data-source-index="3"/g)).toHaveLength(2);
  context.yScale = createScale({ scale: 'log10', reverse: false }, 1, 10)!;
  expect(() =>
    renderDropLines(
      [{ x: 80, y: 50, sourceIndex: 3 }],
      context,
      { vertical: { target: { mode: 'value', value: 0 } } },
      '#123456',
    ),
  ).toThrow(/对数/);
});
it.each([
  { symbolGapPct: -1 },
  { symbolGapPct: 257 },
  { closeLine: 'yes' },
  { lineArrows: { position: 'middle', lengthPt: 6, angleDeg: 40 } },
  { lineArrows: { position: 'end', lengthPt: 0, angleDeg: 40 } },
  { lineArrows: { position: 'end', lengthPt: 6, angleDeg: 180 } },
  { dropLines: { horizontal: { target: { mode: 'value', value: NaN } } } },
])('rejects invalid extras %j', (extras) =>
  expect(() => validateLineExtras(extras as any)).toThrow(),
);
