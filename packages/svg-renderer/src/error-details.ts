import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PlotSlot, XyPlot, ErrorBarStyle } from '@plot-fig/figure-schema';
import {
  validateErrorDetails,
  type ErrorDetails,
  type ErrorDirectionDetails,
} from '@plot-fig/figure-schema';
import { point, type ChartContext } from './charts/chart-point.js';
import { rowLocation } from './charts/prepared.js';
import { escapeXml as esc, formatNumber as n } from './geometry.js';
import { xyLinePath } from './xy-line-path.js';
import type { SeriesRow } from './series-rows.js';
import type { RenderDiagnostic } from './types.js';
import type { CurveErrorTransform } from './curve-render-geometry.js';
import { clipDataPolygon, clipDataPolyline } from './data-clip.js';

type ErrorPlot = PlotSlot & { errorDetails?: ErrorDetails };
type Prefix = 'x' | 'y' | 'value';
type Pixel = { x: number; y: number };
type Resolved = {
  row: SeriesRow;
  base: number;
  low: number;
  high: number;
  center: Pixel;
  a: Pixel;
  b: Pixel;
};
const MAX_ROWS = 100000;

function sides(settings: ErrorDirectionDetails, base: number) {
  let direction = settings.direction ?? 'both';
  const positive = base >= (settings.baseline ?? 0);
  if (direction === 'away-baseline')
    direction = positive ? 'positive' : 'negative';
  if (direction === 'toward-baseline')
    direction = positive ? 'negative' : 'positive';
  return { lower: direction !== 'positive', upper: direction !== 'negative' };
}
function readValue(
  plot: PlotSlot,
  data: DataBindingSet,
  role: string,
  index: number,
) {
  const id = (plot.bindings as Record<string, string | undefined>)[role];
  const binding =
    id &&
    data.bindings.find((b) => b.dataSlotId === id && b.status === 'valid');
  const v =
    binding &&
    data.columns.find((c) => c.columnId === binding.columnId)?.values[index];
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function range(
  plot: ErrorPlot,
  data: DataBindingSet,
  p: { prefix: Prefix; index: number; base: number; offset?: number },
) {
  const settings = plot.errorDetails?.[p.prefix] ?? {},
    active = sides(settings, p.base);
  if (!Number.isFinite(p.base) || !Number.isInteger(p.index) || p.index < 0)
    return;
  const endpoint = settings.source === 'endpoints';
  const symmetric = endpoint
    ? undefined
    : readValue(plot, data, p.prefix + 'Error', p.index);
  let low = p.base,
    high = p.base;
  if (active.lower) {
    let v =
      symmetric ?? readValue(plot, data, p.prefix + 'ErrorLower', p.index);
    if (endpoint && v !== undefined) v += p.offset ?? 0;
    if (v === undefined || (endpoint ? v > p.base : v < 0)) return;
    low = endpoint ? v : p.base - v;
  }
  if (active.upper) {
    let v =
      symmetric ?? readValue(plot, data, p.prefix + 'ErrorUpper', p.index);
    if (endpoint && v !== undefined) v += p.offset ?? 0;
    if (v === undefined || (endpoint ? v < p.base : v < 0)) return;
    high = endpoint ? v : p.base + v;
  }
  return Number.isFinite(low) && Number.isFinite(high)
    ? ([low, high] as [number, number])
    : undefined;
}
/** 端点沿数据坐标定义；反向坐标轴只影响后续映射，不改变正负方向。 */
export function advancedErrorRange(
  plot: ErrorPlot,
  data: DataBindingSet,
  p: { prefix: Prefix; index: number; base: number },
): [number, number] | undefined {
  if (plot.errorDetails) validateErrorDetails(plot.errorDetails);
  return range(plot, data, p);
}
function selectedSegments(
  segments: Resolved[][],
  settings: ErrorDirectionDetails,
  displayed: Set<number>,
) {
  const sampling = settings.sampling ?? { mode: 'same' };
  if (sampling.mode === 'same')
    return segments.map((s) =>
      s.filter((p) => displayed.has(p.row.sourceIndex)),
    );
  if (sampling.mode === 'all') return segments;
  if (sampling.mode === 'every')
    return segments.map((s) => s.filter((_, i) => i % sampling.step === 0));
  if (sampling.mode !== 'count') return segments;
  const all = segments.flat(),
    count = Math.min(sampling.count, all.length),
    keep = new Set<number>();
  for (let i = 0; i < count; i++)
    keep.add(
      all[count === 1 ? 0 : Math.round((i * (all.length - 1)) / (count - 1))]!
        .row.sourceIndex,
    );
  return segments.map((s) => s.filter((p) => keep.has(p.row.sourceIndex)));
}
function domainRegions(
  plot: XyPlot,
  data: DataBindingSet,
  context: ChartContext,
  offset = { x: 0, y: 0 },
  transform?: CurveErrorTransform,
) {
  const column = (role: 'x' | 'y') => {
    const binding = data.bindings.find(
      (b) => b.dataSlotId === plot.bindings[role] && b.status === 'valid',
    );
    return (
      binding &&
      data.columns.find((c) => c.columnId === binding.columnId)?.values
    );
  };
  const x = column('x') ?? [],
    y = column('y') ?? [],
    result: number[] = [];
  let region = 0;
  // 上游缺失点策略可能已移除非法对数中心；原始区段身份避免排序/抽样后重新接带。
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const a = x[i],
      b = y[i];
    const mapping =
      typeof a === 'number' && typeof b === 'number' && transform
        ? transform({ x: a, y: b, sourceIndex: i })
        : undefined;
    const plottedX =
        typeof a === 'number' ? a + (mapping?.xOffset ?? offset.x) : NaN,
      plottedY =
        typeof b === 'number'
          ? mapping
            ? mapping.mapY(b)
            : b + offset.y
          : NaN;
    if (
      typeof a === 'number' &&
      Number.isFinite(a) &&
      typeof b === 'number' &&
      Number.isFinite(b) &&
      ((transform && !mapping) ||
        !Number.isFinite(context.xScale.map(plottedX)) ||
        !Number.isFinite(context.yScale.map(plottedY)))
    )
      region++;
    result.push(region);
  }
  return result;
}
function stroke(
  settings: ErrorDirectionDetails,
  style: ErrorBarStyle,
  color: string,
) {
  const patterns = {
    solid: '',
    dash: '6 3',
    dot: '1 3',
    'dash-dot': '6 3 1 3',
  };
  const dash = patterns[settings.dash ?? 'solid'];
  return `stroke="${esc(color)}" stroke-width="${n(style.widthPt)}" stroke-opacity="${n(settings.opacity ?? 1)}"${dash ? ` stroke-dasharray="${dash}"` : ''}`;
}
function bar(
  p: Resolved,
  horizontal: boolean,
  settings: ErrorDirectionDetails,
  style: ErrorBarStyle,
  attrs: string,
  radius: number,
  clip?: { min: number; max: number },
) {
  let svg = '';
  const line = (a: Pixel, b: Pixel, role: string) =>
    `<line data-role="${role}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" ${attrs} />`;
  const active = sides(settings, p.base),
    cap = style.capWidthPt / 2;
  const half = (end: Pixel, value: number) => {
    const dx = end.x - p.center.x,
      dy = end.y - p.center.y,
      length = Math.hypot(dx, dy);
    // 符号包络覆盖端点时连同端帽隐藏，避免误差短线穿过符号。
    if (length <= radius) return;
    const start = {
      x: p.center.x + (dx / length) * radius,
      y: p.center.y + (dy / length) * radius,
    };
    svg += line(start, end, 'error-bar');
    if (cap > 0 && (!clip || (value >= clip.min && value <= clip.max)))
      svg += line(
        {
          x: end.x - (horizontal ? 0 : cap),
          y: end.y - (horizontal ? cap : 0),
        },
        {
          x: end.x + (horizontal ? 0 : cap),
          y: end.y + (horizontal ? cap : 0),
        },
        'error-cap',
      );
  };
  if (active.lower) half(p.a, p.low);
  if (active.upper) half(p.b, p.high);
  return svg ? `<g data-source-index="${p.row.sourceIndex}">${svg}</g>` : '';
}
function connected(
  segment: Resolved[],
  direction: 'x' | 'y',
  settings: ErrorDirectionDetails,
  attrs: string,
  color: string,
  colors?: string[],
  style?: ErrorBarStyle,
  context?: ChartContext,
) {
  if (segment.length < 2) return '';
  if (context?.dataClip) {
    const lower = segment.map((p) =>
        direction === 'x' ? { x: p.low, y: p.row.y } : { x: p.row.x, y: p.low },
      ),
      upper = segment.map((p) =>
        direction === 'x'
          ? { x: p.high, y: p.row.y }
          : { x: p.row.x, y: p.high },
      );
    if (
      [...lower, ...upper].some(
        (p) =>
          !Number.isFinite(context.xScale.map(p.x)) ||
          !Number.isFinite(context.yScale.map(p.y)),
      )
    ) {
      const path = (ps: Pixel[]) =>
        ps
          .map((p, i) => {
            const q = point(context, p.x, p.y);
            return `${i ? 'L' : 'M'}${n(q.x)} ${n(q.y)}`;
          })
          .join(' ');
      const fill =
        settings.render === 'band'
          ? `<path data-role="error-band" d="${path(clipDataPolygon([...upper, ...lower.reverse()], context.dataClip))} Z" fill="${esc(settings.fill ?? color)}" fill-opacity="${n(settings.fillOpacity ?? 0.2)}"/>`
          : '';
      const lines = [lower, upper]
        .flatMap((ps) => clipDataPolyline(ps, context.dataClip!))
        .map(
          (ps) =>
            `<path data-role="error-boundary" d="${path(ps)}" fill="none" ${attrs}/>`,
        )
        .join('');
      return fill + lines;
    }
  }
  // 横向误差以 Y 为自变量；交换坐标使自然样条验证独立轴，再交换回画布。
  const transpose = direction === 'x',
    convert = (p: Pixel) => (transpose ? { x: p.y, y: p.x } : p);
  let connection = settings.connection ?? 'straight';
  if (transpose && connection === 'step-h') connection = 'step-v';
  else if (transpose && connection === 'step-v') connection = 'step-h';
  const lower = segment.map((p) => convert(p.a)),
    upper = segment.map((p) => convert(p.b));
  const upperPath = xyLinePath(upper, connection),
    lowerPath = xyLinePath(lower, connection);
  const reverseConnection =
    connection === 'step-h'
      ? 'step-v'
      : connection === 'step-v'
        ? 'step-h'
        : connection;
  const boundary = (d: string, side: 'lower' | 'upper') =>
    `<path data-role="error-boundary" data-error-side="${side}" d="${d}" fill="none" ${attrs} />`;
  let svg = '';
  const active = sides(settings, segment[0]!.base);
  if (colors && style) {
    // 完整样条只拟合一次；分色仅切分已生成的指令，避免改变控制点。
    const edgeCommands = (path: string) => {
      const commands = path.match(/[LHVC][^LHVC]*/g) ?? [];
      const step = connection === 'step-h' || connection === 'step-v' ? 2 : 1;
      return Array.from({ length: segment.length - 1 }, (_, i) =>
        commands
          .slice(i * step, (i + 1) * step)
          .join(' ')
          .trim(),
      );
    };
    const lowerCommands = edgeCommands(lowerPath),
      upperCommands = edgeCommands(upperPath),
      reverseCommands = edgeCommands(
        xyLinePath([...lower].reverse(), reverseConnection),
      );
    const position = (p: Pixel) => `${n(p.x)} ${n(p.y)}`;
    for (let i = 0; i < segment.length - 1; i++) {
      const upperPiece = `M${position(upper[i]!)} ${upperCommands[i]}`,
        lowerPiece = `M${position(lower[i]!)} ${lowerCommands[i]}`,
        edgeColor = colors[i]!,
        edgeAttrs = stroke(settings, style, edgeColor);
      if (settings.render === 'band')
        svg += `<path data-role="error-band" data-source-index="${segment[i]!.row.sourceIndex}" d="${upperPiece} L${position(lower[i + 1]!)} ${reverseCommands[segment.length - 2 - i]} Z" fill="${esc(settings.fill ?? edgeColor)}" fill-opacity="${n(settings.fillOpacity ?? 0.2)}" stroke="none" />`;
      if (settings.render === 'band' || active.lower)
        svg += `<path data-role="error-boundary" data-error-side="lower" data-source-index="${segment[i]!.row.sourceIndex}" d="${lowerPiece}" fill="none" ${edgeAttrs} />`;
      if (settings.render === 'band' || active.upper)
        svg += `<path data-role="error-boundary" data-error-side="upper" data-source-index="${segment[i]!.row.sourceIndex}" d="${upperPiece}" fill="none" ${edgeAttrs} />`;
    }
  } else if (settings.render === 'band') {
    const reverse = xyLinePath([...lower].reverse(), reverseConnection).replace(
      /^M/,
      'L',
    );
    svg = `<path data-role="error-band" d="${upperPath} ${reverse} Z" fill="${esc(settings.fill ?? color)}" fill-opacity="${n(settings.fillOpacity ?? 0.2)}" stroke="none" />`;
  }
  if (!colors && (settings.render === 'band' || active.lower))
    svg += boundary(lowerPath, 'lower');
  if (!colors && (settings.render === 'band' || active.upper))
    svg += boundary(upperPath, 'upper');
  return `<g data-source-indices="${segment.map((p) => p.row.sourceIndex).join(',')}"${transpose ? ' transform="matrix(0 1 1 0 0 0)"' : ''}>${svg}</g>`;
}
export function renderAdvancedErrors(
  plot: XyPlot & { errorDetails?: ErrorDetails },
  data: DataBindingSet,
  options: {
    context: ChartContext;
    segments: SeriesRow[][];
    allSegments?: SeriesRow[][];
    markerRadius?: (row: SeriesRow) => number;
    offset?: { x: number; y: number };
    lineColorForRow?: (row: SeriesRow) => string;
    sourceRows?: SeriesRow[];
    errorTransform?: CurveErrorTransform;
  },
): { svg: string; diagnostics: RenderDiagnostic[] } {
  const diagnostics: RenderDiagnostic[] = [];
  let svg = '';
  if (!plot.errorBarStyle?.visible) return { svg, diagnostics };
  if (plot.errorDetails) validateErrorDetails(plot.errorDetails);
  const allSegments = options.allSegments ?? options.segments;
  if (
    allSegments.reduce((n, s) => n + s.length, 0) > MAX_ROWS ||
    (options.sourceRows?.length ?? 0) > MAX_ROWS
  )
    throw new Error('高级误差最多支持十万数据行');
  const sourceRows = options.sourceRows
    ? new Map(options.sourceRows.map((row) => [row.sourceIndex, row]))
    : undefined;
  const displayed = new Set(
    options.segments.flat().map((row) => row.sourceIndex),
  );
  if (
    options.offset &&
    ![options.offset.x, options.offset.y].every(Number.isFinite)
  )
    throw new Error('误差偏移须为有限数值');
  const regions = domainRegions(
    plot,
    data,
    options.context,
    options.offset,
    options.errorTransform,
  );
  for (const direction of ['x', 'y'] as const) {
    const binding =
      plot.bindings[`${direction}Error`] ??
      plot.bindings[`${direction}ErrorLower`] ??
      plot.bindings[`${direction}ErrorUpper`];
    if (!binding) continue;
    const settings = plot.errorDetails?.[direction] ?? {},
      valid: Resolved[][] = [];
    for (const rows of allSegments) {
      let part: Resolved[] = [];
      for (const row of rows) {
        const raw = sourceRows?.get(row.sourceIndex) ?? row,
          base = options.errorTransform ? raw[direction] : row[direction];
        if (
          part.length &&
          (regions[part.at(-1)!.row.sourceIndex] !== regions[row.sourceIndex] ||
            (settings.render === 'lines' &&
              sides(settings, part.at(-1)!.base).lower !==
                sides(settings, base).lower))
        ) {
          valid.push(part);
          part = [];
        }
        let bounds = range(plot, data, {
          prefix: direction,
          index: row.sourceIndex,
          base,
          ...(!options.errorTransform && options.offset
            ? { offset: options.offset[direction] }
            : {}),
        });
        if (options.errorTransform) {
          const transform = options.errorTransform(raw);
          bounds =
            transform && bounds
              ? (bounds.map((value) =>
                  direction === 'x'
                    ? value + transform.xOffset
                    : transform.mapY(value),
                ) as [number, number])
              : undefined;
        }
        const legal =
          bounds &&
          [row.x, row.y, ...bounds].every(Number.isFinite) &&
          (options.context.dataClip ||
            (Number.isFinite(options.context.xScale.map(row.x)) &&
              Number.isFinite(options.context.yScale.map(row.y)) &&
              bounds.every((v) =>
                Number.isFinite(
                  (direction === 'x'
                    ? options.context.xScale
                    : options.context.yScale
                  ).map(v),
                ),
              )));
        if (!legal || !bounds) {
          if (part.length) valid.push(part);
          part = [];
          diagnostics.push({
            code: 'RENDER_DATA_INVALID',
            severity: 'warning',
            sourcePath: `/plotSlots/${plot.plotSlotId}/bindings/${direction}Error/rows/${row.sourceIndex}`,
            message: `${rowLocation(data, binding, row.sourceIndex)}：无效端点、幅值或不适用于坐标轴的 ${direction.toUpperCase()} 误差已跳过`,
          });
          continue;
        }
        const clip = options.context.dataClip;
        if (clip && settings.render !== 'lines' && settings.render !== 'band') {
          const other = direction === 'x' ? row.y : row.x,
            low = direction === 'x' ? clip.xMin : clip.yMin,
            high = direction === 'x' ? clip.xMax : clip.yMax;
          if (
            other < (direction === 'x' ? clip.yMin : clip.xMin) ||
            other > (direction === 'x' ? clip.yMax : clip.xMax) ||
            bounds[1] < low ||
            bounds[0] > high
          )
            continue;
        }
        const pixel = (v: number) =>
          direction === 'x'
            ? point(options.context, v, row.y)
            : point(options.context, row.x, v);
        part.push({
          row,
          base,
          low: bounds[0],
          high: bounds[1],
          center: point(options.context, row.x, row.y),
          a: pixel(bounds[0]),
          b: pixel(bounds[1]),
        });
      }
      if (part.length) valid.push(part);
    }
    if (
      settings.connection === 'spline' &&
      (settings.render === 'lines' || settings.render === 'band')
    )
      for (const segment of valid)
        for (const endpoint of ['a', 'b'] as const)
          xyLinePath(
            segment.map((p) =>
              direction === 'x'
                ? { x: p[endpoint].y, y: p[endpoint].x }
                : p[endpoint],
            ),
            'spline',
          );
    const color = settings.followColor
      ? (plot.lineStyle?.color ??
        plot.markerStyle?.stroke ??
        plot.errorBarStyle.color)
      : plot.errorBarStyle.color;
    const attrs = stroke(settings, plot.errorBarStyle, color);
    let content = '';
    for (const segment of selectedSegments(valid, settings, displayed)) {
      if (settings.render === 'lines' || settings.render === 'band')
        content += connected(
          segment,
          direction,
          settings,
          attrs,
          color,
          settings.followColor && options.lineColorForRow
            ? segment.map((p) => options.lineColorForRow!(p.row))
            : undefined,
          plot.errorBarStyle,
          options.context,
        );
      else
        for (const p of segment) {
          const radius = settings.avoidSymbols
            ? (options.markerRadius?.(p.row) ?? 0)
            : 0;
          if (!Number.isFinite(radius) || radius < 0 || radius > 1000000)
            throw new Error('误差符号包络必须为 0–1000000 pt 的有限数值');
          content += bar(
            p,
            direction === 'x',
            settings,
            plot.errorBarStyle,
            settings.followColor && options.lineColorForRow
              ? stroke(
                  settings,
                  plot.errorBarStyle,
                  options.lineColorForRow(p.row),
                )
              : attrs,
            radius,
            options.context.dataClip
              ? {
                  min:
                    direction === 'x'
                      ? options.context.dataClip.xMin
                      : options.context.dataClip.yMin,
                  max:
                    direction === 'x'
                      ? options.context.dataClip.xMax
                      : options.context.dataClip.yMax,
                }
              : undefined,
          );
        }
    }
    svg += `<g data-role="advanced-errors" data-direction="${direction}">${content}</g>`;
    if (svg.length > 32_000_000)
      throw new Error('高级误差图形超出输出预算，请增加抽样间隔');
  }
  return { svg, diagnostics };
}
