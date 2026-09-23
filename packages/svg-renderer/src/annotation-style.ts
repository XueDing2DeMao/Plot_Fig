import { paintValue } from './paint.js';
import {
  defaultShapeStyle,
  defaultTextStyle,
  type TextContentFormat,
  type TextStyle,
  type ShapeStyle,
} from '@plot-fig/figure-schema';
import { escapeXml as esc, formatNumber as n } from './geometry.js';
import { lineAttributes } from './charts/svg-marks.js';
import { layoutText } from './text/layout.js';
import { renderText } from './text/render.js';
import { typesetMath } from './text/mathjax-adapter.js';
type Point = { x: number; y: number };
export function textAttributes(style?: TextStyle): string {
  if (!style) return '';
  return `font-family="${esc(style.fontFamily)}" font-size="${n(style.fontSizePt)}" fill="${esc(style.color)}" font-weight="${style.bold ? 'bold' : 'normal'}" font-style="${style.italic ? 'italic' : 'normal'}" text-anchor="${style.anchor}"`;
}
export function annotationText(
  text: string,
  point: Point,
  style?: TextStyle,
  format: TextContentFormat = 'auto',
  sourceId = 'annotation',
) {
  // 旧 plain 注释保留主题继承与原始 SVG，显式布局和富文本使用通用排版。
  if (format === 'plain' && !style?.layout) {
    const rotation = style?.rotation ?? 0;
    const lines = text.split('\n');
    const size = style?.fontSizePt ?? defaultTextStyle().fontSizePt;
    const content =
      lines.length === 1
        ? esc(text)
        : lines
            .map(
              (s, i) =>
                `<tspan x="${n(point.x)}" dy="${i === 0 ? 0 : n(size * 1.2)}">${esc(s)}</tspan>`,
            )
            .join('');
    return `<text data-role="annotation-text" x="${n(point.x)}" y="${n(point.y)}" ${textAttributes(style)} transform="rotate(${n(rotation)} ${n(point.x)} ${n(point.y)})">${content}</text>`;
  }
  const resolved = style ?? defaultTextStyle();
  return renderText(
    layoutText(
      text,
      {
        fontFamily: resolved.fontFamily,
        fontSizePt: resolved.fontSizePt,
        color: resolved.color,
        bold: resolved.bold,
        italic: resolved.italic,
      },
      {
        x: point.x,
        y: point.y,
        anchor: resolved.anchor,
        align:
          resolved.anchor === 'middle'
            ? 'center'
            : resolved.anchor === 'end'
              ? 'right'
              : 'left',
        rotation: resolved.rotation,
        format,
        ...resolved.layout,
        sourcePath: '/annotations/text',
      },
      format === 'plain'
        ? undefined
        : {
            measureMath: (source, font) =>
              typesetMath(source, font.fontSizePt, sourceId),
          },
    ),
    'annotation-text',
  );
}
function arrowHead(start: Point, end: Point, style: ShapeStyle) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x),
    size = style.arrowSizePt;
  const a = {
    x: end.x - size * Math.cos(angle) + size * 0.4 * Math.sin(angle),
    y: end.y - size * Math.sin(angle) - size * 0.4 * Math.cos(angle),
  };
  const b = {
    x: end.x - size * Math.cos(angle) - size * 0.4 * Math.sin(angle),
    y: end.y - size * Math.sin(angle) + size * 0.4 * Math.cos(angle),
  };
  return `<polygon data-role="arrow-head" points="${n(end.x)},${n(end.y)} ${n(a.x)},${n(a.y)} ${n(b.x)},${n(b.y)}" fill="${esc(style.line.color)}" />`;
}
export function annotationSegment(
  kind: 'arrow' | 'rectangle' | 'reference-line',
  points: { start: Point; end: Point },
  input?: ShapeStyle,
) {
  const style = input ?? defaultShapeStyle(),
    { start: a, end: b } = points;
  if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return '';
  const attrs = lineAttributes(style.line);
  let svg =
    kind === 'rectangle'
      ? `<rect data-role="annotation-rectangle" x="${n(Math.min(a.x, b.x))}" y="${n(Math.min(a.y, b.y))}" width="${n(Math.abs(b.x - a.x))}" height="${n(Math.abs(b.y - a.y))}" fill="${paintValue(style.paint, style.fill)}" ${attrs} />`
      : `<line data-role="annotation-${kind}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" ${attrs} />`;
  if (kind === 'arrow' && style.line.visible && style.arrowHead !== 'none')
    svg += arrowHead(a, b, style);
  if (kind === 'arrow' && style.line.visible && style.arrowHead === 'both')
    svg += arrowHead(b, a, style);
  return `<g opacity="${n(style.opacity)}">${svg}</g>`;
}
