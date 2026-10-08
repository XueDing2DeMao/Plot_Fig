import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PreparedPlot } from './charts/prepared.js';
import type { ChartContext } from './charts/chart-point.js';
import { prepareCurveSubset } from './curve-groups.js';
import {
  markerMappingColumns,
  markerSourceForPlot,
} from './marker-mapped-plot.js';
import { resolveMarkerOverrides } from './marker-overrides.js';
import { resolveMarkerMapping } from './marker-mapping.js';
import { resolveMarkerDetails } from './marker-details.js';

/** 沿用正式符号解析器及来源校验，包含子集、映射、细节与单点覆盖的优先级。 */
export function groupColorbarMarkerStyle(
  item: PreparedPlot,
  data: DataBindingSet,
  context: ChartContext,
) {
  const plot = item.plot,
    rows = item.xyRows;
  if (plot.kind !== 'xy' || plot.mode === 'line' || !plot.markerStyle || !rows)
    return undefined;
  const subset = prepareCurveSubset(
    plot,
    data,
    item.curveGeometry?.sourceRows ?? rows,
  );
  const overrides = resolveMarkerOverrides(
    plot.markerOverrides,
    plot.markerOverrides ? markerSourceForPlot(plot, data) : undefined,
    rows.rawRows,
  ).overrides;
  const options = {
    mapping: plot.markerMapping ?? {},
    columns: markerMappingColumns(plot, data),
    overrides,
    baseForRow: (row: (typeof rows.rawRows)[number]) =>
      subset.style(row).marker,
    referenceRows: item.curveGeometry?.sourceRows?.rawRows ?? rows.rawRows,
  };
  return plot.markerDetails && Object.keys(plot.markerDetails).length
    ? resolveMarkerDetails(
        plot.markerStyle,
        rows.rawRows,
        context,
        plot.markerDetails,
        options,
      ).style
    : resolveMarkerMapping(
        plot.markerStyle,
        rows.rawRows,
        options.mapping,
        options.columns,
        context,
        overrides,
        options.baseForRow,
        options.referenceRows,
      ).style;
}
