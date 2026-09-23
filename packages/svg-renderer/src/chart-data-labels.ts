import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PreparedPlot } from './charts/prepared.js';
import { point, type ChartContext } from './charts/chart-point.js';
import { prepareDataLabelRows, renderDataLabels } from './data-labels.js';
import type { SeriesRow } from './series-rows.js';
import { containsDataPoint } from './data-clip.js';

export function renderChartDataLabels(
  item: PreparedPlot,
  data: DataBindingSet,
  context: ChartContext,
): ReturnType<typeof renderDataLabels> {
  const plot = item.plot;
  if (
    (plot.kind !== 'bar' && plot.kind !== 'area') ||
    !plot.dataLabels?.visible
  )
    return { svg: '', diagnostics: [], placed: 0, hidden: 0 };
  const rawRows = prepareDataLabelRows(plot, data);
  if (plot.kind === 'bar') {
    const position = (index: number, value: number) => {
      const bar = item.bars[index];
      if (!bar?.category) throw new Error('标签原行没有对应柱形');
      const scale =
          plot.orientation === 'horizontal' ? context.yScale : context.xScale,
        categoryIndex =
          scale.categories?.findIndex((c) => c.key === bar.category) ?? -1;
      if (categoryIndex < 0) throw new Error('标签类别没有对应坐标位置');
      const overlap = plot.overlap ?? 0,
        unit =
          plot.width /
          Math.max(1, item.bandCount - overlap * (item.bandCount - 1)),
        center = categoryIndex - plot.width / 2 + unit * (item.bandIndex + 0.5);
      return plot.orientation === 'horizontal'
        ? point(context, value, center)
        : point(context, center, value);
    };
    return renderDataLabels({
      plot,
      data,
      context,
      rows: context.dataClip
        ? rawRows.filter((row) => {
            const bar = item.bars[row.sourceIndex];
            if (!bar) return false;
            const c = context.dataClip!;
            return plot.orientation === 'horizontal'
              ? bar.end >= c.xMin && bar.end <= c.xMax
              : bar.end >= c.yMin && bar.end <= c.yMax;
          })
        : rawRows,
      pointForRow: (row) =>
        position(row.sourceIndex, item.bars[row.sourceIndex]!.end),
      anchorForRow: (row, anchor) => {
        const bar = item.bars[row.sourceIndex]!;
        if (anchor === 'baseline')
          return position(
            row.sourceIndex,
            plot.dataLabels!.baseline ?? bar.start,
          );
        const valueAxis = plot.orientation === 'horizontal' ? 'x-' : 'y-';
        if (!anchor.startsWith(valueAxis) || !bar.error) return undefined;
        return position(
          row.sourceIndex,
          bar.error[anchor.endsWith('lower') ? 0 : 1],
        );
      },
    });
  }
  const geometry = item.curveGeometry,
    originals = new Map(rawRows.map((row) => [row.sourceIndex, row])),
    baselines = new Map<number, number>();
  const rows: SeriesRow[] = [];
  for (const raw of rawRows) {
    const transform = geometry?.errorTransform?.(raw);
    if (geometry?.errorTransform && !transform) continue;
    const xOffset = transform?.xOffset ?? geometry?.offset?.x ?? 0,
      mapY =
        transform?.mapY ??
        ((value: number) => value + (geometry?.offset?.y ?? 0));
    rows.push({ ...raw, x: raw.x + xOffset, y: mapY(raw.y) });
    if (
      plot.dataLabels.anchor === 'baseline' &&
      plot.dataLabels.baseline === undefined
    )
      baselines.set(raw.sourceIndex, mapY(plot.baseline));
  }
  return renderDataLabels({
    plot,
    data,
    context,
    rows: rows.filter((p) => containsDataPoint(p, context.dataClip)),
    rawRowForRow: (row) => originals.get(row.sourceIndex)!,
    anchorForRow: (row, anchor) =>
      anchor === 'baseline'
        ? point(
            context,
            row.x,
            plot.dataLabels!.baseline ?? baselines.get(row.sourceIndex)!,
          )
        : undefined,
  });
}
