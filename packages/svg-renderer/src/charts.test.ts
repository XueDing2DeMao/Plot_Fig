import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from './render.js';

it.each([
  ['bar', { category: ['A', 'B'], value: [2, -3] }, 'bar'],
  ['histogram', { values: [0, 1, 2] }, 'histogram-bin'],
  ['box', { values: [1, 2, 3, 4, 100] }, 'box-body'],
  ['area', { x: [0, 1, 2, 3, 4], y: [1, 2, null, 3, 4] }, 'area'],
  [
    'heatmap',
    { x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [1, 2, 3, 4] },
    'heatmap-cell',
  ],
  [
    'contour',
    { x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [1, 2, 3, 4] },
    'contour-line',
  ],
] as const)('renders %s as actual SVG geometry', (kind, columns, role) => {
  const result = renderTemplateSvg(
    chartTemplate(kind),
    chartData(columns as any),
  );
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  expect(result.svg).toContain(`data-role="${role}"`);
  expect(result.svg).not.toMatch(/NaN|Infinity/);
  expect(result.svg).toContain('<clipPath');
});
it('keeps area gaps separate and includes baseline in its scale', () => {
  const result = renderTemplateSvg(
    chartTemplate('area'),
    chartData({ x: [0, 1, 2, 3, 4], y: [1, 2, null, 3, 4] }),
  );
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.svg.match(/data-role="area"/g)).toHaveLength(2);
});
it('does not turn missing heatmap cells into zero or accept incomplete contours', () => {
  const data = chartData({
    x: [0, 1, 0, 1],
    y: [0, 0, 1, 1],
    z: [1, 2, null, 4],
  });
  const heat = renderTemplateSvg(chartTemplate('heatmap'), data);
  expect(heat.ok).toBe(true);
  if (heat.ok)
    expect(heat.svg.match(/data-role="heatmap-cell"/g)).toHaveLength(3);
  expect(renderTemplateSvg(chartTemplate('contour'), data).ok).toBe(false);
});
