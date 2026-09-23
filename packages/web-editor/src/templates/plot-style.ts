import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { PlotSlot } from '@plot-fig/figure-schema';
export function plotStyle(
  plot: PlotSlot,
  source: FigureTemplate,
  index: number,
) {
  const color = source.theme.palette[index % source.theme.palette.length]!,
    theme = source.theme;
  if ('lineStyle' in plot && plot.lineStyle)
    plot.lineStyle = { ...plot.lineStyle, color, widthPt: theme.line.widthPt };
  if ('fillStyle' in plot)
    plot.fillStyle = {
      ...plot.fillStyle,
      color,
      borderWidthPt: theme.line.widthPt,
    };
  if (plot.kind === 'xy') {
    plot.lineStyle = {
      visible: true,
      dash: 'solid',
      ...plot.lineStyle,
      color,
      widthPt: theme.line.widthPt,
    };
    plot.markerStyle = {
      visible: true,
      strokeWidthPt: 1,
      ...plot.markerStyle,
      ...theme.marker,
      fill: color,
      stroke: color,
    };
  }
  if ((plot.kind === 'xy' || plot.kind === 'bar') && plot.errorBarStyle)
    plot.errorBarStyle = {
      ...plot.errorBarStyle,
      color,
      widthPt: theme.line.widthPt,
    };
  if (plot.kind === 'heatmap' || plot.kind === 'contour') {
    const grid = source.panels
      .flatMap((p) => p.plotSlots)
      .find((p) => p.kind === 'heatmap' || p.kind === 'contour');
    if (grid && (grid.kind === 'heatmap' || grid.kind === 'contour'))
      plot.colorScale.colors = [...grid.colorScale.colors];
  }
}
