import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, panelRect, type Rect } from './geometry.js';
import { renderPanelAnnotations } from './annotations.js';
import { renderAxis } from './axis.js';
import { renderPlot } from './plot.js';
import { createScaleFromValues } from './scales.js';
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

function renderPlots(
  panel: FigureTemplate['panels'][number],
  data: DataBindingSet,
  rect: Rect,
  xScale: NonNullable<ReturnType<typeof createScaleFromValues>>,
  yScale: NonNullable<ReturnType<typeof createScaleFromValues>>,
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
      diagnostics.push(...rendered.diagnostics);
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
  const xScale = createScaleFromValues(
    xAxis,
    panel.plotSlots.flatMap((plot) => numericValues(data, plot.bindings.x)),
  );
  const yScale = createScaleFromValues(
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
  const axes = panel.axes
    .map((axis) =>
      renderAxis(axis, rect, axis.dimension === 'x' ? xScale : yScale),
    )
    .join('');
  const annotations = renderPanelAnnotations(
    template.annotations,
    panel,
    rect,
    xScale,
    yScale,
  );
  const svg = `<g data-role="panel" data-panel-id="${escapeXml(panel.panelId)}"><rect data-role="panel-clip" x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" fill="none" /><g data-role="axes">${axes}</g><g data-role="plot-slot">${plots.svg}</g><g data-role="annotations">${annotations}</g></g>`;
  return { svg, diagnostics: plots.diagnostics };
}
