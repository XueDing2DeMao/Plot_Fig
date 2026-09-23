import type { PlotScale } from './scales.js';
import { escapeXml, formatNumber as n, type Rect } from './geometry.js';
export type ScaleCell = { rect: Rect; xScale: PlotScale; yScale: PlotScale };
function pieces(scale: PlotScale) {
  return (
    scale.segments ?? [
      { min: scale.min, max: scale.max, from: 0, to: 1, scale },
    ]
  );
}
function local(segment: ReturnType<typeof pieces>[number]): PlotScale {
  const scale = segment.scale;
  if (segment.from <= segment.to) return scale;
  const map = (value: number) => 1 - scale.map(value);
  return {
    ...scale,
    map,
    ...(scale.numeric
      ? {
          numeric: {
            ...scale.numeric,
            map,
            invert: (position: number) => scale.numeric!.invert(1 - position),
          },
        }
      : {}),
  };
}
export function scaleCells(
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): ScaleCell[] {
  const xs = pieces(xScale),
    ys = pieces(yScale);
  if (xs.length * ys.length > 64) throw new Error('二维断轴最多64个保留区块');
  return xs.flatMap((x) =>
    ys.map((y) => ({
      rect: {
        x: rect.x + Math.min(x.from, x.to) * rect.width,
        y: rect.y + (1 - Math.max(y.from, y.to)) * rect.height,
        width: Math.abs(x.to - x.from) * rect.width,
        height: Math.abs(y.to - y.from) * rect.height,
      },
      xScale: local(x),
      yScale: local(y),
    })),
  );
}
export function cellClip(id: string, rects: Rect[]): string {
  return `<defs><clipPath id="${escapeXml(id)}">${rects.map((r) => `<rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.width)}" height="${n(r.height)}"/>`).join('')}</clipPath></defs>`;
}
export function clippedCell(
  id: string,
  rect: Rect,
  svg: string,
  role = 'plot-segment',
): string {
  return `${cellClip(id, [rect])}<g data-role="${role}" clip-path="url(#${escapeXml(id)})">${svg}</g>`;
}
