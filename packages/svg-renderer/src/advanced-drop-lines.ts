import type { XyPlot } from '@plot-fig/figure-schema';
import type { ChartContext } from './charts/chart-point.js';
import type { CurveRenderGeometry } from './curve-render-geometry.js';
import type { SeriesRow } from './series-rows.js';
import { createCurveInterpolator } from './curve-transforms.js';
import { renderDropLines } from './xy-line-extras.js';

export function renderCurveDropLines(
  plot: XyPlot,
  rows: SeriesRow[][],
  selected: SeriesRow[][],
  context: ChartContext,
  geometry?: CurveRenderGeometry,
) {
  const screen = (p: { x: number; y: number; sourceIndex: number }) => ({
    x: context.rect.x + context.xScale.map(p.x) * context.rect.width,
    y: context.rect.y + (1 - context.yScale.map(p.y)) * context.rect.height,
    sourceIndex: p.sourceIndex,
  });
  let svg = '';
  for (const direction of ['horizontal', 'vertical'] as const) {
    const drop = plot.dropLines?.[direction];
    if (!drop) continue;
    const horizontal = direction === 'horizontal',
      color = plot.lineStyle?.color ?? plot.markerStyle?.stroke ?? '#000000';
    const oriented = (s: SeriesRow[][]) =>
      horizontal
        ? s.map((segment) => segment.map((p) => ({ x: p.y, y: p.x })))
        : s;
    const source = drop.selection
      ? createCurveInterpolator(oriented(rows))
      : undefined;
    const points = drop.selection
      ? drop.selection.values.map((value, index) => {
          const result = source!(value);
          if (result === undefined)
            throw new Error('垂线插值位置不在源曲线连续区间内');
          return {
            x: horizontal ? result : value,
            y: horizontal ? value : result,
            sourceIndex: index,
          };
        })
      : selected.flat();
    if (drop.target.mode !== 'next-curve') {
      const { selection: _, ...basic } = drop;
      svg += renderDropLines(
        points.map(screen),
        context,
        { [direction]: basic },
        color,
      );
      continue;
    }
    const targets = geometry?.targets ?? [],
      index = targets.findIndex((p) => p.plot.plotSlotId === plot.plotSlotId),
      id = drop.target.plotSlotId;
    const target = id
      ? targets.find((p) => p.plot.plotSlotId === id)
      : targets
          .slice(index + 1)
          .find(
            (p) =>
              (p.plot.kind === 'xy' || p.plot.kind === 'area') &&
              p.plot.xAxisId === plot.xAxisId &&
              p.plot.yAxisId === plot.yAxisId,
          );
    if (!target) throw new Error('下一曲线垂线目标不可用，请检查显隐与绑定');
    const segments = target.segments;
    const interpolate = createCurveInterpolator(
      horizontal
        ? segments.map((s) => s.map((p) => ({ x: p.y, y: p.x })))
        : segments,
    );
    if (points.length > 100000) throw new Error('垂线原始点数量超过十万上限');
    for (const p of points) {
      const value = interpolate(horizontal ? p.y : p.x);
      if (value === undefined)
        throw new Error('垂线源点超出目标曲线的共同连续区间');
      svg += renderDropLines(
        [screen(p)],
        context,
        {
          [direction]: {
            target: { mode: 'value', value },
            ...(drop.style ? { style: drop.style } : {}),
          },
        },
        color,
      );
    }
  }
  return svg;
}
