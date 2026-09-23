import { expect, it } from 'vitest';
import { renderLineExtras } from './xy-line-extras.js';
import { resolveLineMapping } from './line-mapping.js';
import { lineMetrics } from './xy-line-metrics.js';
const rows = [
  { sourceIndex: 0, x: 0, y: 0 },
  { sourceIndex: 1, x: 1, y: 1 },
  { sourceIndex: 2, x: 2, y: 0 },
];
const line = {
  visible: true,
  color: '#111111',
  widthPt: 1,
  dash: 'solid' as const,
};
it('线段颜色按完整原行稳定分配，分类/数值范围及空值回退', () => {
  const col = {
    columnId: 'c',
    name: 'C',
    index: 0,
    valueType: 'number' as const,
    values: [-2, 0, 2],
  };
  const mapped = resolveLineMapping(
    line,
    rows,
    { mode: 'continuous', colors: ['#000000', '#ffffff'] },
    col,
  );
  expect(rows.map((r) => mapped.color(r))).toEqual([
    '#000000',
    '#808080',
    '#ffffff',
  ]);
  const inc = resolveLineMapping(line, rows, {
    mode: 'increment',
    colors: ['#ff0000', '#00ff00'],
  });
  expect(inc.color(rows[2]!)).toBe('#ff0000');
  expect(() =>
    resolveLineMapping(
      line,
      rows,
      {
        mode: 'continuous',
        colors: ['#000000', '#ffffff'],
        domain: { min: 1, max: 0 },
      },
      col,
    ),
  ).toThrow();
});
it.each(['straight', 'step-h', 'step-v', 'spline'] as const)(
  '分色保留%s几何、首尾闭合、完整路径箭头且零长度阶梯不串色',
  (connection) => {
    const points = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 100, y: 40 },
      ],
      colors = ['#ff0000', '#00ff00', '#0000ff'];
    const svg = renderLineExtras({
      points,
      connection,
      line,
      extras: {
        closeLine: true,
        lineArrows: { position: 'end', lengthPt: 3, angleDeg: 25 },
      },
      lineColors: colors,
    });
    for (const color of colors) expect(svg).toContain(`stroke="${color}"`);
    expect(svg).toContain('data-role="curve-arrow"');
    expect(svg).toContain('fill="#0000ff"');
    const metrics = lineMetrics(points, connection, true);
    expect(metrics.segments.at(-1)!.sourceEdge).toBe(2);
    if (connection === 'spline') expect(svg).toContain('C');
  },
);
