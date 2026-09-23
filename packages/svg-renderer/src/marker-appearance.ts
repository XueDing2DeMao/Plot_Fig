import {
  MARKER_SHAPES,
  validateMarkerVertices,
  type MarkerStyle,
} from '@plot-fig/figure-schema';
import { escapeXml as esc, formatNumber as n } from './geometry.js';
import { renderMarker } from './plot-style.js';
import {
  validateCharacterGlyph,
  type CharacterGlyph,
} from './marker-detail-settings.js';
export const advancedMarkerShapes = MARKER_SHAPES;
export type AdvancedMarkerShape = MarkerStyle['shape'];
export type AdvancedMarker = MarkerStyle & {
  fillOnlyOpacity?: boolean;
  characterGlyph?: CharacterGlyph;
};
type Vertex = readonly [number, number];
const oldShapes = new Set([
  'circle',
  'square',
  'triangle',
  'diamond',
  'plus',
  'cross',
]);
export function validateMarkerAppearance(style: AdvancedMarker) {
  if (
    style.fillOnlyOpacity !== undefined &&
    typeof style.fillOnlyOpacity !== 'boolean'
  )
    throw new Error('仅填充透明度须为开关值');
  if (style.characterGlyph !== undefined)
    validateCharacterGlyph(style.characterGlyph);
  if (!advancedMarkerShapes.includes(style.shape))
    throw new Error('无效的符号形状');
  for (const [label, value, min, max] of [
    ['符号大小', style.sizePt, 0, Number.MAX_VALUE],
    ['符号边框宽度', style.strokeWidthPt, 0, Number.MAX_VALUE],
    ['符号旋转角度', style.rotationDeg ?? 0, -360, 360],
    ['符号不透明度', style.opacity ?? 1, 0, 1],
  ] as const)
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    )
      throw new Error(`${label}须为 ${min}–${max} 范围内的有限数值`);
  if (
    style.followLineOpacity !== undefined &&
    typeof style.followLineOpacity !== 'boolean'
  )
    throw new Error('跟随线条透明度须为开关值');
  if (style.shape === 'custom') validateMarkerVertices(style.customVertices);
  else if (style.customVertices !== undefined)
    throw new Error('仅自定义符号可设置顶点');
}

function polygonVertices(shape: AdvancedMarkerShape): Vertex[] {
  if (shape === 'triangle')
    return [
      [0, -1],
      [1, 1],
      [-1, 1],
    ];
  if (shape === 'triangle-down')
    return [
      [0, 1],
      [1, -1],
      [-1, -1],
    ];
  if (shape === 'triangle-left')
    return [
      [-1, 0],
      [1, -1],
      [1, 1],
    ];
  if (shape === 'triangle-right')
    return [
      [1, 0],
      [-1, -1],
      [-1, 1],
    ];
  if (shape === 'square')
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
  if (shape === 'diamond')
    return [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
  const sides =
    shape === 'star'
      ? 10
      : shape === 'pentagon'
        ? 5
        : shape === 'hexagon'
          ? 6
          : 8;
  return Array.from({ length: sides }, (_, i): Vertex => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / sides;
    const r = shape === 'star' && i % 2 ? 0.4 : 1;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
}

export function advancedMarkerRadius(style: AdvancedMarker) {
  validateMarkerAppearance(style);
  if (!style.visible || style.sizePt === 0) return 0;
  // 字符被限制在直径见方的局部视口内，包络包含轮廓笔画。
  if (style.characterGlyph)
    return (
      (Math.SQRT2 * style.sizePt) / 2 +
      (style.stroke === 'none' ? 0 : style.strokeWidthPt * 2)
    );
  const vertices =
    style.shape === 'custom'
      ? style.customVertices!
      : ['circle', 'plus', 'h-line', 'v-line'].includes(style.shape)
        ? [[1, 0] as Vertex]
        : style.shape === 'cross'
          ? [[1, 1] as Vertex]
          : polygonVertices(style.shape);
  // SVG 默认 miterlimit=4，圆形与开放短线使用实际半笔宽；圆包络不随旋转改变。
  const stroke = style.stroke === 'none' ? 0 : style.strokeWidthPt;
  const strokeRadius = ['circle', 'plus', 'cross', 'h-line', 'v-line'].includes(
    style.shape,
  )
    ? stroke / 2
    : stroke * 2;
  const radius =
    Math.max(...vertices.map((v) => Math.hypot(v[0]!, v[1]!))) *
      (style.sizePt / 2) +
    strokeRadius;
  if (!Number.isFinite(radius)) throw new Error('符号包络超过可绘制范围');
  return radius;
}

export function renderAdvancedMarker(
  point: { x: number; y: number },
  style: AdvancedMarker,
  lineOpacity?: number,
): string {
  return createMarkerRenderer(style, lineOpacity)(point);
}

// 一条曲线共享一次样式校验和几何准备，逐点只转换坐标。
export function createMarkerRenderer(
  input: AdvancedMarker,
  lineOpacity?: number,
) {
  const style = structuredClone(input);
  validateMarkerAppearance(style);
  const r = style.sizePt / 2;
  const vertices =
    style.shape === 'custom'
      ? style.customVertices!
      : polygonVertices(style.shape);
  let opacityAttribute = '';
  if (style.opacity !== undefined || style.followLineOpacity) {
    const opacity = style.followLineOpacity
      ? (lineOpacity ?? 1)
      : (style.opacity ?? 1);
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
      throw new Error('无效的线条不透明度');
    opacityAttribute = ` ${style.fillOnlyOpacity && !style.followLineOpacity ? 'fill-opacity' : 'opacity'}="${n(opacity)}"`;
  }
  return (point: { x: number; y: number }): string => {
    const { x, y } = point;
    if (![x, y, x + r, x - r, y + r, y - r].every(Number.isFinite))
      throw new Error('符号位置或尺寸超过可绘制范围');
    let svg: string;
    if (style.characterGlyph) {
      if (!style.visible || style.sizePt === 0) return '';
      const c = style.characterGlyph;
      const attrs = `fill="${esc(style.fill)}" stroke="${esc(style.stroke)}" stroke-width="${n(style.strokeWidthPt)}"`;
      const outline =
        c.outline === 'none'
          ? ''
          : c.outline === 'circle'
            ? `<circle data-role="character-outline" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="none" stroke="${esc(style.stroke)}" stroke-width="${n(style.strokeWidthPt)}"/>`
            : `<rect data-role="character-outline" x="${n(x - r)}" y="${n(y - r)}" width="${n(style.sizePt)}" height="${n(style.sizePt)}" fill="none" stroke="${esc(style.stroke)}" stroke-width="${n(style.strokeWidthPt)}"/>`;
      // 独立局部视口约束不同系统字体与多位行号的边界；不加载外部字体。
      svg = `<g data-role="marker">${outline}<svg x="${n(x - r)}" y="${n(y - r)}" width="${n(style.sizePt)}" height="${n(style.sizePt)}" viewBox="0 0 ${n(style.sizePt)} ${n(style.sizePt)}" overflow="hidden"><text data-role="character-glyph" x="${n(r)}" y="${n(r)}" text-anchor="middle" dominant-baseline="central" font-family="${esc(c.fontFamily)}" font-size="${n(style.sizePt * 0.8)}" textLength="${n(style.sizePt * 0.75)}" lengthAdjust="spacingAndGlyphs" ${attrs}>${esc(c.text)}</text></svg></g>`;
    } else if (oldShapes.has(style.shape))
      svg = renderMarker(point, style as MarkerStyle);
    else {
      const open = style.shape === 'h-line' || style.shape === 'v-line';
      const attrs = `data-role="marker" fill="${open ? 'none' : esc(style.fill)}" stroke="${esc(style.stroke)}" stroke-width="${n(style.strokeWidthPt)}"`;
      if (open) {
        const d =
          style.shape === 'h-line'
            ? `M${n(x - r)} ${n(y)}H${n(x + r)}`
            : `M${n(x)} ${n(y - r)}V${n(y + r)}`;
        svg = `<path ${attrs} d="${d}" />`;
      } else {
        const points = vertices
          .map(([vx, vy]) => `${n(x + vx! * r)},${n(y + vy! * r)}`)
          .join(' ');
        svg = `<polygon ${attrs} points="${points}" />`;
      }
    }
    let attrs = '';
    if (style.rotationDeg)
      attrs += ` transform="rotate(${n(-style.rotationDeg)} ${n(x)} ${n(y)})"`;
    attrs += opacityAttribute;
    return attrs
      ? svg.replace('data-role="marker"', `data-role="marker"${attrs}`)
      : svg;
  };
}
