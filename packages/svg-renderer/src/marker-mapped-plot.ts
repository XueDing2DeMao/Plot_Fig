import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import type { ChartContext } from './charts/chart-point.js';
import { resolveMarkerMapping, type MarkerMapping } from './marker-mapping.js';
import {
  captureMarkerSource,
  resolveMarkerOverrides,
  type MarkerOverrides,
} from './marker-overrides.js';
import { prepareSeriesRows } from './series-rows.js';
import { xyBoundColumns } from './xy-data-view.js';
import { renderPlot } from './plot.js';
import { prepareCurveSubset } from './curve-groups.js';
import type { CurveRenderGeometry } from './curve-render-geometry.js';
import type { RenderDiagnostic } from './types.js';

export function markerSourceForPlot(plot: XyPlot, data: DataBindingSet) {
  const { x, y } = xyBoundColumns(plot, data);
  return x.source && y.source
    ? captureMarkerSource(data.columns, x, y)
    : undefined;
}
export function markerMappingColumns(plot: XyPlot, data: DataBindingSet) {
  return Object.fromEntries(
    (['color', 'size', 'shape'] as const).map((role) => {
      const binding = data.bindings.find(
        (b) => b.dataSlotId === plot.bindings[role] && b.status === 'valid',
      );
      return [
        role,
        binding
          ? data.columns.find((c) => c.columnId === binding.columnId)
          : undefined,
      ];
    }),
  );
}
function plotOptions(plot: XyPlot, data: DataBindingSet) {
  return {
    mapping: plot.markerMapping ?? {},
    columns: markerMappingColumns(plot, data),
    ...(plot.markerOverrides ? { overrides: plot.markerOverrides } : {}),
  };
}

// 映射、单点覆盖与基础曲线共用绘制路径。
export function renderMappedPlot(
  plot: XyPlot,
  data: DataBindingSet,
  context: ChartContext,
  options: {
    mapping?: MarkerMapping;
    columns?: Parameters<typeof resolveMarkerMapping>[3];
    overrides?: MarkerOverrides;
  } = plotOptions(plot, data),
  purpose: 'display' | 'export' = 'display',
  prepared?: ReturnType<typeof prepareSeriesRows>,
  geometry?: CurveRenderGeometry,
) {
  const { x, y } = xyBoundColumns(plot, data);
  const rows =
    prepared ??
    prepareSeriesRows(
      x,
      y,
      plot.dataView,
      (row) =>
        Number.isFinite(context.xScale.map(row.x)) &&
        Number.isFinite(context.yScale.map(row.y)),
    );
  const overrideState =
    options.overrides !== undefined
      ? resolveMarkerOverrides(
          options.overrides,
          x.source && y.source
            ? captureMarkerSource(data.columns, x, y)
            : undefined,
          rows.rawRows,
        )
      : { overrides: new Map(), paused: false, message: '' };
  const active =
    Object.keys(options.mapping ?? {}).length > 0 ||
    overrideState.overrides.size > 0 || !!plot.subset;
  const subset = prepareCurveSubset(plot, data, geometry?.sourceRows ?? rows);
  if (active && !plot.markerStyle) throw new Error('符号映射需要基础符号样式');
  const mapped = active
    ? resolveMarkerMapping(
        plot.markerStyle!,
        rows.rawRows,
        options.mapping ?? {},
        options.columns ?? {},
        context,
        overrideState.overrides,
        (row) => subset.style(row).marker,
        geometry?.sourceRows?.rawRows ?? rows.rawRows,
      )
    : undefined;
  const rendered = renderPlot(
    plot,
    data,
    context,
    purpose,
    rows,
    mapped?.style,
    undefined,
    geometry,
  )!;
  const warnings: RenderDiagnostic[] = [];
  if (overrideState.paused)
    warnings.push({
      code: 'RENDER_DATA_INVALID',
      severity: 'warning',
      sourcePath: '/plotSlots/' + plot.plotSlotId + '/markerOverrides',
      message: overrideState.message,
    });
  const groups = new Map<
    string,
    { count: number; sourceIndex: number; property: string; message: string }
  >();
  for (const issue of mapped?.diagnostics ?? []) {
    const key = issue.property + issue.message;
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { ...issue, count: 1 });
  }
  for (const issue of groups.values())
    warnings.push({
      code: 'RENDER_DATA_INVALID',
      severity: 'warning',
      sourcePath:
        '/plotSlots/' + plot.plotSlotId + '/markerMapping/' + issue.property,
      message:
        issue.message +
        '（' +
        issue.count +
        ' 行，首个为原始第 ' +
        (issue.sourceIndex + 1) +
        ' 行）',
    });
  return {
    ...rendered,
    diagnostics: [...rendered.diagnostics, ...warnings],
    mappingDiagnostics: mapped?.diagnostics ?? [],
    overrideState,
  };
}
