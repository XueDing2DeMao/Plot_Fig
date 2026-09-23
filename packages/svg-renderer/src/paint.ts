import type { Paint, FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber as n } from './geometry.js';
import { sha256 } from './source-fingerprint.js';

function paintKey(paint: Paint): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(paint).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}
const ids = new Map<string, string>();
// 内容寻址的有界缓存；不同图的同名定义只有在样式完全相同时才复用。
function paintId(paint: Paint): string {
  const key = paintKey(paint);
  let id = ids.get(key);
  if (!id) {
    id = 'pf-paint-' + sha256(key);
    if (ids.size >= 256) ids.delete(ids.keys().next().value!);
    ids.set(key, id);
  }
  return id;
}
export function paintValue(paint: Paint | undefined, fallback: string): string {
  if (!paint) return escapeXml(fallback);
  if (paint.kind === 'none') return 'none';
  if (paint.kind === 'solid') return escapeXml(paint.color);
  return `url(#${paintId(paint)})`;
}
export function paintDefinitions(template: FigureTemplate): string {
  const paints = new Map<string, Paint>();
  const visit = (value: unknown, key = '') => {
    if (!value || typeof value !== 'object') return;
    if (
      ['paint', 'backgroundPaint', 'positivePaint', 'negativePaint'].includes(
        key,
      )
    ) {
      const paint = value as Paint;
      if (paint.kind === 'linear-gradient' || paint.kind === 'pattern')
        paints.set(paintId(paint), paint);
      return;
    }
    // 扩展内容不是正式填充，不能作为 SVG 定义执行。
    if (key === 'extensions') return;
    for (const [k, v] of Object.entries(value)) visit(v, k);
  };
  visit(template);
  if (!paints.size) return '';
  return (
    '<defs data-role="shared-paints">' +
    [...paints]
      .map(([id, p]) => {
        if (p.kind === 'linear-gradient') {
          const a = (p.angle * Math.PI) / 180,
            x = Math.cos(a) / 2,
            y = Math.sin(a) / 2;
          const stop = (color: string, offset: number) =>
            `<stop offset="${offset}" stop-color="${color === 'none' ? '#000000' : escapeXml(color)}"${color === 'none' ? ' stop-opacity="0"' : ''}/>`;
          return `<linearGradient id="${id}" x1="${n(0.5 - x)}" y1="${n(0.5 - y)}" x2="${n(0.5 + x)}" y2="${n(0.5 + y)}">${stop(p.startColor, 0)}${stop(p.endColor, 1)}</linearGradient>`;
        }
        if (p.kind !== 'pattern') return '';
        const s = p.spacingPt,
          width = Math.min(p.widthPt, s / 2),
          color = escapeXml(p.foreground);
        const marks =
          p.pattern === 'dots'
            ? `<circle cx="${n(s / 2)}" cy="${n(s / 2)}" r="${n(width)}" fill="${color}"/>`
            : `<path d="M${n(-s / 2)} ${n(s / 2)}L${n(s / 2)} ${n(-s / 2)} M0 ${n(s)}L${n(s)} 0 M${n(s / 2)} ${n(s * 1.5)}L${n(s * 1.5)} ${n(s / 2)}${p.pattern === 'cross' ? ` M0 0L${n(s)} ${n(s)}` : ''}" fill="none" stroke="${color}" stroke-width="${n(width)}"/>`;
        return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${n(s)}" height="${n(s)}"><rect width="${n(s)}" height="${n(s)}" fill="${escapeXml(p.background)}"/>${marks}</pattern>`;
      })
      .join('') +
    '</defs>'
  );
}
