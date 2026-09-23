import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../../tests/helpers/chart-fixtures.js';
import { preparePlot } from './prepare.js';
import { renderContour } from './svg-grid.js';
import { createScale, generateMajorTicks } from '../scales.js';
import type { ChartContext } from './svg-marks.js';

const context: ChartContext = {
  rect: { x: 0, y: 0, width: 300, height: 200 },
  xScale: { scale: 'linear', min: -0.5, max: 2.5, map: (v) => (v + 0.5) / 3 },
  yScale: { scale: 'linear', min: -0.5, max: 1.5, map: (v) => (v + 0.5) / 2 },
};
function contour(values: number[], mode: 'lines' | 'filled' = 'lines') {
  const plot = chartTemplate('contour').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'contour') throw new Error('fixture');
  plot.levels = { mode: 'values', values: [0.5] };
  plot.mode = mode;
  return preparePlot(
    plot,
    chartData({ x: [0, 1, 2, 0, 1, 2], y: [0, 0, 0, 1, 1, 1], z: values }),
  );
}
it('aligns planar threshold coordinates with sample centers and clips artificial outer closure', () => {
  const svg = renderContour(contour([0, 1, 2, 0, 1, 2]), context);
  expect(svg).toContain('data-role="contour-line" data-level="0.5"');
  expect(svg).toContain('L100 50');
  expect(svg).toContain('L100 150');
  expect(svg).toContain(
    'data-role="contour-clip" x="50" y="50" width="200" height="100"',
  );
});
it('represents separated saddle islands and filled regions with even-odd topology', () => {
  const svg = renderContour(contour([1, 0, 0, 0, 1, 0], 'filled'), context);
  expect(svg).toContain('fill-rule="evenodd"');
  expect(svg).toContain('data-role="contour-background"');
  const path = svg.match(/data-role="contour-band"[^>]*d="([^"]*)"/)![1]!;
  expect(path.match(/M/g)).toHaveLength(2);
  expect(svg).not.toMatch(/NaN|Infinity/);
});
it('handles constant fields explicitly and enforces contour work limits', () => {
  expect(renderContour(contour([3, 3, 3, 3, 3, 3]), context)).toContain(
    '常量场',
  );
  const filled = renderContour(contour([3, 3, 3, 3, 3, 3], 'filled'), context);
  expect(filled).toContain('contour-background');
  expect(filled).not.toContain('contour-band');
  const item = contour([0, 1, 2, 0, 1, 2]);
  item.grid!.values = Array(40_001).fill(1);
  if (item.plot.kind === 'contour')
    item.plot.levels = { mode: 'auto', count: 50 };
  expect(() => renderContour(item, context)).toThrow(/计算上限/);
});
it('keeps finite extreme axis maps and tick generation bounded', () => {
  const scale = createScale(
    { scale: 'linear', reverse: false },
    -1e308,
    1e308,
  )!;
  expect([scale.map(-1e308), scale.map(0), scale.map(1e308)]).toEqual([
    0, 0.5, 1,
  ]);
  const ticks = generateMajorTicks(-1e308, 1e308, 6);
  expect(ticks.length).toBeLessThanOrEqual(8);
  expect(ticks.every(Number.isFinite)).toBe(true);
  expect(ticks[0]).toBe(-1e308);
  expect(ticks.at(-1)).toBe(1e308);
});
