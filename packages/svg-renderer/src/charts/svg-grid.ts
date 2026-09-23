import { contours } from 'd3-contour';
import { escapeXml as esc, formatNumber as n } from '../geometry.js';
import {
  point,
  rectangle,
  lineAttributes,
  type ChartContext,
} from './svg-marks.js';
import { makeColorScale } from './color-scale.js';
import { MAX_CONTOUR_WORK, type Grid } from './grid.js';
import { extent } from './statistics.js';
import { triangleBands, triangleContours } from './irregular-grid.js';
import type { PreparedPlot } from './prepared.js';
import { clipDataPolygon, clipDataPolyline } from '../data-clip.js';

export function renderHeatmap(
  item: PreparedPlot,
  context: ChartContext,
): string {
  const { plot, grid } = item;
  if (plot.kind !== 'heatmap') return '';
  if (item.irregular) {
    const values = item.irregular.points.map((value) => value.z),
      scale = makeColorScale(plot.colorScale, values),
      triangles = item.irregular.triangles
        .map((triangle) => {
          const d =
              triangle
                .map((value, index) => {
                  const q = point(context, value.x, value.y);
                  return `${index ? 'L' : 'M'}${n(q.x)} ${n(q.y)}`;
                })
                .join(' ') + ' Z',
            average = triangle.reduce((sum, value) => sum + value.z / 3, 0);
          return `<path data-role="heatmap-triangle" d="${d}" fill="${scale.color(average)}"${plot.heatmap?.cellBorder?.visible ? ` ${lineAttributes(plot.heatmap.cellBorder)}` : ''}/>`;
        })
        .join(''),
      labels = plot.heatmap?.labels
        ? item.irregular.points
            .map((value) => {
              const q = point(context, value.x, value.y);
              return `<text data-role="heatmap-label" x="${n(q.x)}" y="${n(q.y)}" text-anchor="middle" dominant-baseline="middle">${n(value.z)}</text>`;
            })
            .join('')
        : '';
    return triangles + labels;
  }
  if (!grid) return '';
  const scale = makeColorScale(plot.colorScale, grid.values);
  const cells = grid.values
    .map((z, i) => {
      if (z === null && !plot.heatmap?.missingColor) return '';
      const x = grid.x[i % grid.x.length]!,
        y = grid.y[Math.floor(i / grid.x.length)]!;
      if (z !== null && plot.heatmap?.interpolation === 'bilinear') {
        const column = i % grid.x.length,
          row = Math.floor(i / grid.x.length),
          at = (cx: number, cy: number) =>
            grid.values[
              Math.min(grid.y.length - 1, cy) * grid.x.length +
                Math.min(grid.x.length - 1, cx)
            ],
          z10 = at(column + 1, row),
          z01 = at(column, row + 1),
          z11 = at(column + 1, row + 1),
          steps = 4,
          border = plot.heatmap?.cellBorder?.visible
            ? ` ${lineAttributes(plot.heatmap.cellBorder)}`
            : '';
        return Array.from({ length: steps * steps }, (_, index) => {
          const sx = index % steps,
            sy = Math.floor(index / steps),
            tx = (sx + 0.5) / steps,
            ty = (sy + 0.5) / steps,
            values = [z, z10, z01, z11];
          if (values.some((value) => value === null))
            return plot.heatmap?.missingColor
              ? rectangle(context, {
                  role: 'heatmap-cell',
                  range: {
                    x1: x - grid.dx / 2 + (sx * grid.dx) / steps,
                    x2: x - grid.dx / 2 + ((sx + 1) * grid.dx) / steps,
                    y1: y - grid.dy / 2 + (sy * grid.dy) / steps,
                    y2: y - grid.dy / 2 + ((sy + 1) * grid.dy) / steps,
                  },
                  style: `fill="${plot.heatmap.missingColor}"${border}`,
                })
              : '';
          const interpolated =
            z! * (1 - tx) * (1 - ty) +
            z10! * tx * (1 - ty) +
            z01! * (1 - tx) * ty +
            z11! * tx * ty;
          return rectangle(context, {
            role: 'heatmap-cell',
            range: {
              x1: x - grid.dx / 2 + (sx * grid.dx) / steps,
              x2: x - grid.dx / 2 + ((sx + 1) * grid.dx) / steps,
              y1: y - grid.dy / 2 + (sy * grid.dy) / steps,
              y2: y - grid.dy / 2 + ((sy + 1) * grid.dy) / steps,
            },
            style: `data-interpolation="bilinear" fill="${scale.color(interpolated)}"${border}`,
          });
        }).join('');
      }
      return (
        rectangle(context, {
          role: 'heatmap-cell',
          range: {
            x1: x - grid.dx / 2,
            x2: x + grid.dx / 2,
            y1: y - grid.dy / 2,
            y2: y + grid.dy / 2,
          },
          style: `fill="${z === null ? plot.heatmap!.missingColor : scale.color(z)}"${plot.heatmap?.cellBorder?.visible ? ` ${lineAttributes(plot.heatmap.cellBorder)}` : ''}`,
        }) +
        (z !== null && plot.heatmap?.labels
          ? (() => {
              const q = point(context, x, y);
              return `<text data-role="heatmap-label" x="${n(q.x)}" y="${n(q.y)}" text-anchor="middle" dominant-baseline="middle">${n(z)}</text>`;
            })()
          : '')
      );
    })
    .join('');
  const labels = plot.heatmap?.labels
    ? grid.values
        .map((z, i) => {
          if (z === null) return '';
          const q = point(
            context,
            grid.x[i % grid.x.length]!,
            grid.y[Math.floor(i / grid.x.length)]!,
          );
          return `<text data-role="heatmap-label" x="${n(q.x)}" y="${n(q.y)}" text-anchor="middle" dominant-baseline="middle">${n(z)}</text>`;
        })
        .join('')
    : '';
  return cells + (plot.heatmap?.interpolation === 'bilinear' ? labels : '');
}
type Contour = Extract<PreparedPlot['plot'], { kind: 'contour' }>;
function levelsFor(plot: Contour, range: [number, number]) {
  if (plot.levels.mode === 'values') return plot.levels.values;
  if (plot.levels.mode === 'interval') {
    const { start, end, step } = plot.levels,
      count = Math.floor((end - start) / step) + 1;
    return Array.from({ length: count }, (_, index) => start + index * step);
  }
  const { count } = plot.levels,
    [min, max] = range;
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 1) / (count + 1);
    return min * (1 - t) + max * t;
  });
}
function ringPath(
  ring: number[][],
  grid: Grid,
  context: ChartContext,
  filled = false,
) {
  const dataPoints = ring.map((v) => ({
    x: grid.x[0]! + (v[0]! - 0.5) * grid.dx,
    y: grid.y[0]! + (v[1]! - 0.5) * grid.dy,
  }));
  if (
    context.dataClip &&
    dataPoints.some(
      (p) =>
        !Number.isFinite(context.xScale.map(p.x)) ||
        !Number.isFinite(context.yScale.map(p.y)),
    )
  ) {
    const points = dataPoints;
    const parts = filled
      ? [clipDataPolygon(points, context.dataClip)]
      : clipDataPolyline(points, context.dataClip);
    return parts
      .map(
        (ps) =>
          ps
            .map((p, i) => {
              const q = point(context, p.x, p.y);
              return `${i ? 'L' : 'M'}${n(q.x)} ${n(q.y)}`;
            })
            .join(' ') + (filled ? ' Z' : ''),
      )
      .join(' ');
  }
  // D3 将样本定位在半整数坐标，减去半格后恢复真实 X/Y 中心。
  return (
    ring
      .map((v, i) => {
        const q = point(
          context,
          grid.x[0]! + (v[0]! - 0.5) * grid.dx,
          grid.y[0]! + (v[1]! - 0.5) * grid.dy,
        );
        return `${i === 0 ? 'M' : 'L'}${n(q.x)} ${n(q.y)}`;
      })
      .join(' ') + ' Z'
  );
}
function contourPaths(
  plot: Contour,
  options: {
    grid: Grid;
    context: ChartContext;
    levels: number[];
    scale: ReturnType<typeof makeColorScale>;
  },
) {
  const { grid, context, levels, scale } = options;
  const polygons = contours()
    .size([grid.x.length, grid.y.length])
    .smooth(plot.contour?.smoothing ?? false)
    .thresholds(levels)(grid.values as number[]);
  return polygons
    .map((polygon) => {
      const path = polygon.coordinates
        .flatMap((poly) =>
          poly.map((ring) =>
            ringPath(ring, grid, context, plot.mode === 'filled'),
          ),
        )
        .join(' ');
      const levelStyle = plot.levelStyles?.find(
          (entry) =>
            Math.abs(entry.level - polygon.value) <=
            Math.max(1, Math.abs(polygon.value)) * 1e-12,
        )?.lineStyle,
        style =
          plot.mode === 'filled'
            ? `fill="${scale.color(polygon.value)}" fill-rule="evenodd"`
            : `fill="none" ${lineAttributes(levelStyle ?? plot.lineStyle)}`,
        first = polygon.coordinates[0]?.[0]?.[0],
        label =
          plot.contour?.labels && first
            ? (() => {
                const q = point(
                  context,
                  grid.x[0]! + (first[0]! - 0.5) * grid.dx,
                  grid.y[0]! + (first[1]! - 0.5) * grid.dy,
                );
                return `<text data-role="contour-label" x="${n(q.x)}" y="${n(q.y)}">${n(polygon.value)}</text>`;
              })()
            : '';
      return `<path data-role="contour-${plot.mode === 'filled' ? 'band' : 'line'}" data-level="${n(polygon.value)}" d="${path}" ${style} />${label}`;
    })
    .join('');
}
export function renderContour(
  item: PreparedPlot,
  context: ChartContext,
): string {
  const { plot, grid } = item;
  if (plot.kind !== 'contour') return '';
  if (item.irregular) {
    const values = item.irregular.points.map((value) => value.z),
      [min, max] = extent(values),
      levels = levelsFor(plot, [min, max]),
      scale = makeColorScale(plot.colorScale, values);
    if (plot.mode === 'filled') {
      const bands = triangleBands(
          item.irregular.triangles,
          plot.contour?.outOfRange === 'transparent' &&
            plot.colorScale.range.mode === 'fixed'
            ? [...levels, plot.colorScale.range.min, plot.colorScale.range.max]
            : levels,
          [min, max],
        ).filter(
          (band) =>
            plot.contour?.outOfRange !== 'transparent' ||
            plot.colorScale.range.mode !== 'fixed' ||
            (band.value >= plot.colorScale.range.min &&
              band.value <= plot.colorScale.range.max),
        ),
        paths = bands
          .map((band) => {
            const screenPoints = band.points.map((value) =>
                point(context, value.x, value.y),
              ),
              d =
                screenPoints
                  .map(
                    (value, index) =>
                      `${index ? 'L' : 'M'}${n(value.x)} ${n(value.y)}`,
                  )
                  .join(' ') + ' Z';
            return `<path data-role="contour-triangle-band" data-level="${n(band.value)}" d="${d}" fill="${scale.color(band.value)}"/>`;
          })
          .join(''),
        seenLabelLevels = new Set<number>(),
        labelSegments = plot.contour?.labels
          ? triangleContours(item.irregular.triangles, levels).filter(
              (segment) => {
                if (seenLabelLevels.has(segment.level)) return false;
                seenLabelLevels.add(segment.level);
                return true;
              },
            )
          : [],
        labels = labelSegments
          .filter(
            (segment) =>
              plot.contour?.outOfRange !== 'transparent' ||
              plot.colorScale.range.mode !== 'fixed' ||
              (segment.level >= plot.colorScale.range.min &&
                segment.level <= plot.colorScale.range.max),
          )
          .map((segment) => {
            const a = point(context, segment.points[0].x, segment.points[0].y),
              b = point(context, segment.points[1].x, segment.points[1].y);
            return `<text data-role="contour-label" x="${n((a.x + b.x) / 2)}" y="${n((a.y + b.y) / 2)}">${n(segment.level)}</text>`;
          })
          .join('');
      return paths + labels;
    }
    return triangleContours(item.irregular.triangles, levels)
      .filter(
        (segment) =>
          plot.contour?.outOfRange !== 'transparent' ||
          plot.colorScale.range.mode !== 'fixed' ||
          (segment.level >= plot.colorScale.range.min &&
            segment.level <= plot.colorScale.range.max),
      )
      .map((segment) => {
        const a = point(context, segment.points[0].x, segment.points[0].y),
          b = point(context, segment.points[1].x, segment.points[1].y),
          label = plot.contour?.labels
            ? `<text data-role="contour-label" x="${n((a.x + b.x) / 2)}" y="${n((a.y + b.y) / 2)}">${n(segment.level)}</text>`
            : '';
        const style =
          plot.levelStyles?.find(
            (entry) =>
              Math.abs(entry.level - segment.level) <=
              Math.max(1, Math.abs(segment.level)) * 1e-12,
          )?.lineStyle ?? plot.lineStyle;
        return `<line data-role="contour-triangle-line" data-level="${n(segment.level)}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" ${lineAttributes(style)}/>${label}`;
      })
      .join('');
  }
  if (!grid) return '';
  const values = grid.values as number[],
    scale = makeColorScale(plot.colorScale, values);
  const [min, max] = extent(values),
    levels = levelsFor(plot, [min, max]);
  if (values.length * levels.length > MAX_CONTOUR_WORK)
    throw new Error('等值线网格与层数超过计算上限');
  const range = {
    x1: grid.x[0]!,
    x2: grid.x.at(-1)!,
    y1: grid.y[0]!,
    y2: grid.y.at(-1)!,
  };
  const clipId = 'contour-' + plot.plotSlotId + (context.clipSuffix ?? '');
  const clip = rectangle(context, { role: 'contour-clip', range, style: '' });
  const base =
    plot.mode === 'filled' && plot.contour?.outOfRange !== 'transparent'
      ? rectangle(context, {
          role: 'contour-background',
          range,
          style: `fill="${scale.color(min)}"`,
        })
      : '';
  if (min === max)
    return (
      base ||
      `<text data-role="contour-empty" x="${n(context.rect.x + 8)}" y="${n(context.rect.y + 16)}">常量场：无等值线</text>`
    );
  const fixedRange =
      plot.colorScale.range.mode === 'fixed'
        ? plot.colorScale.range
        : undefined,
    visibleLevels =
      plot.contour?.outOfRange === 'transparent' && fixedRange
        ? levels.filter(
            (level) => level >= fixedRange.min && level <= fixedRange.max,
          )
        : levels,
    paths = contourPaths(plot, { grid, context, levels: visibleLevels, scale });
  return `<defs><clipPath id="${esc(clipId)}">${clip}</clipPath></defs><g clip-path="url(#${esc(clipId)})">${base}${paths}</g>`;
}
