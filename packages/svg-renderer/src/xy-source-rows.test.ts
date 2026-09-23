import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderPlot } from './plot.js';
import { createScale } from './scales.js';
import { rowLocation } from './charts/prepared.js';

function render(x: number[], y: number[], error: number[], log = false) {
  const plot = chartTemplate('xy').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('expected XY');
  plot.mode = 'line';
  plot.bindings.yError = 'slot-yError';
  plot.errorBarStyle = {
    visible: true,
    color: '#333333',
    widthPt: 1,
    capWidthPt: 4,
  };
  return renderPlot(plot, chartData({ x, y, yError: error }), {
    rect: { x: 0, y: 0, width: 100, height: 100 },
    xScale: createScale(
      { scale: log ? 'log10' : 'linear', reverse: false },
      log ? 1 : 0,
      log ? 10 : 4,
    )!,
    yScale: createScale({ scale: 'linear', reverse: false }, 0, 40)!,
  })!;
}
function errors(svg: string) {
  return [
    ...svg.matchAll(
      /<line data-role="error-bar" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g,
    ),
  ].map((match) => match.slice(1).map(Number));
}
it('keeps unsorted and duplicate X rows paired with their own errors', () => {
  const rendered = render([3, 1, 1], [10, 20, 30], [1, 2, 3]);
  expect(rendered.svg).toContain('d="M75 75 L25 50 L25 25"');
  expect(errors(rendered.svg)).toEqual([
    [75, 77.5, 75, 72.5],
    [25, 55, 25, 45],
    [25, 32.5, 25, 17.5],
  ]);
});
it('keeps error row identity after a nonpositive log-axis point is excluded', () => {
  const rendered = render([-1, 1, 10], [10, 20, 30], [1, 2, 3], true);
  expect(rendered.skipped).toBe(1);
  expect(errors(rendered.svg)).toEqual([
    [0, 55, 0, 45],
    [100, 32.5, 100, 17.5],
  ]);
});
it('resolves source rows independently for columns with different source regions', () => {
  const data = chartData({ x: [1, 2], y: [3, 4] });
  data.columns[0]!.source = { tableId: 'x', tableName: 'X表', dataStartRow: 3 };
  data.columns[1]!.source = { tableId: 'y', tableName: 'Y表', dataStartRow: 7 };
  expect(rowLocation(data, 'slot-x', 1)).toContain('源第 5 行');
  expect(rowLocation(data, 'slot-y', 1)).toContain('源第 9 行');
});
