import type { FigureTemplate, Panel, PlotSlot } from '@plot-fig/figure-schema';
import { panelRect, type Rect } from './geometry.js';
import { pageViewport } from './page-size.js';

export const COLORBAR_WIDTH = 60;
// 横向色标需要避开 X 轴刻度标签和轴标题，并为自身标题与刻度留出空间。
export const COLORBAR_HEIGHT = 68;
export type ColorbarLayout = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export function colorbarSlotSize(
  plot: Extract<PlotSlot, { kind: 'heatmap' | 'contour' }>,
) {
  const orientation = plot.colorScale.colorbar.orientation ?? 'vertical',
    width = plot.colorScale.colorbar.widthPt ?? 10;
  return orientation === 'vertical'
    ? COLORBAR_WIDTH - 10 + width
    : COLORBAR_HEIGHT - 10 + width;
}
export function colorbarLayout(plots: readonly PlotSlot[]): ColorbarLayout {
  const layout: ColorbarLayout = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const plot of plots) {
    if (
      (plot.kind !== 'heatmap' && plot.kind !== 'contour') ||
      !plot.colorScale.colorbar.visible
    )
      continue;
    const orientation = plot.colorScale.colorbar.orientation ?? 'vertical',
      side =
        plot.colorScale.colorbar.side ??
        (orientation === 'vertical' ? 'right' : 'bottom');
    layout[side] += colorbarSlotSize(plot);
  }
  return layout;
}
export function layerClipRect(panel: Panel, plot: Rect): Rect {
  if (!panel.clip || !panel.clipMargins) return plot;
  const dx = (plot.width * panel.clipMargins.horizontalPct) / 100;
  const dy = (plot.height * panel.clipMargins.verticalPct) / 100;
  return {
    x: plot.x + dx,
    y: plot.y + dy,
    width: plot.width - 2 * dx,
    height: plot.height - 2 * dy,
  };
}
export function pageGeometry(value: FigureTemplate['page']) {
  const page = pageViewport(value),
    margins = value.margins;
  // 内容区域仅用于显式布局操作，不改变旧模板相对于整个页面保存的图层位置。
  const content = {
    x: margins.left,
    y: margins.top,
    width: page.width - margins.left - margins.right,
    height: page.height - margins.top - margins.bottom,
  };
  return { page, content };
}
export function layerGeometry(
  frame: FigureTemplate['panels'][number]['frame'],
  page: Rect,
  colorbars: number | ColorbarLayout,
) {
  const layer = panelRect(frame, page),
    layout =
      typeof colorbars === 'number'
        ? { left: 0, right: colorbars, top: 0, bottom: 0 }
        : colorbars;
  const reserved =
    typeof colorbars === 'number'
      ? { left: 0, right: colorbars * COLORBAR_WIDTH, top: 0, bottom: 0 }
      : layout;
  const plot = {
    x: layer.x + reserved.left,
    y: layer.y + reserved.top,
    width: layer.width - reserved.left - reserved.right,
    height: layer.height - reserved.top - reserved.bottom,
  };
  return { layer, plot };
}
export function colorbarGeometry(
  plot: Rect,
  index: number,
  availableHeight?: number,
): Rect {
  const inset =
    availableHeight === undefined ? 18 : 18 * Math.min(1, availableHeight / 60);
  return {
    x: plot.x + plot.width + 18 + index * COLORBAR_WIDTH,
    y: plot.y + inset,
    width: 10,
    height:
      availableHeight === undefined
        ? Math.max(24, plot.height - 36)
        : availableHeight - 2 * inset,
  };
}
