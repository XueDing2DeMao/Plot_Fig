import type { DataColumn } from '@plot-fig/data-binding';
import {
  validateLineMapping,
  type LineMapping,
  type LineStyle,
} from '@plot-fig/figure-schema';
import { resolveMarkerMapping } from './marker-mapping.js';
import type { SeriesRow } from './series-rows.js';
export function resolveLineMapping(
  base: LineStyle,
  rows: readonly SeriesRow[],
  value: LineMapping,
  column?: DataColumn,
) {
  validateLineMapping(value);
  if (value.mode === 'increment')
    return {
      color: (row: SeriesRow) =>
        value.colors[row.sourceIndex % value.colors.length]!,
      diagnostics: [],
    };
  if (!column) throw new Error('请绑定线条颜色数据列');
  const mapped = resolveMarkerMapping(
    {
      visible: true,
      shape: 'circle',
      sizePt: 0,
      strokeWidthPt: 0,
      stroke: base.color,
      fill: base.color,
    },
    rows,
    { color: { ...value, target: 'stroke' } },
    { color: column },
  );
  return {
    color: (row: SeriesRow) => mapped.style(row).stroke,
    diagnostics: mapped.diagnostics,
  };
}
