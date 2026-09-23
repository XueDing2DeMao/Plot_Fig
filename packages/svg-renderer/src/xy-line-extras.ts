import type { LineStyle, MarkerStyle, XyPlot } from '@plot-fig/figure-schema';
import type { CurveArrows, DropLine } from '@plot-fig/figure-schema';
export type { CurveArrows, DropLine } from '@plot-fig/figure-schema';
import { formatNumber as n, escapeXml as esc, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';
import { xyLinePath, type XyLineConnection } from './xy-line-path.js';
import { lineAppearanceAttributes } from './line-appearance.js';
import { lineDash } from './plot-style.js';
import {
  advancedMarkerRadius,
  type AdvancedMarker,
} from './marker-appearance.js';
import {
  lineMetrics,
  piece,
  visibleLinePieces,
  pointAtLength,
  type LinePoint,
  type LineMetrics,
  type LinePiece,
} from './xy-line-metrics.js';

export type XyLineExtras = Pick<
  XyPlot,
  'closeLine' | 'symbolGapPct' | 'lineArrows' | 'dropLines'
>;
function bounded(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${label}须为 ${min}–${max} 范围内的有限数值`);
}
export function validateLineExtras(extras: XyLineExtras) {
  if (extras.closeLine !== undefined && typeof extras.closeLine !== 'boolean')
    throw new Error('首尾连接须为开关值');
  if (extras.symbolGapPct !== undefined)
    bounded(extras.symbolGapPct, 0, 256, '符号间隙 (%)');
  if (extras.lineArrows) {
    const a = extras.lineArrows;
    if (!['start', 'end', 'both', 'repeat'].includes(a.position))
      throw new Error('无效的曲线箭头位置');
    bounded(a.lengthPt, 1, 100, '箭头长度 (pt)');
    bounded(a.angleDeg, 10, 120, '箭头角度');
    if (a.spacingFactor !== undefined)
      bounded(a.spacingFactor, 1, 100, '箭头间距倍数');
    if (a.curveTolerance !== undefined)
      bounded(a.curveTolerance, 1, 10, '箭头弯曲容忍');
    if (a.color !== undefined && !a.color.trim())
      throw new Error('箭头颜色不能为空');
  }
  for (const drop of Object.values(extras.dropLines ?? {})) {
    if (
      !drop?.target ||
      !['axis-min', 'axis-max', 'value', 'next-curve'].includes(
        drop.target.mode,
      )
    )
      throw new Error('无效的垂线目标');
    if (drop.target.mode === 'value' && !Number.isFinite(drop.target.value))
      throw new Error('垂线目标须为完整有限数值');
    if (
      drop.selection &&
      (drop.selection.mode !== 'values' ||
        !drop.selection.values.length ||
        drop.selection.values.length > 2000 ||
        drop.selection.values.some((v) => !Number.isFinite(v)) ||
        new Set(drop.selection.values).size !== drop.selection.values.length)
    )
      throw new Error('垂线插值位置须为不重复的有限数值，最多两千个');
    if (drop.style) {
      bounded(drop.style.widthPt, 0, 100, '垂线宽度 (pt)');
      if (
        !drop.style.color.trim() ||
        !['solid', 'dashed', 'dotted', 'dash-dot'].includes(drop.style.dash)
      )
        throw new Error('无效的垂线样式');
    }
  }
}
function strokePath(d: string, line: LineStyle, from = 0) {
  let appearance = lineAppearanceAttributes(line);
  if (from && (line.customDash || line.dash !== 'solid')) {
    appearance = appearance.replace(/ stroke-dashoffset="[^"]*"/, '');
    appearance += ` stroke-dashoffset="${n((line.customDash?.offsetPt ?? 0) + from)}"`;
  }
  return `<path d="${d}" fill="none" stroke="${esc(line.color)}" stroke-width="${n(line.widthPt)}"${appearance} />`;
}
function arrowSvg(
  metrics: LineMetrics,
  pieces: LinePiece[],
  style: CurveArrows,
  line: LineStyle,
  colorAt?: (at: number) => string,
) {
  if (!pieces.length) return '';
  const from = pieces[0]!.from,
    to = pieces.at(-1)!.to;
  const positions: Array<{ at: number; backwards: boolean }> = [];
  if (style.position === 'start' || style.position === 'both')
    positions.push({ at: from, backwards: true });
  if (style.position === 'end' || style.position === 'both')
    positions.push({ at: to, backwards: false });
  if (style.position === 'repeat') {
    const spacing = style.lengthPt * (style.spacingFactor ?? 5),
      count = Math.floor(metrics.length / spacing);
    if (count > 2000)
      throw new Error('曲线箭头数量超过 2000 个上限，请增大间距');
    for (let i = 1; i <= count; i++)
      positions.push({ at: i * spacing, backwards: false });
    if (positions.length && metrics.length - positions.at(-1)!.at < spacing / 2)
      positions.at(-1)!.at = to;
    else positions.push({ at: to, backwards: false });
    if (positions.length > 2000)
      throw new Error('曲线箭头数量超过 2000 个上限，请增大间距');
  }
  return positions
    .map(({ at, backwards }) => {
      const interval = pieces.find(
        (p) => at >= p.from - 1e-8 && at <= p.to + 1e-8,
      );
      if (!interval) return '';
      const baseAt = at + (backwards ? style.lengthPt : -style.lengthPt);
      if (baseAt < interval.from - 1e-8 || baseAt > interval.to + 1e-8)
        return '';
      const tip = pointAtLength(metrics, at)!,
        base = pointAtLength(metrics, baseAt)!;
      const chord = Math.hypot(
        tip.point.x - base.point.x,
        tip.point.y - base.point.y,
      );
      if (
        !chord ||
        style.lengthPt / chord > (style.curveTolerance ?? 1.5) + 1e-8
      )
        return '';
      const length = Math.hypot(tip.tangent.x, tip.tangent.y);
      if (!length) return '';
      const direction = backwards ? -1 : 1,
        ux = (direction * tip.tangent.x) / length,
        uy = (direction * tip.tangent.y) / length;
      const half = style.lengthPt * Math.tan((style.angleDeg * Math.PI) / 360);
      const x = tip.point.x - style.lengthPt * ux,
        y = tip.point.y - style.lengthPt * uy;
      const polygon = [
        tip.point,
        { x: x - half * uy, y: y + half * ux },
        { x: x + half * uy, y: y - half * ux },
      ];
      return `<polygon data-role="curve-arrow" points="${polygon.map((p) => `${n(p.x)},${n(p.y)}`).join(' ')}" fill="${esc(style.color ?? colorAt?.(at) ?? line.color)}"${line.opacity === undefined ? '' : ` fill-opacity="${n(line.opacity)}"`} />`;
    })
    .join('');
}
export function lineSymbolGapRadius(
  line: LineStyle,
  marker: AdvancedMarker | undefined,
  gap: number,
): number {
  if (!gap || !marker?.visible || marker.sizePt <= 0) return 0;
  if (
    marker.characterGlyph ||
    marker.rotationDeg ||
    !['circle', 'square', 'triangle', 'diamond', 'plus', 'cross'].includes(
      marker.shape,
    )
  )
    return (
      advancedMarkerRadius(marker) +
      (marker.sizePt * gap) / 100 +
      line.widthPt * Math.SQRT1_2 +
      0.02
    );
  const borderFactor =
    marker.shape === 'triangle'
      ? Math.sqrt(5) / 2
      : ['square', 'diamond'].includes(marker.shape)
        ? Math.SQRT1_2
        : 0.5;
  return (
    marker.sizePt *
      ((['square', 'triangle', 'cross'].includes(marker.shape)
        ? Math.SQRT2
        : 1) /
        2 +
        gap / 100) +
    marker.strokeWidthPt * borderFactor +
    line.widthPt * Math.SQRT1_2 +
    0.02
  );
}
export function renderLineExtras({
  points,
  symbols = points,
  connection,
  line,
  marker,
  symbolStyles,
  lineColors,
  lineStyles,
  extras,
}: {
  points: readonly LinePoint[];
  symbols?: readonly LinePoint[];
  connection: XyLineConnection;
  line: LineStyle;
  marker?: MarkerStyle;
  symbolStyles?: readonly MarkerStyle[];
  lineColors?: readonly string[];
  lineStyles?: readonly LineStyle[];
  extras: XyLineExtras;
}): string {
  validateLineExtras(extras);
  if (!line.visible) return '';
  if (symbolStyles && symbolStyles.length !== symbols.length)
    throw new Error('符号样式数量与坐标不一致');
  const gap = (
    symbolStyles
      ? symbolStyles.some((s) => s.visible && s.sizePt > 0)
      : marker?.visible && marker.sizePt > 0
  )
    ? (extras.symbolGapPct ?? 0)
    : 0;
  if (!gap && !extras.lineArrows && !lineColors && !lineStyles) {
    const d =
      xyLinePath(points, connection) +
      (extras.closeLine && points.length > 1 ? ' Z' : '');
    return d ? strokePath(d, line) : '';
  }
  const metrics = lineMetrics(points, connection, extras.closeLine ?? false);
  // 外接圆保护非圆符号锐角；描边和细分误差加到裁剪边界，避免端帽伸回符号内。
  const radius = symbolStyles
    ? symbolStyles.map((s) => lineSymbolGapRadius(line, s, gap))
    : lineSymbolGapRadius(line, marker, gap);
  const pieces = visibleLinePieces(metrics, symbols, radius);
  let paths = '';
  if (lineColors || lineStyles) {
    if (
      (lineColors && lineColors.length !== points.length) ||
      (lineStyles && lineStyles.length !== points.length)
    )
      throw new Error('线条样式数量与原行不一致');
    let cursor = 0;
    for (const segment of metrics.segments) {
      while (cursor < pieces.length && pieces[cursor]!.to <= segment.from)
        cursor++;
      for (
        let i = cursor;
        i < pieces.length && pieces[i]!.from < segment.to;
        i++
      ) {
        const from = Math.max(pieces[i]!.from, segment.from),
          to = Math.min(pieces[i]!.to, segment.to);
        if (to > from)
          paths += strokePath(
            piece(metrics, from, to).d,
            {
              ...(lineStyles?.[segment.sourceEdge] ?? line),
              ...(lineColors ? { color: lineColors[segment.sourceEdge]! } : {}),
            },
            from,
          );
      }
    }
  } else paths = pieces.map((p) => strokePath(p.d, line, p.from)).join('');
  const colorAt = lineColors
    ? (at: number) => {
        let lo = 0,
          hi = metrics.segments.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (metrics.segments[mid]!.to < at) lo = mid + 1;
          else hi = mid;
        }
        return lineColors[metrics.segments[lo]?.sourceEdge ?? 0] ?? line.color;
      }
    : undefined;
  return (
    paths +
    (extras.lineArrows
      ? arrowSvg(metrics, pieces, extras.lineArrows, line, colorAt)
      : '')
  );
}
export function renderDropLines(
  points: readonly (LinePoint & { sourceIndex: number })[],
  context: { rect: Rect; xScale: PlotScale; yScale: PlotScale },
  drops: NonNullable<XyLineExtras['dropLines']>,
  color: string,
): string {
  validateLineExtras({ dropLines: drops });
  if (points.length > 100_000) throw new Error('垂线原始点数量超过十万上限');
  const parts: string[] = [];
  for (const direction of ['horizontal', 'vertical'] as const) {
    const drop = drops[direction];
    if (!drop) continue;
    if (drop.target.mode === 'next-curve' || drop.selection)
      throw new Error('高级垂线需要曲线数据上下文');
    const horizontal = direction === 'horizontal',
      scale = horizontal ? context.xScale : context.yScale;
    const value =
      drop.target.mode === 'value'
        ? drop.target.value
        : drop.target.mode === 'axis-min'
          ? scale.min
          : scale.max;
    if (
      scale.scale !== 'linear' &&
      scale.scale !== 'category' &&
      !scale.numeric?.capability.spec.symLog &&
      value <= 0
    )
      throw new Error('对数轴垂线目标必须大于零');
    const ratio = scale.map(value),
      target = horizontal
        ? context.rect.x + ratio * context.rect.width
        : context.rect.y + (1 - ratio) * context.rect.height;
    if (!Number.isFinite(target))
      throw new Error('垂线目标超出有限绘图坐标范围');
    const style = drop.style ?? { color, widthPt: 0.75, dash: 'solid' };
    for (const p of points) {
      if (![p.x, p.y, p.sourceIndex].every(Number.isFinite))
        throw new Error('垂线原始点坐标或行号无效');
      parts.push(
        `<line data-role="drop-line-${direction}" data-source-index="${p.sourceIndex}" x1="${n(p.x)}" y1="${n(p.y)}" x2="${n(horizontal ? target : p.x)}" y2="${n(horizontal ? p.y : target)}" stroke="${esc(style.color)}" stroke-width="${n(style.widthPt)}"${lineDash(style.dash)} />`,
      );
    }
  }
  return parts.join('');
}
