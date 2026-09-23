import { paintValue } from './paint.js';
import {
  categoricalDimension,
  type Axis,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import {
  renderAxisAppearance,
  validateAxisAppearance,
} from './axis-appearance.js';
import { readAxisAppearance } from './axis-appearance-options.js';
import { renderPanelAnnotations } from './annotations.js';
import { renderAxisDecorations } from './axis-decorations.js';
import { clipDataPolygon, containsDataPoint } from './data-clip.js';
import { renderPlot } from './plot.js';
import { renderMappedPlot } from './marker-mapped-plot.js';
import { renderMarkerDetailPlot } from './marker-detail-plot.js';
import type { MarkerLegendSamples } from './marker-details.js';
import { renderSeriesLegend } from './legend.js';
import { preparePlot, arrangeBands } from './charts/prepare.js';
import { describePlotFailure, type PreparedPlot } from './charts/prepared.js';
import {
  renderBars,
  renderBoxes,
  renderArea,
  type ChartContext,
} from './charts/svg-marks.js';
import { renderHeatmap, renderContour } from './charts/svg-grid.js';
import { renderColorbar } from './charts/color-scale.js';
import { prepareAxisScale } from './panel-scales.js';
import { scaleCells, clippedCell, cellClip } from './segmented-panel.js';
import { axisTickDiagnostic } from './fixed-axis-ticks.js';
import type { RenderDiagnostic } from './types.js';
import { createScale, type PlotScale } from './scales.js';
import { alignYAxisScales } from './axis-alignment.js';
import { constrainAxisLengths } from './axis-length-ratio.js';
type Panel = FigureTemplate['panels'][number];
import {
  colorbarLayout,
  colorbarSlotSize,
  layerGeometry,
  pageGeometry,
  layerClipRect,
} from './layout-geometry.js';
import { renderLayerAppearance } from './layer-appearance.js';
import { resolveCurveGroups, prepareCurveSubset } from './curve-groups.js';
import { prepareCurveTransforms } from './curve-transforms.js';
import { errorRange } from './error-values.js';
import { renderChartDataLabels } from './chart-data-labels.js';
export { COLORBAR_WIDTH } from './layout-geometry.js';
const MIN_PLOT_WIDTH = 60;
const MIN_PLOT_HEIGHT = 40;

function frameOnlyAxis(axis: Axis): Axis {
  const result = structuredClone(axis);
  result.scale = 'linear';
  result.range = { mode: 'auto' };
  result.majorTicks.visible = false;
  result.minorTicks.visible = false;
  result.tickLabels.visible = false;
  delete result.title;
  delete result.grid;
  return result;
}
function diagnostic(
  panel: Panel,
  id: string,
  cause: unknown,
): RenderDiagnostic {
  return {
    code: 'RENDER_DATA_INVALID',
    severity: 'warning',
    sourcePath: `/panels/${panel.panelId}/plotSlots/${id}`,
    message: cause instanceof Error ? cause.message : String(cause),
  };
}
export function preparePanel(
  panel: Panel,
  data: DataBindingSet,
  diagnostics: RenderDiagnostic[],
) {
  const plots: PreparedPlot[] = [];
  if (panel.visible === false) return plots;
  panel = resolveCurveGroups(panel);
  if (
    panel.plotSlots.some(
      (p) =>
        ('transform' in p &&
          p.transform?.fill?.target === 'next' &&
          !p.transform.fill.targetPlotId) ||
        (p.kind === 'xy' &&
          Object.values(p.dropLines ?? {}).some(
            (d) => d.target.mode === 'next-curve' && !d.target.plotSlotId,
          )),
    )
  ) {
    panel = structuredClone(panel);
    for (const [index, plot] of panel.plotSlots.entries()) {
      const target = panel.plotSlots
        .slice(index + 1)
        .find(
          (p) =>
            p.visible !== false &&
            (p.kind === 'xy' || p.kind === 'area') &&
            p.xAxisId === plot.xAxisId &&
            p.yAxisId === plot.yAxisId,
        );
      if (!target) continue;
      if (
        'transform' in plot &&
        plot.transform?.fill?.target === 'next' &&
        !plot.transform.fill.targetPlotId
      )
        plot.transform.fill.targetPlotId = target.plotSlotId;
      if (plot.kind === 'xy')
        for (const drop of Object.values(plot.dropLines ?? {}))
          if (drop.target.mode === 'next-curve' && !drop.target.plotSlotId)
            drop.target.plotSlotId = target.plotSlotId;
    }
  }
  for (const plot of panel.plotSlots) {
    if (plot.visible === false) continue;
    try {
      const item = preparePlot(plot, data, panel.axes);
      if (plot.kind === 'xy' && plot.subset && item.xyRows) {
        const subset = prepareCurveSubset(plot, data, item.xyRows);
        item.xyRows = {
          ...item.xyRows,
          segments: subset.segments(item.xyRows.segments),
          displaySegments: subset.segments(item.xyRows.displaySegments),
          exportSegments: subset.segments(item.xyRows.exportSegments),
        };
        item.segments = item.xyRows.segments;
      }
      if (plot.kind === 'box') {
        const dim = categoricalDimension(plot) === 'x' ? 'y' : 'x';
        const axis = panel.axes.find(
          (a) => a.axisId === (dim === 'x' ? plot.xAxisId : plot.yAxisId),
        );
        if (
          axis &&
          isPositiveLogAxis(axis) &&
          (dim === 'x' ? item.xValues : item.yValues).some((v) => v <= 0)
        )
          throw new Error('对数箱线图包含非正样本，请改用线性轴');
      }
      plots.push(item);
    } catch (cause) {
      diagnostics.push({
        ...diagnostic(
          panel,
          plot.plotSlotId,
          describePlotFailure(plot, data, cause),
        ),
        ...((plot.kind === 'xy' && plot.subset) ||
        panel.stack?.members.includes(plot.plotSlotId)
          ? { severity: 'error' as const }
          : {}),
      });
    }
  }
  const failures = arrangeBands(plots);
  for (const { item, cause } of failures)
    diagnostics.push(diagnostic(panel, item.plot.plotSlotId, cause));
  const valid = plots.filter((item) => !failures.some((f) => f.item === item));
  try {
    const transformed = prepareCurveTransforms(panel, valid, data);
    for (const item of transformed.prepared) {
      item.curveGeometry = {
        lineSegments: transformed.lines.get(item.plot.plotSlotId),
        offset: transformed.offsets.get(item.plot.plotSlotId),
        targets: transformed.prepared,
        sourceRows: transformed.sourceRows.get(item.plot.plotSlotId),
        errorTransform: transformed.errorTransforms.get(item.plot.plotSlotId),
      };
      if (
        item.plot.kind === 'xy' &&
        item.plot.errorBarStyle?.visible &&
        item.curveGeometry.errorTransform
      ) {
        for (const row of item.curveGeometry.sourceRows?.calculationRows ??
          []) {
          const transform = item.curveGeometry.errorTransform(row);
          if (!transform) continue;
          const xs =
            errorRange(item.plot, data, {
              prefix: 'x',
              index: row.sourceIndex,
              base: row.x,
            }) ?? [];
          const ys =
            errorRange(item.plot, data, {
              prefix: 'y',
              index: row.sourceIndex,
              base: row.y,
            }) ?? [];
          item.xValues.push(...xs.map((v) => v + transform.xOffset));
          item.yValues.push(...ys.map(transform.mapY));
        }
      }
      item.curveFills = transformed.fills.filter(
        (f) => f.plotSlotId === item.plot.plotSlotId,
      );
      item.curveTotals = transformed.totals.filter(
        (f) => f.plotSlotId === item.plot.plotSlotId,
      );
      item.replaceAreaFill =
        item.plot.kind === 'area' &&
        (!!item.plot.transform?.fill ||
          !!panel.stack?.members.includes(item.plot.plotSlotId));
    }
    return transformed.prepared;
  } catch (cause) {
    diagnostics.push({ ...diagnostic(panel, '', cause), severity: 'error' });
    return [];
  }
}
function draw(
  item: PreparedPlot,
  options: {
    data: DataBindingSet;
    context: ChartContext;
    purpose: 'display' | 'export';
    detailLegends: MarkerLegendSamples;
  },
  diagnostics: RenderDiagnostic[],
): string {
  const { data, context } = options;
  const plot = item.plot;
  if (plot.kind === 'xy') {
    const detailed = plot.markerDetails
      ? renderMarkerDetailPlot(
          plot,
          data,
          context,
          plot.markerDetails,
          options.purpose,
          item.xyRows,
          item.curveGeometry,
        )
      : undefined;
    const rendered =
      detailed ??
      (plot.markerMapping || plot.markerOverrides
        ? renderMappedPlot(
            plot,
            data,
            context,
            undefined,
            options.purpose,
            item.xyRows,
            item.curveGeometry,
          )
        : renderPlot(
            plot,
            data,
            context,
            options.purpose,
            item.xyRows,
            undefined,
            undefined,
            item.curveGeometry,
          ));
    if (!rendered) throw new Error('Plot bindings are not available');
    if (detailed?.legendSamples.length || rendered.lineColorForRow) {
      const rows =
        item.curveGeometry?.sourceRows?.rawRows ?? item.xyRows?.rawRows ?? [];
      const representative = item.xyRows?.rawRows[0];
      const marker =
        representative && rendered.markerForRow
          ? rendered.markerForRow(representative)
          : plot.markerStyle;
      const samples: import('./marker-details.js').MarkerLegendSample[] =
        detailed?.legendSamples.length
          ? detailed.legendSamples
          : [
              {
                style: marker ?? {
                  visible: false,
                  shape: 'circle' as const,
                  sizePt: 0,
                  stroke: '#000000',
                  fill: 'none',
                  strokeWidthPt: 0,
                },
              },
            ];
      options.detailLegends.set(
        plot.plotSlotId,
        samples.map((sample) => {
          const row =
            sample.row === undefined
              ? rows[0]
              : rows.find((r) => r.sourceIndex === sample.row! - 1);
          return {
            ...sample,
            ...(row && rendered.lineColorForRow
              ? { lineColor: rendered.lineColorForRow(row) }
              : {}),
          };
        }),
      );
    }
    diagnostics.push(...rendered.diagnostics);
    if (rendered.skipped > item.skipped)
      diagnostics.push({
        code: 'RENDER_DATA_INVALID',
        severity: 'warning',
        sourcePath: '/plotSlots/' + plot.plotSlotId,
        message: '非正或超出坐标范围的数据已跳过',
      });
    return (
      renderCurveDecorations(item, context, 'fill') +
      rendered.svg +
      renderCurveDecorations(item, context, 'totals')
    );
  }
  const svg =
    renderBars(item, context) +
    renderBoxes(item, context) +
    renderArea(
      plot.kind === 'area'
        ? {
            ...item,
            plot: {
              ...plot,
              baseline: plot.baseline + (item.curveGeometry?.offset?.y ?? 0),
              ...(item.replaceAreaFill
                ? {
                    fillStyle: {
                      ...plot.fillStyle,
                      opacity: 0,
                      borderWidthPt: 0,
                    },
                  }
                : {}),
            },
          }
        : item,
      context,
    ) +
    renderHeatmap(item, context) +
    renderContour(item, context);
  const labels = renderChartDataLabels(item, data, context);
  diagnostics.push(...labels.diagnostics);
  return `<g data-role="plot-slot" data-kind="${plot.kind}" data-plot-slot-id="${escapeXml(plot.plotSlotId)}">${renderCurveDecorations(item, context, 'fill')}${svg}${labels.svg}${renderCurveDecorations(item, context, 'totals')}</g>`;
}
function renderCurveDecorations(
  item: PreparedPlot,
  context: ChartContext,
  kind: 'fill' | 'totals',
) {
  const point = (p: { x: number; y: number }) => {
    const x = context.rect.x + context.xScale.map(p.x) * context.rect.width;
    const y =
      context.rect.y + (1 - context.yScale.map(p.y)) * context.rect.height;
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new Error('偏移、堆叠或填充超出坐标轴定义域');
    return { x: formatNumber(x), y: formatNumber(y) };
  };
  return kind === 'fill'
    ? (item.curveFills ?? [])
        .map(
          (fill) =>
            `<polygon data-role="curve-fill" data-plot-slot-id="${escapeXml(item.plot.plotSlotId)}" points="${(context.dataClip
              ? clipDataPolygon(fill.points, context.dataClip)
              : fill.points
            )
              .map((p) => {
                const q = point(p);
                return `${q.x},${q.y}`;
              })
              .join(
                ' ',
              )}" fill="${paintValue(fill.paint, fill.color)}" fill-opacity="${formatNumber(fill.opacity)}"/>`,
        )
        .join('')
    : (item.curveTotals ?? [])
        .filter((p) => containsDataPoint(p, context.dataClip))
        .map((total) => {
          const p = point(total);
          // 总计是数字文本，宽度沿用标签的字宽估计；夹住字形边界而非锚点。
          const { rect } = context,
            font = total.fontSizePt,
            inset = 1;
          const halfWidth = (total.text.length * font * 0.62) / 2 + inset;
          const x = Math.max(
            rect.x + halfWidth,
            Math.min(Number(p.x), rect.x + rect.width - halfWidth),
          );
          const y = Math.max(
            rect.y + font + inset,
            Math.min(
              Number(p.y) + (total.y >= 0 ? -4 : 12),
              rect.y + rect.height - font * 0.25 - inset,
            ),
          );
          return `<text data-role="stack-total" x="${formatNumber(x)}" y="${formatNumber(y)}" text-anchor="middle" fill="${escapeXml(total.color)}" font-size="${formatNumber(font)}">${escapeXml(total.text)}</text>`;
        })
        .join('');
}
function warnSkipped(
  item: PreparedPlot,
  panel: Panel,
  diagnostics: RenderDiagnostic[],
) {
  for (const message of item.errorWarnings ?? [])
    diagnostics.push(diagnostic(panel, item.plot.plotSlotId, message));
  if (item.skipped)
    diagnostics.push(
      diagnostic(
        panel,
        item.plot.plotSlotId,
        `${item.skipped} 个缺失、无效或范围外数据已跳过`,
      ),
    );
}
function contextFor(
  item: PreparedPlot,
  options: { rect: Rect; scales: Map<string, PlotScale> },
): ChartContext {
  const xScale = options.scales.get(item.plot.xAxisId),
    yScale = options.scales.get(item.plot.yAxisId);
  if (!xScale || !yScale) throw new Error('Cannot derive finite axis ranges');
  return { rect: options.rect, xScale, yScale };
}
function drawAll(
  plots: PreparedPlot[],
  options: {
    data: DataBindingSet;
    rect: Rect;
    panel: Panel;
    scales: Map<string, PlotScale>;
    colorbarHeight?: number | undefined;
    purpose: 'display' | 'export';
  },
  diagnostics: RenderDiagnostic[],
) {
  const ids = new Set<string>();
  const detailLegends: MarkerLegendSamples = new Map();
  let svg = '',
    bars = '';
  const colorIndexes = new Map<string, number>();
  const colorOffsets = new Map<string, number>();
  for (const item of plots) {
    const plot = item.plot;
    try {
      const context = contextFor(item, options);
      const renderContext = (context: ChartContext) =>
        draw(
          item,
          {
            data: options.data,
            context,
            purpose: options.purpose,
            detailLegends,
          },
          diagnostics,
        );
      const plotSvg =
        context.xScale.segments || context.yScale.segments
          ? scaleCells(context.rect, context.xScale, context.yScale)
              .map((cell, i) =>
                clippedCell(
                  `plot-segment-${plot.plotSlotId}-${i}`,
                  cell.rect,
                  renderContext({
                    ...cell,
                    dataClip: {
                      xMin: cell.xScale.min,
                      xMax: cell.xScale.max,
                      yMin: cell.yScale.min,
                      yMax: cell.yScale.max,
                    },
                    clipSuffix: `-${i}`,
                  }),
                ),
              )
              .join('')
          : renderContext(context);
      warnSkipped(item, options.panel, diagnostics);
      if (
        (plot.kind === 'heatmap' || plot.kind === 'contour') &&
        plot.colorScale.colorbar.visible &&
        (item.grid || item.irregular)
      ) {
        const orientation = plot.colorScale.colorbar.orientation ?? 'vertical',
          side =
            plot.colorScale.colorbar.side ??
            (orientation === 'vertical' ? 'right' : 'bottom'),
          colorIndex = colorIndexes.get(side) ?? 0,
          colorOffset = colorOffsets.get(side) ?? 0;
        colorIndexes.set(side, colorIndex + 1);
        colorOffsets.set(side, colorOffset + colorbarSlotSize(plot));
        bars += renderColorbar(
          plot.colorScale,
          item.grid?.values ?? item.irregular!.points.map((point) => point.z),
          {
            rect: options.rect,
            index: colorIndex,
            offset: colorOffset,
            id: 'color-' + plot.plotSlotId,
            availableHeight: options.colorbarHeight,
          },
        );
      }
      svg += plotSvg;
      ids.add(plot.plotSlotId);
    } catch (cause) {
      diagnostics.push({
        ...diagnostic(
          options.panel,
          plot.plotSlotId,
          describePlotFailure(plot, options.data, cause),
        ),
        severity:
          ('dataLabels' in plot && plot.dataLabels?.visible) ||
          ('transform' in plot && !!plot.transform) ||
          (plot.kind === 'xy' &&
            (!!plot.lineMapping ||
              !!plot.subset ||
              !!plot.errorDetails ||
              Object.values(plot.dropLines ?? {}).some(
                (d) => d.selection || d.target.mode === 'next-curve',
              ))) ||
          (plot.kind === 'xy' &&
            ((plot.markerDetails &&
              Object.keys(plot.markerDetails).length > 0) ||
              (plot.lineConnection === 'spline' &&
                plot.mode !== 'markers' &&
                plot.lineStyle?.visible)))
            ? 'error'
            : 'warning',
      });
    }
  }
  return { svg, bars, ids, detailLegends };
}
type PreparedPanel = {
  purpose?: 'display' | 'export';
  panel: Panel;
  plots: PreparedPlot[];
  shared: Map<string, PlotScale>;
  diagnostics: RenderDiagnostic[];
};
export function renderPanel(
  template: FigureTemplate,
  data: DataBindingSet,
  prepared: PreparedPanel,
): {
  svg: string;
  diagnostics: RenderDiagnostic[];
  ids?: Set<string>;
  detailLegends?: MarkerLegendSamples;
} {
  const { panel, plots, shared, diagnostics } = prepared;
  if (panel.visible === false) return { svg: '', diagnostics, ids: new Set() };
  try {
    const available = layerGeometry(
      panel.frame,
      pageGeometry(template.page).page,
      colorbarLayout(plots.map((item) => item.plot)),
    );
    const visiblePlots = panel.plotSlots.filter(
      (plot) => plot.visible !== false,
    );
    if (
      available.plot.width < MIN_PLOT_WIDTH ||
      available.plot.height < MIN_PLOT_HEIGHT
    )
      throw new Error('图层尺寸不足以排列颜色条，请扩大图层或隐藏部分颜色条');
    const scales = new Map<string, PlotScale>();
    const sharedIds = new Set(
      template.sharedAxisGroups?.flatMap((group) =>
        group.members.map((member) => member.axisId),
      ),
    );
    for (const axis of panel.axes) {
      const scale =
        shared.has(axis.axisId) || sharedIds.has(axis.axisId)
          ? shared.get(axis.axisId)
          : prepareAxisScale(axis, plots, data);
      if (scale) scales.set(axis.axisId, scale);
    }
    const aligned = alignYAxisScales(panel, scales);
    if (aligned.ok && aligned.warning)
      diagnostics.push({
        code: 'RENDER_DATA_INVALID',
        severity: 'warning',
        sourcePath: `/panels/${panel.panelId}/yAxisAlignment`,
        message: aligned.warning,
      });
    if (!aligned.ok)
      diagnostics.push({
        code: 'RENDER_DATA_INVALID',
        severity: 'error',
        sourcePath: `/panels/${panel.panelId}/yAxisAlignment`,
        message: aligned.message,
      });
    const effectiveScales = aligned.scales;
    const geometry = constrainAxisLengths(
      available,
      panel.axisLengthRatio,
      effectiveScales,
    );
    const rect = geometry.plot;
    const clipRect = layerClipRect(panel, rect);
    const drawn = drawAll(
      plots,
      {
        data,
        rect,
        panel,
        purpose: prepared.purpose ?? 'display',
        scales: effectiveScales,
        colorbarHeight:
          geometry.status === 'active' ? geometry.layer.height : undefined,
      },
      diagnostics,
    );
    if (visiblePlots.length > 0 && !drawn.ids.size)
      throw new Error('没有可绘制的图表，请检查数据绑定和坐标范围');
    const clipId = 'panel-clip-' + panel.panelId;
    const gridClipId =
      clipRect === rect ? clipId : 'panel-grid-clip-' + panel.panelId;
    let segmentClips = '';
    let referenceLayer = '',
      rugLayer = '';
    let backGrid = '',
      frontGrid = '';
    const axes = panel.axes
      .map((axis) => {
        const exactScale = effectiveScales.get(axis.axisId);
        const shell =
          !exactScale &&
          visiblePlots.length > 0 &&
          axis.visible &&
          axis.placement?.mode !== 'cross'
            ? frameOnlyAxis(axis)
            : undefined;
        const scale = exactScale ?? (shell && createScale(shell, 0, 1));
        try {
          if (!scale) return '';
          const decorations = renderAxisDecorations(
            axis,
            panel,
            rect,
            scale,
            effectiveScales,
            plots,
            data,
          );
          referenceLayer += decorations.behind;
          rugLayer += decorations.ahead;
          const renderedAxis = shell ?? axis;
          const renderScales = exactScale
            ? effectiveScales
            : new Map(effectiveScales).set(axis.axisId, scale);
          const options = readAxisAppearance(renderedAxis);
          const context = {
            axes: panel.axes,
            scales: renderScales,
            gridClipId,
          };
          const boundPlot = plots.find(
            (p) =>
              (axis.dimension === 'x' ? p.plot.xAxisId : p.plot.yAxisId) ===
              axis.axisId,
          );
          const oppositeId = boundPlot
            ? axis.dimension === 'x'
              ? boundPlot.plot.yAxisId
              : boundPlot.plot.xAxisId
            : panel.axes.find((a) => a.dimension !== axis.dimension)?.axisId;
          const opposite = oppositeId
            ? effectiveScales.get(oppositeId)
            : undefined;
          if (opposite && (scale.segments || opposite.segments)) {
            context.gridClipId = `axis-grid-segments-${axis.axisId}`;
            segmentClips += cellClip(
              context.gridClipId,
              scaleCells(
                rect,
                axis.dimension === 'x' ? scale : opposite,
                axis.dimension === 'y' ? scale : opposite,
              ).map((c) => c.rect),
            );
          }
          const placement = options.placement;
          if (
            axis.visible &&
            visiblePlots.length === 0 &&
            placement?.mode === 'cross' &&
            !effectiveScales.has(placement.axisId) &&
            panel.axes.some(
              (candidate) =>
                candidate.axisId === placement.axisId &&
                candidate.range.mode !== 'fixed',
            )
          ) {
            // 空层没有目标自动范围时仅验证其余属性，不绘制虚构的交叉位置。
            validateAxisAppearance(
              axis,
              rect,
              scale,
              {
                ...options,
                placement: {
                  mode: 'frame',
                  ...(placement.offsetPt === undefined
                    ? {}
                    : { offsetPt: placement.offsetPt }),
                },
              },
              context,
            );
            return '';
          }
          const rendered = renderAxisAppearance(
            renderedAxis,
            rect,
            scale,
            options,
            context,
          );
          if (rendered.gridLayer === 'front') frontGrid += rendered.gridSvg;
          else backGrid += rendered.gridSvg;
          return `<g data-axis-id="${escapeXml(axis.axisId)}">${rendered.axisSvg}</g>`;
        } catch (cause) {
          diagnostics.push(
            axisTickDiagnostic(panel.panelId, axis.axisId, cause),
          );
          return '';
        }
      })
      .join('');
    const annotations = renderPanelAnnotations(template.annotations, panel, {
      rect,
      scales: effectiveScales,
    });
    const clip = `<defs><clipPath id="${escapeXml(clipId)}"><rect data-role="panel-clip" x="${formatNumber(clipRect.x)}" y="${formatNumber(clipRect.y)}" width="${formatNumber(clipRect.width)}" height="${formatNumber(clipRect.height)}" /></clipPath></defs>`;
    const gridClip =
      gridClipId === clipId
        ? ''
        : `<defs><clipPath id="${escapeXml(gridClipId)}"><rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" /></clipPath></defs>`;
    const clipped = panel.clip ? ` clip-path="url(#${escapeXml(clipId)})"` : '';
    const axisLayer = `<g data-role="axes">${axes}${rugLayer}</g>`;
    const plotLayer = `<g data-role="plots"${clipped}>${drawn.svg}</g>`;
    // 前网格位于曲线上方、轴文字下方；未启用前网格时保留旧装配顺序和字节。
    const legacyContent = frontGrid
      ? `${backGrid}${plotLayer}${frontGrid}${axisLayer}`
      : `${backGrid}${axisLayer}${plotLayer}`;
    const order = panel.appearance?.dataOnTopOfAxes;
    const content =
      order === undefined
        ? legacyContent
        : order
          ? `${backGrid}${axisLayer}${plotLayer}${frontGrid}`
          : `${backGrid}${plotLayer}${frontGrid}${axisLayer}`;
    const appearance = renderLayerAppearance(panel, geometry.layer);
    return {
      svg: `<g data-role="panel" data-panel-id="${escapeXml(panel.panelId)}">${clip}${gridClip}${segmentClips}${appearance.behind}${referenceLayer}${content}${appearance.ahead}${renderSeriesLegend(template, panel, { rect, renderedPlotIds: drawn.ids, samples: drawn.detailLegends })}${drawn.bars}<g data-role="annotations">${annotations}</g></g>`,
      diagnostics,
      ids: drawn.ids,
      detailLegends: drawn.detailLegends,
    };
  } catch (cause) {
    diagnostics.push({ ...diagnostic(panel, '', cause), severity: 'error' });
    return { svg: '', diagnostics };
  }
}
import { isPositiveLogAxis } from '@plot-fig/figure-schema';
