import type { XyPlot } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber as n } from './geometry.js';

type Plot = XyPlot;
type Marker = NonNullable<Plot['markerStyle']>;

export function lineDash(dash: NonNullable<Plot['lineStyle']>['dash']): string {
  const patterns = {
    solid: '',
    dashed: '6 4',
    dotted: '1 3',
    'dash-dot': '6 3 1 3',
  };
  return patterns[dash] ? ` stroke-dasharray="${patterns[dash]}"` : '';
}

export function renderMarker(
  point: { x: number; y: number },
  style: Marker,
): string {
  const { x, y } = point;
  const r = style.sizePt / 2;
  const cross = style.shape === 'cross' || style.shape === 'plus';
  const attrs = `data-role="marker" fill="${cross ? 'none' : escapeXml(style.fill)}" stroke="${escapeXml(style.stroke)}" stroke-width="${n(style.strokeWidthPt)}"`;
  if (style.shape === 'circle')
    return `<circle ${attrs} cx="${n(x)}" cy="${n(y)}" r="${n(r)}" />`;
  if (style.shape === 'square')
    return `<rect ${attrs} x="${n(x - r)}" y="${n(y - r)}" width="${n(r * 2)}" height="${n(r * 2)}" />`;
  if (style.shape === 'triangle')
    return `<polygon ${attrs} points="${n(x)},${n(y - r)} ${n(x + r)},${n(y + r)} ${n(x - r)},${n(y + r)}" />`;
  if (style.shape === 'diamond')
    return `<polygon ${attrs} points="${n(x)},${n(y - r)} ${n(x + r)},${n(y)} ${n(x)},${n(y + r)} ${n(x - r)},${n(y)}" />`;
  const d =
    style.shape === 'plus'
      ? `M${n(x - r)} ${n(y)}H${n(x + r)}M${n(x)} ${n(y - r)}V${n(y + r)}`
      : `M${n(x - r)} ${n(y - r)}L${n(x + r)} ${n(y + r)}M${n(x - r)} ${n(y + r)}L${n(x + r)} ${n(y - r)}`;
  return `<path ${attrs} d="${d}" />`;
}
