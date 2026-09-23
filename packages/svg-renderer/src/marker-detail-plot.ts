import type { XyPlot } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { ChartContext } from './charts/chart-point.js';
import {
  validateMarkerDetails,
  type MarkerDetails,
} from './marker-detail-settings.js';
import { resolveMarkerDetails } from './marker-details.js';
import {
  markerMappingColumns,
  markerSourceForPlot,
  renderMappedPlot,
} from './marker-mapped-plot.js';
import { resolveMarkerOverrides } from './marker-overrides.js';
import { xyBoundColumns } from './xy-data-view.js';
import { prepareSeriesRows } from './series-rows.js';
import { renderPlot } from './plot.js';
import { prepareCurveSubset } from './curve-groups.js';
import type { CurveRenderGeometry } from './curve-render-geometry.js';
import { formatNumber as n } from './geometry.js';

// 主图与图例复用同一次解析；未设置细节时保持原绘制路径。
export function renderMarkerDetailPlot(
  plot: XyPlot,
  data: DataBindingSet,
  context: ChartContext,
  details: MarkerDetails,
  purpose: 'display' | 'export' = 'display',
  prepared?: ReturnType<typeof prepareSeriesRows>,
  geometry?: CurveRenderGeometry,
) {
  validateMarkerDetails(details);
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
  if (!Object.keys(details).length)
    return {
      ...renderMappedPlot(plot, data, context, undefined, purpose, rows, geometry),
      detailDiagnostics: [],
      legend: [],
      legendSamples: [],
    };
  if (!plot.markerStyle) throw new Error('符号细节需要基础符号样式');
  const overrideState = resolveMarkerOverrides(
    plot.markerOverrides,
    markerSourceForPlot(plot, data),
    rows.rawRows,
  );
  const prepareSubset = prepareCurveSubset(plot, data, geometry?.sourceRows ?? rows);
  const resolved = resolveMarkerDetails(
    plot.markerStyle,
    rows.rawRows,
    context,
    details,
    {
      mapping: plot.markerMapping ?? {},
      columns: markerMappingColumns(plot, data),
      overrides: overrideState.overrides,
      baseForRow: (row) => prepareSubset.style(row).marker,
      referenceRows: geometry?.sourceRows?.rawRows ?? rows.rawRows,
    },
  );
  const rendered = renderPlot(
    plot,
    data,
    context,
    purpose,
    rows,
    resolved.style,
    resolved.position,
    geometry,
  )!;
  const representative = rows.rawRows.find((row) => {
    const style = resolved.style(row);
    return (
      style.visible &&
      Number.isFinite(context.xScale.map(row.x)) &&
      Number.isFinite(context.yScale.map(row.y))
    );
  });
  const legendSamples: import('./marker-details.js').MarkerLegendSample[] =
    resolved.legend.map((sample) => ({
      ...sample,
      style: {
        ...sample.style,
        visible: plot.markerStyle!.visible && sample.style.visible,
      },
    }));
  if (!details.legend) {
    // 保留隐藏样本，防止零尺寸或无有效数据时回退为基础符号。
    const style = representative
        ? resolved.style(representative)
        : { ...plot.markerStyle, visible: false },
      size = Math.max(4, Math.min(36, plot.markerStyle.sizePt || 12));
    style.visible = plot.markerStyle.visible && style.visible;
    style.strokeWidthPt *= style.sizePt > 0 ? size / style.sizePt : 1;
    style.sizePt = size;
    legendSamples.push({ style });
  }
  if (overrideState.paused)
    rendered.diagnostics.push({
      code: 'RENDER_DATA_INVALID',
      severity: 'warning',
      sourcePath: '/plotSlots/' + plot.plotSlotId + '/markerOverrides',
      message: overrideState.message,
    });
  const warnings = new Map<
    string,
    { count: number; sourceIndex: number; property: string; message: string }
  >();
  for (const issue of resolved.diagnostics) {
    const key = issue.property + issue.message,
      old = warnings.get(key);
    if (old) old.count++;
    else warnings.set(key, { ...issue, count: 1 });
  }
  for (const issue of warnings.values())
    rendered.diagnostics.push({
      code: 'RENDER_DATA_INVALID',
      severity: 'warning',
      sourcePath:
        '/plotSlots/' + plot.plotSlotId + '/markerDetails/' + issue.property,
      message:
        issue.message +
        `（${issue.count} 行，首个为原始第 ${issue.sourceIndex + 1} 行）`,
    });
  const selected = (
    purpose === 'export' ? rows.exportSegments : rows.displaySegments
  ).flat();
  const centers =
    plot.mode !== 'line' && plot.markerStyle.visible
      ? resolved.centers(selected)
      : [];
  const centerSvg = centers
    .map(
      (p) =>
        `<path data-role="overlap-center" d="M${n(p.x - 2)} ${n(p.y)}h4M${n(p.x)} ${n(p.y - 2)}v4" fill="none" stroke="#30343b" stroke-width="0.6"/>`,
    )
    .join('');
  return {
    ...rendered,
    svg: rendered.svg.slice(0, -4) + centerSvg + '</g>',
    overrideState,
    detailDiagnostics: resolved.diagnostics,
    legend: resolved.legend,
    legendSamples,
  };
}
