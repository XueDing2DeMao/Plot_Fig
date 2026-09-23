import type { DataColumn } from '@plot-fig/data-binding';
import {
  prepareSeriesRows,
  type SeriesRowOptions,
  type SeriesRow,
} from '../../packages/svg-renderer/src/series-rows.js';

export type DataViewOptions = SeriesRowOptions & {
  calculationSource?: 'raw' | 'selected';
};
export function prepareDataView(
  x: DataColumn,
  y: DataColumn,
  options: DataViewOptions = {},
  inDomain: (row: SeriesRow) => boolean = () => true,
) {
  if (!['raw', 'selected'].includes(options.calculationSource ?? 'raw'))
    throw new Error('无效的计算数据来源');
  const rows = prepareSeriesRows(x, y, options, inDomain);
  return {
    ...rows,
    calculationRows:
      options.calculationSource === 'selected'
        ? rows.selectedRows
        : rows.rawRows,
  };
}
export function demoColumn(
  name: string,
  values: DataColumn['values'],
): DataColumn {
  return {
    columnId: name,
    name,
    index: name === 'X' ? 0 : 1,
    valueType: 'number',
    values,
    source: { tableId: 'demo', tableName: '样本', dataStartRow: 1 },
  };
}
export const demoX = demoColumn('X', [0, 3, 1, 1, 2, null, 6, 4, 5, 7, 8, 9]);
export const demoY = demoColumn('Y', [0, 6, 2, 3, 4, null, 3, 5, 4, 7, 6, 20]);
