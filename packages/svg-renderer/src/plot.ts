import { renderLineExtras } from './xy-line-extras.js';
import { prepareSeriesRows, type SeriesRow } from './series-rows.js';
import { xyBoundColumns } from './xy-data-view.js';
import { renderXyErrors } from './xy-errors.js';
import type { ChartContext } from './charts/chart-point.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import { escapeXml } from './geometry.js';
import type { RenderDiagnostic } from './types.js';
import {
  createMarkerRenderer,
  type AdvancedMarker,
} from './marker-appearance.js';
import { xyLinePath } from './xy-line-path.js';
import { resolveLineMapping } from './line-mapping.js';
import { prepareCurveSubset } from './curve-groups.js';
import { renderDataLabels } from './data-labels.js';
import { renderAdvancedErrors } from './error-details.js';
import { advancedMarkerRadius } from './marker-appearance.js';
import { errorRange } from './error-values.js';
import type { CurveRenderGeometry } from './curve-render-geometry.js';
import { renderCurveDropLines } from './advanced-drop-lines.js';
import { clipDataPolyline, containsDataPoint } from './data-clip.js';
export function renderPlot(
  plot: XyPlot,
  data: DataBindingSet,
  context: ChartContext,
  purpose: 'display' | 'export' = 'display',
  prepared?: ReturnType<typeof prepareSeriesRows>,
  markerForRow?: (row: SeriesRow) => AdvancedMarker,
  markerPositionForRow?: (row: SeriesRow) => { x: number; y: number },
  geometry?: CurveRenderGeometry,
):
  | {
      svg: string;
      skipped: number;
      diagnostics: RenderDiagnostic[];
      lineColorForRow?: (row: SeriesRow) => string;
      markerForRow?: (row: SeriesRow) => AdvancedMarker;
    }
  | undefined {
  const { x, y } = xyBoundColumns(plot, data);
  const inDomain = (row: { x: number; y: number }) =>
    Number.isFinite(context.xScale.map(row.x)) &&
    Number.isFinite(context.yScale.map(row.y));
  const rows = prepared ?? prepareSeriesRows(x, y, plot.dataView, inDomain);
  const sourceRows = geometry?.sourceRows ?? rows;
  const subset = prepareCurveSubset(plot, data, sourceRows);
  const rawByIndex = new Map(
    sourceRows.rawRows.map((row) => [row.sourceIndex, row]),
  );
  if (!markerForRow && plot.subset && plot.markerStyle)
    markerForRow = (row) => ({
      ...plot.markerStyle!,
      ...subset.style(row).marker,
    });
  const hasMarkers =
    plot.mode !== 'line' &&
    !!plot.markerStyle &&
    (!!markerForRow || plot.markerStyle.visible);
  const lineBinding = data.bindings.find(
    (b) => b.dataSlotId === plot.bindings.lineColor && b.status === 'valid',
  );
  const mappedLine =
    plot.lineMapping && plot.lineStyle
      ? resolveLineMapping(
          plot.lineStyle,
          sourceRows.rawRows,
          plot.lineMapping,
          data.columns.find((c) => c.columnId === lineBinding?.columnId),
        )
      : undefined;
  const lineColorForRow =
    mappedLine || plot.subset
      ? (row: SeriesRow) =>
          mappedLine?.color(rawByIndex.get(row.sourceIndex) ?? row) ??
          subset.style(row).line?.color ??
          plot.lineStyle?.color ??
          '#000000'
      : undefined;
  // 抽样不得掩盖完整样条在实际坐标中的重合或数值不稳定。
  if (
    plot.mode !== 'markers' &&
    plot.lineStyle?.visible &&
    plot.lineConnection === 'spline'
  )
    for (const segment of subset.segments(
      geometry?.lineSegments ?? rows.segments,
    ))
      xyLinePath(
        segment.map((row) => ({
          x: context.rect.x + context.xScale.map(row.x) * context.rect.width,
          y:
            context.rect.y +
            (1 - context.yScale.map(row.y)) * context.rect.height,
        })),
        'spline',
      );
  const selected = subset.segments(
    purpose === 'export' ? rows.exportSegments : rows.displaySegments,
  );
  let skipped = rows.invalidCount;
  const screenSegments = (input: SeriesRow[][], lineOnly = false) =>
    input.map((segment) =>
      segment.flatMap((row) => {
        const x =
          context.rect.x + context.xScale.map(row.x) * context.rect.width;
        const y =
          context.rect.y +
          (1 - context.yScale.map(row.y)) * context.rect.height;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          skipped++;
          return [];
        }
        return [
          {
            x,
            y,
            sourceIndex: row.sourceIndex,
            row,
            marker: lineOnly ? undefined : markerForRow?.(row),
            symbolPoint: lineOnly ? undefined : markerPositionForRow?.(row),
          },
        ];
      }),
    );
  const segments = screenSegments(
    context.dataClip
      ? selected.map((s) =>
          s.filter((p) => containsDataPoint(p, context.dataClip)),
        )
      : selected,
  );
  const lineSource = subset.segments(geometry?.lineSegments ?? selected);
  const needsClip =
    !!context.dataClip && lineSource.some((s) => s.some((p) => !inDomain(p)));
  const step =
    plot.lineConnection === 'step-h' || plot.lineConnection === 'step-v';
  const expanded = (s: SeriesRow[]) =>
    step
      ? s.flatMap((p, i) =>
          i
            ? [
                {
                  ...p,
                  x: plot.lineConnection === 'step-h' ? p.x : s[i - 1]!.x,
                  y: plot.lineConnection === 'step-h' ? s[i - 1]!.y : p.y,
                },
                p,
              ]
            : [p],
        )
      : s;
  const lineSegments = needsClip
    ? screenSegments(
        lineSource.flatMap((s) =>
          clipDataPolyline(expanded(s), context.dataClip!),
        ),
        true,
      )
    : context.dataClip
      ? screenSegments(lineSource, true)
      : geometry?.lineSegments
        ? screenSegments(subset.segments(geometry.lineSegments), true)
        : segments;
  const points = segments.flat();
  const diagnostics: RenderDiagnostic[] = [];
  if (mappedLine?.diagnostics.length)
    diagnostics.push({
      code: 'RENDER_DATA_INVALID',
      severity: 'warning',
      sourcePath: '/plotSlots/' + plot.plotSlotId + '/lineMapping',
      message: `${mappedLine.diagnostics.length} 行线色数据无效，保留基础线色`,
    });
  let svg = plot.dropLines
    ? renderCurveDropLines(
        plot,
        subset.segments(geometry?.lineSegments ?? rows.segments),
        selected,
        context,
        geometry,
      )
    : '';
  let lines = '';
  if (plot.mode !== 'markers' && plot.lineStyle?.visible)
    for (const segment of lineSegments)
      lines += renderLineExtras({
        points: segment,
        connection:
          needsClip && step ? 'straight' : (plot.lineConnection ?? 'straight'),
        line: plot.lineStyle,
        ...(lineColorForRow
          ? { lineColors: segment.map((p) => lineColorForRow(p.row)) }
          : {}),
        ...(plot.subset
          ? {
              lineStyles: segment.map((p) => {
                const style = {
                  ...plot.lineStyle!,
                  ...subset.style(p.row).line,
                };
                if (subset.style(p.row).line?.dash) delete style.customDash;
                return style;
              }),
            }
          : {}),
        ...(plot.mode !== 'line' && plot.markerStyle
          ? { marker: plot.markerStyle }
          : {}),
        ...(markerForRow && hasMarkers
          ? {
              symbolStyles: (geometry?.lineSegments || context.dataClip
                ? points
                : segment
              ).map((p) => p.marker!),
            }
          : {}),
        ...((markerPositionForRow ||
          geometry?.lineSegments ||
          context.dataClip) &&
        hasMarkers
          ? {
              symbols: (geometry?.lineSegments || context.dataClip
                ? points
                : segment
              ).map((p) => p.symbolPoint ?? p),
            }
          : {}),
        extras: plot,
      });
  if (!plot.lineInFront) svg += lines;
  if (hasMarkers && plot.markerStyle) {
    const renderMarker = createMarkerRenderer(
      plot.markerStyle,
      plot.lineStyle?.opacity,
    );
    const renderers = new Map<
      string,
      ReturnType<typeof createMarkerRenderer>
    >();
    for (const point of points) {
      if (!point.marker) {
        svg += renderMarker(point.symbolPoint ?? point);
        continue;
      }
      if (!point.marker.visible) continue;
      const key = JSON.stringify(point.marker);
      let renderer = renderers.get(key);
      if (!renderer) {
        renderer = createMarkerRenderer(point.marker, plot.lineStyle?.opacity);
        renderers.set(key, renderer);
      }
      svg += `<g data-role="mapped-symbol" data-source-index="${point.sourceIndex}">${renderer(point.symbolPoint ?? point)}</g>`;
    }
  }
  if (plot.lineInFront) svg += lines;
  const errors =
    plot.errorDetails || geometry?.errorTransform
      ? renderAdvancedErrors(plot, data, {
          context,
          segments: selected,
          allSegments: subset.segments(rows.segments),
          sourceRows: sourceRows.rawRows,
          ...(geometry?.errorTransform
            ? { errorTransform: geometry.errorTransform }
            : {}),
          ...(lineColorForRow ? { lineColorForRow } : {}),
          markerRadius: (row: SeriesRow) => {
            const marker = markerForRow?.(row) ?? plot.markerStyle;
            return hasMarkers && marker?.visible
              ? advancedMarkerRadius(marker)
              : 0;
          },
        })
      : renderXyErrors(plot, data, {
          context,
          indices: context.dataClip
            ? selected.flat().map((p) => p.sourceIndex)
            : points.map((p) => p.sourceIndex),
        });
  svg += errors.svg;
  diagnostics.push(...errors.diagnostics);
  if (plot.dataLabels) {
    const labels = renderDataLabels({
      plot,
      data,
      context,
      rows: rows.segments
        .flat()
        .filter((p) => containsDataPoint(p, context.dataClip)),
      rawRowForRow: (row) => rawByIndex.get(row.sourceIndex) ?? row,
      ...(markerForRow ? { markerForRow } : {}),
      ...(markerPositionForRow ? { pointForRow: markerPositionForRow } : {}),
      ...(lineColorForRow ? { lineColorForRow } : {}),
      errorBounds: (prefix, index, base) => {
        const raw = rawByIndex.get(index);
        const range = errorRange(plot, data, {
          prefix,
          index,
          base: raw?.[prefix] ?? base,
        });
        const transform = raw && geometry?.errorTransform?.(raw);
        return range && transform
          ? (range.map((v) =>
              prefix === 'x' ? v + transform.xOffset : transform.mapY(v),
            ) as [number, number])
          : range;
      },
    });
    svg += labels.svg;
    diagnostics.push(...labels.diagnostics);
  }
  return {
    svg: `<g data-role="plot-slot" data-plot-slot-id="${escapeXml(plot.plotSlotId)}">${svg}</g>`,
    skipped,
    diagnostics,
    ...(lineColorForRow ? { lineColorForRow } : {}),
    ...(markerForRow ? { markerForRow } : {}),
  };
}
