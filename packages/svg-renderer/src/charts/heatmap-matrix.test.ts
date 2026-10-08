import { expect, it } from 'vitest';
import { prepareGrid, gridCellBounds } from './grid.js';
import { renderFigureSvg } from '../index.js';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';

it('热图完整保留 800×94 单元，等值线仍使用原容量限制', () => {
  const columns = { x: [] as number[], y: [] as number[], z: [] as number[] };
  for (let y = 0; y < 94; y++)
    for (let x = 0; x < 800; x++) {
      columns.x.push(x);
      columns.y.push(y);
      columns.z.push(x + y);
    }
  expect(prepareGrid(columns, false).values).toHaveLength(75200);
  expect(() => prepareGrid(columns, true)).toThrow(/超过/);
  const positions = Array.from({ length: 317 }, (_, i) => i);
  expect(() =>
    prepareGrid({ x: positions, y: positions, z: positions }, false),
  ).toThrow(/超过/);
});
it('非等距热图以相邻中心的中点划分单元，支持单行单列', () => {
  expect(gridCellBounds([1, 3, 8], 0)).toEqual([0, 2]);
  expect(gridCellBounds([1, 3, 8], 1)).toEqual([2, 5.5]);
  expect(gridCellBounds([1, 3, 8], 2)).toEqual([5.5, 10.5]);
  expect(gridCellBounds([5], 0)).toEqual([4.5, 5.5]);
  const data = chartData({ x: [1, 3, 8], y: [5, 5, 5], z: [1, null, 3] });
  const result = renderFigureSvg(chartTemplate('heatmap'), data);
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.svg.match(/data-role="heatmap-cell"/g)).toHaveLength(2);
});
