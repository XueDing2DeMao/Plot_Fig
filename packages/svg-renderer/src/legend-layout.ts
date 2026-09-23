import {
  defaultLegendLayout,
  type FigureTemplate,
  type Annotation,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import { escapeXml as esc, formatNumber as n, type Rect } from './geometry.js';
import { legendSample } from './legend-sample.js';
import { renderDetailedLegendLayout } from './legend-detail-layout.js';
import { measureLegendText, renderLegendText } from './legend-text.js';
import type { MarkerLegendSamples } from './marker-details.js';

type Legend = Extract<Annotation, { kind: 'legend' }>;

export function renderLegendLayout(
  template: FigureTemplate,
  entries: PlotSlot[],
  options: { legend: Legend; rect: Rect; samples?: MarkerLegendSamples },
): string {
  const { legend, rect } = options;
  if (!legend.visible || !entries.length) return '';
  if (
    options.samples &&
    entries.some((plot) => options.samples!.has(plot.plotSlotId))
  )
    return renderDetailedLegendLayout(template, entries, {
      ...options,
      samples: options.samples,
    });
  const { layout, columns, widths, heights, width, height, x, y } =
    legendGeometry(template, entries, { legend, rect });
  const items = entries
    .map((plot, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const sampleX =
        x +
        layout.paddingPt +
        widths.slice(0, column).reduce((sum, value) => sum + value, 0) +
        column * layout.columnGapPt;
      const centerY =
        y +
        layout.paddingPt +
        heights.slice(0, row).reduce((sum, value) => sum + value, 0) +
        row * layout.rowGapPt +
        heights[row]! / 2;
      const sample = `<g transform="translate(${n(sampleX)} ${n(centerY)})">${legendSample(plot, layout.sampleWidthPt)}</g>`;
      const textX = sampleX + layout.sampleWidthPt + 8;
      return `<g data-role="legend-entry" data-legend-index="${index}" data-plot-slot-id="${esc(plot.plotSlotId)}">${sample}${renderLegendText(template, legend, plot.legendEntry.text, textX, centerY, plot.legendEntry.format, `legend-${legend.annotationId}-${plot.plotSlotId}`)}</g>`;
    })
    .join('');
  return `<g data-role="legend" data-annotation-id="${esc(legend.annotationId)}" data-bounds="${n(x)} ${n(y)} ${n(width)} ${n(height)}"><rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" fill="${esc(layout.background)}" stroke="${esc(layout.borderColor)}" stroke-width="${n(layout.borderWidthPt)}" />${items}</g>`;
}

function legendGeometry(
  template: FigureTemplate,
  entries: PlotSlot[],
  { legend, rect }: { legend: Legend; rect: Rect },
) {
  const layout = legend.layout ?? defaultLegendLayout();
  const sizes = entries.map((plot) =>
    measureLegendText(
      template,
      legend,
      plot.legendEntry.text,
      plot.legendEntry.format,
      `legend-${legend.annotationId}-${plot.plotSlotId}`,
    ),
  );
  const columns = Math.min(
    layout.direction === 'horizontal' ? entries.length : layout.columns,
    entries.length,
  );
  const rows = Math.ceil(entries.length / columns);
  const widths = Array.from(
    { length: columns },
    (_, column) =>
      Math.max(
        ...sizes
          .filter((_, index) => index % columns === column)
          .map((size) => size.width),
      ) +
      layout.sampleWidthPt +
      8,
  );
  const heights = Array.from({ length: rows }, (_, row) =>
    Math.max(
      ...sizes
        .slice(row * columns, (row + 1) * columns)
        .map((size) => size.height),
    ),
  );
  const width =
    widths.reduce((sum, value) => sum + value, 0) +
    layout.columnGapPt * (columns - 1) +
    2 * layout.paddingPt;
  const height =
    heights.reduce((sum, value) => sum + value, 0) +
    layout.rowGapPt * (rows - 1) +
    2 * layout.paddingPt;
  const positionX = rect.x + legend.position.x * rect.width;
  const positionY = rect.y + (1 - legend.position.y) * rect.height;
  const x = positionX - (layout.anchor.endsWith('right') ? width : 0);
  const y = positionY - (layout.anchor.startsWith('bottom') ? height : 0);
  return { layout, columns, widths, heights, width, height, x, y };
}
