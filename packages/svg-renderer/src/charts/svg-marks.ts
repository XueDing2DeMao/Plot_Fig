import { paintValue } from '../paint.js';
import type { FillStyle, LineStyle } from '@plot-fig/figure-schema';
import { renderBarError } from './bar-errors.js';
import { escapeXml as esc, formatNumber as n, type Rect } from '../geometry.js';
import { lineAppearanceAttributes } from '../line-appearance.js';
import type { PlotScale } from '../scales.js';
import type { BarMark, PreparedPlot } from './prepared.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { RenderDiagnostic } from '../types.js';
import { renderChartDataLabels } from '../chart-data-labels.js';
import { renderMarker } from '../plot-style.js';
import { normalQuantile, quantile } from './box-statistics.js';

import { point, type ChartContext } from './chart-point.js';
import { clipDataPolygon, clipDataPolyline } from '../data-clip.js';
export { point, type ChartContext } from './chart-point.js';
export function fillAttributes(fill: FillStyle): string {
  return `fill="${paintValue(fill.paint, fill.color)}" fill-opacity="${n(fill.opacity)}" stroke="${esc(fill.borderColor)}" stroke-width="${n(fill.borderWidthPt)}"`;
}
export function lineAttributes(line: LineStyle): string {
  return `stroke="${line.visible ? esc(line.color) : 'none'}" stroke-width="${n(line.widthPt)}"${lineAppearanceAttributes(line)}`;
}
export function rectangle(
  context: ChartContext,
  options: {
    role: string;
    range: { x1: number; x2: number; y1: number; y2: number };
    style: string;
  },
): string {
  const { role, range, style } = options;
  if (context.dataClip) {
    const c = context.dataClip;
    if (
      Math.max(range.x1, range.x2) < c.xMin ||
      Math.min(range.x1, range.x2) > c.xMax ||
      Math.max(range.y1, range.y2) < c.yMin ||
      Math.min(range.y1, range.y2) > c.yMax
    )
      return '';
  }
  const a = point(context, range.x1, range.y1),
    b = point(context, range.x2, range.y2);
  return `<rect data-role="${role}" x="${n(Math.min(a.x, b.x))}" y="${n(Math.min(a.y, b.y))}" width="${n(Math.abs(b.x - a.x))}" height="${n(Math.abs(b.y - a.y))}" ${style} />`;
}
function bandRange(
  item: PreparedPlot,
  context: ChartContext,
  key: string,
  bar?: BarMark,
): [number, number] {
  const plot = item.plot;
  if (plot.kind !== 'bar' && plot.kind !== 'box')
    throw new Error('分类带图表无效');
  const scale =
    plot.orientation === 'vertical' ? context.xScale : context.yScale;
  const index = scale.categories?.findIndex((c) => c.key === key) ?? -1;
  const width = plot.width,
    gap = plot.kind === 'bar' ? plot.gap : 0.1;
  const overlap = plot.kind === 'bar' ? (plot.overlap ?? 0) : 0,
    count = bar?.bandCount ?? item.bandCount,
    band = bar?.bandIndex ?? item.bandIndex,
    unit = width / Math.max(1, count - overlap * (count - 1)),
    center = index - width / 2 + unit * (band + 0.5),
    low = center - (unit * (1 - gap)) / 2,
    high = center + (unit * (1 - gap)) / 2;
  return bar?.bandSlice
    ? [
        low + ((high - low) * bar.bandSlice.index) / bar.bandSlice.count,
        low + ((high - low) * (bar.bandSlice.index + 1)) / bar.bandSlice.count,
      ]
    : [low, high];
}
type ChartLabelOptions = {
  data: DataBindingSet;
  diagnostics: RenderDiagnostic[];
};

function barFillAttributes(
  item: PreparedPlot,
  context: ChartContext,
  options: { low: number; high: number; style: FillStyle },
): string {
  const { low, high, style } = options;
  const plot = item.plot;
  if (plot.kind !== 'bar') return fillAttributes(style);
  const horizontal = plot.orientation === 'horizontal';
  const scale = horizontal ? context.yScale : context.xScale;
  const length = horizontal ? context.rect.height : context.rect.width;
  const width = Math.abs(scale.map(high) - scale.map(low)) * length;
  if (width >= style.borderWidthPt * 2) return fillAttributes(style);
  const overlap = plot.overlap ?? 0;
  const unit =
    plot.width / Math.max(1, item.bandCount - overlap * (item.bandCount - 1));
  const spacing = item.bandCount > 1 ? unit * (1 - overlap) : 1;
  const gap = Math.max(
    0,
    Math.abs(scale.map(low + spacing) - scale.map(low)) * length - width,
  );
  // 密集窄柱的边框不能盖住填充或侵占相邻柱；数据位置与宽度保持原值。
  return fillAttributes({
    ...style,
    borderWidthPt: Math.min(style.borderWidthPt, width / 2, gap),
  });
}

export function renderBars(
  item: PreparedPlot,
  context: ChartContext,
  options?: ChartLabelOptions,
): string {
  const plot = item.plot;
  if (plot.kind !== 'bar' && plot.kind !== 'histogram') return '';
  const entries = item.layerStackBarsManaged
    ? (item.layerStackBarMarks ?? [])
    : item.bars.map((bar) => ({ item, bar }));
  const marks = entries
    .map(({ item: source, bar }) => {
      const current = { ...item, ...source };
      const plot = source.plot;
      if (plot.kind !== 'bar' && plot.kind !== 'histogram') return '';
      let [low, high] = bar.category
        ? bandRange(current, context, bar.category, bar)
        : [bar.low, bar.high];
      if (plot.kind === 'histogram' && plot.gap) {
        const inset = ((high - low) * plot.gap) / 2;
        low += inset;
        high -= inset;
      }
      const range =
        plot.kind === 'bar' && plot.orientation === 'horizontal'
          ? { x1: bar.start, x2: bar.end, y1: low, y2: high }
          : { x1: low, x2: high, y1: bar.start, y2: bar.end };
      const error =
        plot.kind === 'bar' && plot.errorBarStyle?.visible && bar.error
          ? renderBarError(
              context,
              {
                center: (low + high) / 2,
                bounds: bar.error,
                horizontal: plot.orientation === 'horizontal',
              },
              plot.errorBarStyle,
              {
                ...(plot.errorDetails?.value
                  ? { details: plot.errorDetails.value }
                  : {}),
                base: bar.end,
                followColor: plot.fillStyle.color,
              },
            )
          : '';
      const style =
        plot.kind === 'bar'
          ? bar.end - bar.start < 0
            ? (plot.options?.negative ?? plot.fillStyle)
            : (plot.options?.positive ?? plot.fillStyle)
          : plot.fillStyle;
      const mark =
        rectangle(context, {
          role: plot.kind === 'bar' ? 'bar' : 'histogram-bin',
          range: range,
          style: barFillAttributes(current, context, { low, high, style }),
        }) + error;
      return item.layerStackBarsManaged
        ? `<g data-stack-member="${esc(plot.plotSlotId)}" data-plot-slot-id="${esc(plot.plotSlotId)}">${mark}</g>`
        : mark;
    })
    .join('');
  const distribution =
    plot.kind === 'histogram' && item.distributions?.[0]
      ? renderDistributionCurve(
          item.distributions[0].points,
          context,
          plot.fillStyle.borderColor,
        )
      : '';
  const statistics =
    plot.kind === 'histogram' && item.statistics
      ? `<text data-role="histogram-statistics" x="${n(context.rect.x + 6)}" y="${n(context.rect.y + 12)}" font-size="9">${esc(`N=${item.statistics.count}  Mean=${n(item.statistics.mean)}  SD=${n(item.statistics.sd)}  Min=${n(item.statistics.min)}  Max=${n(item.statistics.max)}`)}</text>`
      : '';
  const stackDecorations = renderBarStackDecorations(item, context);
  if (!options || plot.kind !== 'bar')
    return marks + distribution + statistics + stackDecorations;
  const labels = renderChartDataLabels(item, options.data, context);
  options.diagnostics.push(...labels.diagnostics);
  return marks + distribution + labels.svg + stackDecorations;
}

function renderBarStackDecorations(
  item: PreparedPlot,
  context: ChartContext,
): string {
  const plot = item.plot;
  if (plot.kind !== 'bar') return '';
  if (!item.layerStackBarConnectors && !item.layerStackBarTotals) return '';
  const horizontal = plot.orientation === 'horizontal';
  const dataPoint = (category: number, value: number) =>
    horizontal ? { x: value, y: category } : { x: category, y: value };
  const categoryOrder = (horizontal ? context.yScale : context.xScale)
    .categories;
  const bars = new Map(item.bars.map((bar) => [bar.category, bar]));
  const pairs =
    item.layerStackBarConnectors && categoryOrder
      ? categoryOrder.slice(1).flatMap((category, index) => {
          const from = bars.get(categoryOrder[index]!.key),
            to = bars.get(category.key);
          return from && to ? [{ from, to }] : [];
        })
      : (item.layerStackBarConnectors ?? []);
  const connectors = pairs
    .map(({ from, to }) => {
      const a = bandRange(item, context, from.category!, from),
        b = bandRange(item, context, to.category!, to),
        forward = a[0] < b[0],
        points = [
          dataPoint(forward ? a[1] : a[0], from.end),
          dataPoint(forward ? b[0] : b[1], to.end),
        ];
      const segments = context.dataClip
        ? clipDataPolyline(points, context.dataClip)
        : [points];
      return segments
        .map((segment) => {
          const start = point(context, segment[0]!.x, segment[0]!.y),
            end = point(context, segment.at(-1)!.x, segment.at(-1)!.y);
          return `<line data-role="bar-stack-connector" x1="${n(start.x)}" y1="${n(start.y)}" x2="${n(end.x)}" y2="${n(end.y)}" stroke="${esc(plot.fillStyle.borderColor)}" stroke-width="${n(Math.max(0.5, plot.fillStyle.borderWidthPt))}" fill="none" />`;
        })
        .join('');
    })
    .join('');
  const totals = (item.layerStackBarTotals ?? [])
    .map((total) => {
      const bar = total.bar,
        [low, high] = bandRange(item, context, bar.category!, bar);
      const center = (low + high) / 2,
        data = dataPoint(center, bar.end);
      const clip = context.dataClip;
      if (
        clip &&
        (data.x < clip.xMin ||
          data.x > clip.xMax ||
          data.y < clip.yMin ||
          data.y > clip.yMax)
      )
        return '';
      const end = point(context, data.x, data.y),
        base = dataPoint(center, bar.start),
        start = point(context, base.x, base.y);
      const direction = horizontal
        ? end.x >= start.x
          ? 1
          : -1
        : end.y <= start.y
          ? -1
          : 1;
      return `<text data-role="bar-stack-total" x="${n(end.x + (horizontal ? direction * 4 : 0))}" y="${n(end.y + (horizontal ? 0 : direction * 4))}" text-anchor="${horizontal ? (direction > 0 ? 'start' : 'end') : 'middle'}" dominant-baseline="${horizontal ? 'middle' : direction < 0 ? 'auto' : 'hanging'}" fill="${esc(total.color)}" font-size="${n(total.fontSizePt)}">${esc(total.text)}</text>`;
    })
    .join('');
  return connectors + totals;
}

function renderDistributionCurve(
  points: Array<{ x: number; y: number }>,
  context: ChartContext,
  color: string,
) {
  const path = points
    .map((value, index) => {
      const p = point(context, value.x, value.y);
      return `${index ? 'L' : 'M'}${n(p.x)} ${n(p.y)}`;
    })
    .join(' ');
  return `<path data-role="distribution-curve" d="${path}" fill="none" stroke="${esc(color)}" stroke-width="1.5" />`;
}
export function renderArea(
  item: PreparedPlot,
  context: ChartContext,
  options?: ChartLabelOptions,
): string {
  const plot = item.plot;
  if (plot.kind !== 'area') return '';
  const marks = item.segments
    .map((segment) => {
      if (segment.length < 2) return '';
      if (
        context.dataClip &&
        (!Number.isFinite(context.yScale.map(plot.baseline)) ||
          segment.some(
            (p) =>
              !Number.isFinite(context.xScale.map(p.x)) ||
              !Number.isFinite(context.yScale.map(p.y)),
          ))
      ) {
        const polygon = clipDataPolygon(
          [
            { x: segment[0]!.x, y: plot.baseline },
            ...segment,
            { x: segment.at(-1)!.x, y: plot.baseline },
          ],
          context.dataClip,
        );
        const path = (ps: { x: number; y: number }[]) =>
          ps
            .map((p, i) => {
              const v = point(context, p.x, p.y);
              return `${i ? 'L' : 'M'}${n(v.x)} ${n(v.y)}`;
            })
            .join(' ');
        return (
          (polygon.length
            ? `<path data-role="area" d="${path(polygon)} Z" ${fillAttributes(plot.fillStyle)}/>`
            : '') +
          clipDataPolyline(segment, context.dataClip)
            .map(
              (s) =>
                `<path d="${path(s)}" fill="none" ${lineAttributes(plot.lineStyle)}/>`,
            )
            .join('')
        );
      }
      const first = point(context, segment[0]!.x, plot.baseline),
        last = point(context, segment.at(-1)!.x, plot.baseline);
      const path = segment.map((p) => {
        const v = point(context, p.x, p.y);
        return `${n(v.x)} ${n(v.y)}`;
      });
      const area = `M${n(first.x)} ${n(first.y)} L${path.join(' L')} L${n(last.x)} ${n(last.y)} Z`;
      return `<path data-role="area" d="${area}" ${fillAttributes(plot.fillStyle)} /><path d="M${path.join(' L')}" fill="none" ${lineAttributes(plot.lineStyle)} />`;
    })
    .join('');
  if (!plot.dataLabels || !options) return marks;
  const labels = renderChartDataLabels(item, options.data, context);
  options.diagnostics.push(...labels.diagnostics);
  return marks + labels.svg;
}
function boxOutliers(
  box: PreparedPlot['boxes'][number],
  options: {
    plot: Extract<PreparedPlot['plot'], { kind: 'box' }>;
    center: number;
    point: (category: number, value: number) => { x: number; y: number };
  },
) {
  if (!options.plot.showOutliers) return '';
  return box.outliers
    .map((value) => {
      const q = options.point(options.center, value);
      const extreme = box.extremes.includes(value) && options.plot.showExtremes;
      const style = extreme
        ? options.plot.partStyles?.extreme
        : options.plot.partStyles?.outlier;
      return style
        ? renderMarker(q, style).replace(
            'data-role="marker"',
            `data-role="${extreme ? 'box-extreme' : 'box-outlier'}"`,
          )
        : `<circle data-role="${extreme ? 'box-extreme' : 'box-outlier'}" cx="${n(q.x)}" cy="${n(q.y)}" r="${extreme ? 2.8 : 2}" fill="${esc(options.plot.lineStyle.color)}" />`;
    })
    .join('');
}
export function renderBoxes(item: PreparedPlot, context: ChartContext): string {
  const plot = item.plot;
  if (plot.kind !== 'box') return '';
  const horizontal = plot.orientation === 'horizontal';
  const percentileValue = (
    box: PreparedPlot['boxes'][number],
    percentile: number,
  ) =>
    box.values.length
      ? quantile(box.values, percentile / 100, plot.quantileMethod)
      : box.median;
  const p = (category: number, value: number) =>
    horizontal
      ? point(context, value, category)
      : point(context, category, value);
  const segment = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    role: string,
    style = plot.lineStyle,
  ) =>
    `<line data-role="${role}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" ${lineAttributes(style)} />`;
  const distributionPeak = Math.max(
    0,
    ...(item.distributions?.flatMap((entry) =>
      entry.points.map((value) => value.y),
    ) ?? []),
  );
  const marks = item.boxes
    .map((box) => {
      const [low, high] = bandRange(item, context, box.category),
        center = (low + high) / 2;
      const range = horizontal
        ? { x1: box.boxLow, x2: box.boxHigh, y1: low, y2: high }
        : { x1: low, x2: high, y1: box.boxLow, y2: box.boxHigh };
      const body = rectangle(context, {
        role: 'box-body',
        range: range,
        style: fillAttributes(plot.fillStyle),
      });
      const whisker = segment(
        p(center, box.low),
        p(center, box.high),
        'box-whisker',
        plot.partStyles?.whisker ?? plot.lineStyle,
      );
      const limits = horizontal
        ? context.dataClip && [context.dataClip.xMin, context.dataClip.xMax]
        : context.dataClip && [context.dataClip.yMin, context.dataClip.yMax];
      const caps = [box.low, box.high]
        .filter((v) => !limits || (v >= limits[0]! && v <= limits[1]!))
        .map((v) =>
          segment(
            p(low, v),
            p(high, v),
            'box-cap',
            plot.partStyles?.cap ?? plot.lineStyle,
          ),
        )
        .join('');
      const median =
        plot.showMedian !== false &&
        (!limits || (box.median >= limits[0]! && box.median <= limits[1]!))
          ? segment(
              p(low, box.median),
              p(high, box.median),
              'box-median',
              plot.partStyles?.median ?? plot.lineStyle,
            )
          : '';
      const mean = plot.showMean
        ? (() => {
            const q = p(center, box.mean);
            const style = plot.partStyles?.mean;
            return style
              ? renderMarker(q, style).replace(
                  'data-role="marker"',
                  'data-role="box-mean"',
                )
              : `<circle data-role="box-mean" cx="${n(q.x)}" cy="${n(q.y)}" r="2.5" fill="none" stroke="${esc(plot.lineStyle.color)}" />`;
          })()
        : '';
      const notch = plot.showNotch
        ? segment(
            p(low, box.notchLow),
            p(high, box.notchLow),
            'box-notch',
            plot.partStyles?.notch ?? plot.lineStyle,
          ) +
          segment(
            p(low, box.notchHigh),
            p(high, box.notchHigh),
            'box-notch',
            plot.partStyles?.notch ?? plot.lineStyle,
          )
        : '';
      const confidence = plot.confidence?.visible
        ? (() => {
            const style = plot.partStyles?.notch ?? plot.lineStyle,
              z = normalQuantile((1 + plot.confidence.level) / 2),
              interval =
                plot.confidence.target === 'median' &&
                plot.confidence.method === 'notch'
                  ? [box.notchLow, box.notchHigh]
                  : (() => {
                      const center =
                          plot.confidence!.target === 'median'
                            ? box.median
                            : box.mean,
                        error =
                          z *
                          box.se *
                          (plot.confidence!.target === 'median' ? 1.253 : 1);
                      return [center - error, center + error];
                    })();
            return interval
              .map((value) =>
                segment(p(low, value), p(high, value), 'box-confidence', style),
              )
              .join('');
          })()
        : '';
      const raw =
        plot.rawPoints && plot.rawPoints !== 'none'
          ? box.samples
              .map((value, index) => {
                const offset =
                    plot.rawPoints === 'spread'
                      ? (index + 0.5) / box.samples.length - 0.5
                      : ((index * 0.61803398875) % 1) - 0.5,
                  spread = offset * (high - low) * 0.75,
                  q = p(center + spread, value);
                const style = plot.partStyles?.rawPoint;
                return style
                  ? renderMarker(q, style).replace(
                      'data-role="marker"',
                      'data-role="box-raw-point"',
                    )
                  : `<circle data-role="box-raw-point" cx="${n(q.x)}" cy="${n(q.y)}" r="1.5" fill="${esc(plot.lineStyle.color)}" fill-opacity="0.55" />`;
              })
              .join('')
          : '';
      const percentiles = (plot.percentile ?? [])
        .map((percentile) => {
          const value = percentileValue(box, percentile),
            q = p(center, value);
          return `<circle data-role="box-percentile" data-percentile="${n(percentile)}" cx="${n(q.x)}" cy="${n(q.y)}" r="2" fill="${esc(plot.partStyles?.percentile?.color ?? plot.lineStyle.color)}" />`;
        })
        .join('');
      const outliers = boxOutliers(
        {
          ...box,
          outliers: box.outliers.filter(
            (v) => !limits || (v >= limits[0]! && v <= limits[1]!),
          ),
        },
        { plot, center, point: p },
      );
      const distributions =
          item.distributions?.filter(
            (entry) => entry.category === box.category,
          ) ?? [],
        distributionMark = distributions
          .map((distribution) => {
            if (!distribution.points.length) return '';
            const peak = distributionPeak;
            if (!(peak > 0)) return '';
            const configuredSide =
                plot.distribution?.side ??
                (plot.distribution?.symmetric ? 'symmetric' : 'positive'),
              side =
                distribution.side ??
                (configuredSide === 'negative'
                  ? 'negative'
                  : configuredSide === 'symmetric'
                    ? 'symmetric'
                    : 'positive'),
              direction = side === 'negative' ? -1 : 1,
              half = (high - low) / 2,
              outer = distribution.points.map((value) =>
                p(center + direction * (value.y / peak) * half, value.x),
              ),
              inner =
                side === 'symmetric'
                  ? [...distribution.points]
                      .reverse()
                      .map((value) =>
                        p(center - (value.y / peak) * half, value.x),
                      )
                  : [
                      p(center, distribution.points.at(-1)!.x),
                      p(center, distribution.points[0]!.x),
                    ],
              points = [...outer, ...inner],
              d =
                points
                  .map(
                    (value, index) =>
                      `${index ? 'L' : 'M'}${n(value.x)} ${n(value.y)}`,
                  )
                  .join(' ') + ' Z',
              fill = plot.distribution?.fill ?? {
                ...plot.fillStyle,
                opacity: Math.min(plot.fillStyle.opacity, 0.35),
              };
            return `<path data-role="box-distribution" data-side="${side}"${distribution.split ? ` data-split="${esc(distribution.split)}"` : ''} d="${d}" ${fillAttributes(fill)} />`;
          })
          .join('');
      return (
        distributionMark +
        whisker +
        body +
        caps +
        notch +
        confidence +
        median +
        mean +
        raw +
        percentiles +
        outliers
      );
    })
    .join('');
  const connectionStyle = plot.partStyles?.connection ?? plot.lineStyle,
    centers = item.boxes.map((box) => {
      const range = bandRange(item, context, box.category);
      return { box, center: (range[0] + range[1]) / 2 };
    }),
    connect = (role: string, values: number[]) =>
      values.length < 2
        ? ''
        : `<path data-role="${role}" d="${values
            .map((value, index) => {
              const q = p(centers[index]!.center, value);
              return `${index ? 'L' : 'M'}${n(q.x)} ${n(q.y)}`;
            })
            .join(' ')}" fill="none" ${lineAttributes(connectionStyle)} />`,
    connections =
      (plot.connections?.mean
        ? connect(
            'box-mean-connection',
            centers.map(({ box }) => box.mean),
          )
        : '') +
      (plot.connections?.median
        ? connect(
            'box-median-connection',
            centers.map(({ box }) => box.median),
          )
        : '') +
      (plot.connections?.percentiles
        ? (plot.percentile ?? [])
            .map((percentile) =>
              connect(
                'box-percentile-connection',
                centers.map(({ box }) => percentileValue(box, percentile)),
              ),
            )
            .join('')
        : '');
  return marks + connections;
}
