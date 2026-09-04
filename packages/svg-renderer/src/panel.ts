import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, panelRect, type Rect } from './geometry.js';
import { renderPlot } from './plot.js';
import { createLinearScale } from './scales.js';
import type { RenderDiagnostic } from './types.js';

const viewport: Rect = { x: 0, y: 0, width: 1000, height: 800 };

function numericValues(data: DataBindingSet, slotId: string): number[] {
  const binding = data.bindings.find(
    (item) => item.dataSlotId === slotId && item.status === 'valid',
  );
  const column =
    binding && data.columns.find((item) => item.columnId === binding.columnId);
  return (
    column?.values.filter(
      (value): value is number => typeof value === 'number',
    ) ?? []
  );
}

function annotationSvg(
  annotation: FigureTemplate['annotations'][number],
  rect: Rect,
): string {
  if (annotation.kind === 'text')
    return `<text data-role="annotation-text" x="${formatNumber(rect.x + annotation.position.x * rect.width)}" y="${formatNumber(rect.y + (1 - annotation.position.y) * rect.height)}">${escapeXml(annotation.text)}</text>`;
  if (annotation.kind !== 'reference-line') return '';
  if (annotation.orientation === 'x')
    return `<line data-role="annotation-reference-line" x1="${formatNumber(rect.x)}" x2="${formatNumber(rect.x + rect.width)}" y1="${formatNumber(rect.y + rect.height / 2)}" y2="${formatNumber(rect.y + rect.height / 2)}" />`;
  return `<line data-role="annotation-reference-line" x1="${formatNumber(rect.x + rect.width / 2)}" x2="${formatNumber(rect.x + rect.width / 2)}" y1="${formatNumber(rect.y)}" y2="${formatNumber(rect.y + rect.height)}" />`;
}

function renderPlots(
  panel: FigureTemplate['panels'][number],
  data: DataBindingSet,
  rect: Rect,
  xScale: NonNullable<ReturnType<typeof createLinearScale>>,
  yScale: NonNullable<ReturnType<typeof createLinearScale>>,
) {
  let svg = '';
  const diagnostics: RenderDiagnostic[] = [];
  for (const plot of panel.plotSlots) {
    const rendered = renderPlot(plot, data, xScale, yScale, rect);
    const sourcePath = `/panels/${panel.panelId}/plotSlots/${plot.plotSlotId}`;
    if (!rendered)
      diagnostics.push({
        code: 'RENDER_DATA_INVALID',
        severity: 'error',
        sourcePath,
        message: 'Plot bindings are not available',
      });
    else {
      svg += rendered.svg;
      if (rendered.skipped > 0)
        diagnostics.push({
          code: 'RENDER_DATA_INVALID',
          severity: 'warning',
          sourcePath,
          message: `${rendered.skipped} data points were skipped`,
        });
    }
  }
  return { svg, diagnostics };
}

export function renderPanel(
  template: FigureTemplate,
  data: DataBindingSet,
  panel: FigureTemplate['panels'][number],
): { svg: string; diagnostics: RenderDiagnostic[] } {
  const rect = panelRect(panel.frame, viewport);
  const xAxis = panel.axes.find((axis) => axis.dimension === 'x');
  const yAxis = panel.axes.find((axis) => axis.dimension === 'y');
  if (!xAxis || !yAxis)
    return {
      svg: '',
      diagnostics: [
        {
          code: 'RENDER_DATA_INVALID',
          severity: 'error',
          sourcePath: `/panels/${panel.panelId}/axes`,
          message: 'Panel requires x and y axes',
        },
      ],
    };
  const xScale = createLinearScale(
    xAxis,
    panel.plotSlots.flatMap((plot) => numericValues(data, plot.bindings.x)),
  );
  const yScale = createLinearScale(
    yAxis,
    panel.plotSlots.flatMap((plot) => numericValues(data, plot.bindings.y)),
  );
  if (!xScale || !yScale)
    return {
      svg: '',
      diagnostics: [
        {
          code: 'RENDER_DATA_INVALID',
          severity: 'error',
          sourcePath: `/panels/${panel.panelId}`,
          message: 'Cannot derive finite axis ranges',
        },
      ],
    };
  const plots = renderPlots(panel, data, rect, xScale, yScale);
  const annotations = template.annotations
    .filter(
      (annotation) =>
        annotation.coordinateSpace !== 'page' &&
        annotation.panelId === panel.panelId,
    )
    .map((annotation) => annotationSvg(annotation, rect))
    .join('');
  const axes = `<g data-role="axes"><line x1="${formatNumber(rect.x)}" y1="${formatNumber(rect.y + rect.height)}" x2="${formatNumber(rect.x + rect.width)}" y2="${formatNumber(rect.y + rect.height)}" /><line x1="${formatNumber(rect.x)}" y1="${formatNumber(rect.y)}" x2="${formatNumber(rect.x)}" y2="${formatNumber(rect.y + rect.height)}" /></g>`;
  const svg = `<g data-role="panel" data-panel-id="${escapeXml(panel.panelId)}"><rect data-role="panel-clip" x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" fill="none" />${axes}<g data-role="plot-slot">${plots.svg}</g><g data-role="annotations">${annotations}</g></g>`;
  return { svg, diagnostics: plots.diagnostics };
}
