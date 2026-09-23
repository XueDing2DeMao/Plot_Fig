import {
  defaultLegendLayout,
  type FigureTemplate,
  type Annotation,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import { advancedMarkerRadius } from './marker-appearance.js';
import { legendSample } from './legend-sample.js';
import { escapeXml as esc, formatNumber as n, type Rect } from './geometry.js';
import { measureLegendText, renderLegendText } from './legend-text.js';
import type { MarkerLegendSamples } from './marker-details.js';
type Legend = Extract<Annotation, { kind: 'legend' }>;
// 只有配置符号细节的图例使用数据样本布局；旧图例保持原字节路径。
export function renderDetailedLegendLayout(
  template: FigureTemplate,
  plots: PlotSlot[],
  {
    legend,
    rect,
    samples,
  }: { legend: Legend; rect: Rect; samples: MarkerLegendSamples },
) {
  const layout = legend.layout ?? defaultLegendLayout();
  const entries = plots
    .flatMap<{ plot: PlotSlot; row: number | undefined; label: string }>(
      (plot) => {
        const detail = samples.get(plot.plotSlotId);
        return detail?.length
          ? detail.map((sample) => ({
              plot:
                plot.kind === 'xy'
                  ? {
                      ...plot,
                      markerStyle: sample.style,
                      ...(sample.lineColor && plot.lineStyle
                        ? {
                            lineStyle: {
                              ...plot.lineStyle,
                              color: sample.lineColor,
                            },
                          }
                        : {}),
                    }
                  : plot,
              row: sample.row,
              label:
                plot.legendEntry.text +
                (sample.label ? ' · ' + sample.label : ''),
            }))
          : [{ plot, row: undefined, label: plot.legendEntry.text }];
      },
    )
    .map((entry) => {
      const p = entry.plot,
        radius =
          p.kind === 'xy' && p.mode !== 'line' && p.markerStyle
            ? advancedMarkerRadius(p.markerStyle)
            : 0;
      const sampleWidth = Math.max(layout.sampleWidthPt, 2 * radius + 8);
      const textSize = measureLegendText(
        template,
        legend,
        entry.label,
        entry.plot.legendEntry.format,
        `legend-${legend.annotationId}-${entry.plot.plotSlotId}-${entry.row ?? 'all'}`,
      );
      return {
        ...entry,
        radius,
        sampleWidth,
        textHeight: textSize.height,
        width: sampleWidth + 8 + textSize.width,
      };
    });
  const columns = Math.min(
      layout.direction === 'horizontal' ? entries.length : layout.columns,
      entries.length,
    ),
    rows = Math.ceil(entries.length / columns);
  const widths = Array.from({ length: columns }, (_, c) =>
    Math.max(
      ...entries.filter((_, i) => i % columns === c).map((e) => e.width),
    ),
  );
  const heights = Array.from({ length: rows }, (_, r) =>
    Math.max(
      ...entries
        .slice(r * columns, (r + 1) * columns)
        .map((e) => Math.max(e.textHeight, 2 * e.radius + 4)),
    ),
  );
  const width =
      widths.reduce((a, b) => a + b, 0) +
      (columns - 1) * layout.columnGapPt +
      2 * layout.paddingPt,
    height =
      heights.reduce((a, b) => a + b, 0) +
      (rows - 1) * layout.rowGapPt +
      2 * layout.paddingPt;
  const x =
      rect.x +
      legend.position.x * rect.width -
      (layout.anchor.endsWith('right') ? width : 0),
    y =
      rect.y +
      (1 - legend.position.y) * rect.height -
      (layout.anchor.startsWith('bottom') ? height : 0);
  const content = entries
    .map((entry, i) => {
      const c = i % columns,
        r = Math.floor(i / columns),
        sx =
          x +
          layout.paddingPt +
          widths.slice(0, c).reduce((a, b) => a + b, 0) +
          c * layout.columnGapPt,
        sy =
          y +
          layout.paddingPt +
          heights.slice(0, r).reduce((a, b) => a + b, 0) +
          r * layout.rowGapPt +
          heights[r]! / 2,
        tx = sx + entry.sampleWidth + 8;
      return `<g data-role="legend-entry" data-legend-index="${i}" data-plot-slot-id="${esc(entry.plot.plotSlotId)}"${entry.row === undefined ? '' : ` data-source-row="${entry.row}"`}><g transform="translate(${n(sx)} ${n(sy)})">${legendSample(entry.plot, entry.sampleWidth)}</g>${renderLegendText(template, legend, entry.label, tx, sy, entry.plot.legendEntry.format, `legend-${legend.annotationId}-${entry.plot.plotSlotId}-${entry.row ?? 'all'}`)}</g>`;
    })
    .join('');
  return `<g data-role="legend" data-annotation-id="${esc(legend.annotationId)}" data-bounds="${n(x)} ${n(y)} ${n(width)} ${n(height)}"><rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" fill="${esc(layout.background)}" stroke="${esc(layout.borderColor)}" stroke-width="${n(layout.borderWidthPt)}"/>${content}</g>`;
}
