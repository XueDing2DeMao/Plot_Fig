import type { Axis, XyPlot } from '@plot-fig/figure-schema';
import { axisScaleSpec, numericScaleCapability } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { prepareSeriesRows, type SeriesRow } from './series-rows.js';

export function xyBoundColumns(plot: XyPlot, data: DataBindingSet) {
  const column = (slotId: string) => {
    const binding = data.bindings.find(
      (b) => b.dataSlotId === slotId && b.status === 'valid',
    );
    const col =
      binding && data.columns.find((c) => c.columnId === binding.columnId);
    if (!col) throw new Error(`数据槽 ${slotId} 尚未绑定可用数据列`);
    return col;
  };
  return { x: column(plot.bindings.x), y: column(plot.bindings.y) };
}
export function xyDomain(plot: XyPlot, axes: readonly Axis[] = []) {
  const x = axes.find((a) => a.axisId === plot.xAxisId),
    y = axes.find((a) => a.axisId === plot.yAxisId);
  const xAccepts =
    x && x.scale !== 'category'
      ? numericScaleCapability(axisScaleSpec(x)).accepts
      : Number.isFinite;
  const yAccepts =
    y && y.scale !== 'category'
      ? numericScaleCapability(axisScaleSpec(y)).accepts
      : Number.isFinite;
  return (row: SeriesRow) => xAccepts(row.x) && yAccepts(row.y);
}
export function prepareXyData(
  plot: XyPlot,
  data: DataBindingSet,
  axes: readonly Axis[] = [],
) {
  const { x, y } = xyBoundColumns(plot, data);
  return prepareSeriesRows(x, y, plot.dataView, xyDomain(plot, axes));
}
