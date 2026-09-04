import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import type { LinearScale } from './scales.js';

function column(data: DataBindingSet, slotId: string) {
  const binding = data.bindings.find(
    (item) => item.dataSlotId === slotId && item.status === 'valid',
  );
  return binding
    ? data.columns.find((item) => item.columnId === binding.columnId)
    : undefined;
}

export function renderPlot(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  data: DataBindingSet,
  xScale: LinearScale,
  yScale: LinearScale,
  rect: Rect,
): { svg: string; skipped: number } | undefined {
  const x = column(data, plot.bindings.x);
  const y = column(data, plot.bindings.y);
  if (!x || !y) return undefined;
  const points: Array<{ x: number; y: number }> = [];
  let skipped = 0;
  const count = Math.min(x.values.length, y.values.length);
  for (let index = 0; index < count; index += 1) {
    const xv = x.values[index];
    const yv = y.values[index];
    if (
      typeof xv !== 'number' ||
      typeof yv !== 'number' ||
      !Number.isFinite(xv) ||
      !Number.isFinite(yv)
    ) {
      skipped += 1;
      continue;
    }
    points.push({
      x: rect.x + xScale.map(xv) * rect.width,
      y: rect.y + (1 - yScale.map(yv)) * rect.height,
    });
  }
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${formatNumber(point.x)} ${formatNumber(point.y)}`,
    )
    .join(' ');
  let svg = '';
  if (plot.mode !== 'markers' && plot.lineStyle?.visible && path)
    svg += `<path d="${path}" fill="none" stroke="${escapeXml(plot.lineStyle.color)}" stroke-width="${formatNumber(plot.lineStyle.widthPt)}" />`;
  if (plot.mode !== 'line' && plot.markerStyle?.visible)
    for (const point of points)
      svg += `<circle cx="${formatNumber(point.x)}" cy="${formatNumber(point.y)}" r="${formatNumber(plot.markerStyle.sizePt / 2)}" fill="${escapeXml(plot.markerStyle.fill)}" stroke="${escapeXml(plot.markerStyle.stroke)}" stroke-width="${formatNumber(plot.markerStyle.strokeWidthPt)}" />`;
  if (plot.legendEntry.visible)
    svg += `<text data-role="legend" x="${formatNumber(rect.x + rect.width)}" y="${formatNumber(rect.y - 8)}">${escapeXml(plot.legendEntry.text)}</text>`;
  return { svg, skipped };
}
