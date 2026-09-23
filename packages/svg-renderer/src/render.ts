import { paintDefinitions, paintValue } from './paint.js';
import { validateXyLineConnections } from './xy-line-validation.js';
import { publicationDiagnostics } from './publication-diagnostics.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  validateFigureTemplate,
  resolvePanelFrames,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { escapeXml, formatNumber } from './geometry.js';
import { renderPageAnnotations } from './annotations.js';
import { renderPanel, preparePanel } from './panel.js';
import { sharedScales } from './shared-scales.js';
import { renderPageLegends } from './legend.js';
import type { MarkerLegendSamples } from './marker-details.js';
import { pageViewport } from './page-size.js';
import { resolveCurveGroups } from './curve-groups.js';
import type { RenderDiagnostic, RenderResult } from './types.js';

function failure(
  code: RenderDiagnostic['code'],
  message: string,
): RenderResult {
  return {
    ok: false,
    diagnostics: [{ code, severity: 'error', sourcePath: '/', message }],
  };
}

function openSvg(template: FigureTemplate): string {
  const viewport = pageViewport(template.page);
  const width = formatNumber(viewport.width);
  const height = formatNumber(viewport.height);
  const font = template.theme.font;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(template.page.size.width.value)}${template.page.size.width.unit}" height="${formatNumber(template.page.size.height.value)}${template.page.size.height.unit}" viewBox="0 0 ${width} ${height}" role="img" aria-label="图形预览" data-role="figure" font-family="${escapeXml(font.family)}" font-size="${formatNumber(font.sizePt)}" fill="${escapeXml(font.color)}">${paintDefinitions(template)}<rect data-role="page-background" width="${width}" height="${height}" fill="${paintValue(template.page.backgroundPaint, template.page.background)}" />`;
}

export function renderTemplateSvg(
  template: FigureTemplate,
  data: DataBindingSet,
  options: { purpose?: 'display' | 'export' } = {},
): RenderResult {
  const invalid = validateRenderInput(template, data);
  if (invalid) return invalid;
  template = resolvePanelFrames(template);
  template = { ...template, panels: template.panels.map(resolveCurveGroups) };
  const viewport = pageViewport(template.page);
  let svg = openSvg(template);
  const diagnostics: RenderDiagnostic[] = [];
  const prepared = new Map(
    template.panels.map((panel) => [
      panel.panelId,
      preparePanel(panel, data, diagnostics),
    ]),
  );
  let shared: ReturnType<typeof sharedScales>;
  try {
    shared = sharedScales(template, prepared, data);
  } catch (cause) {
    return failure(
      'RENDER_TEMPLATE_INVALID',
      cause instanceof Error ? cause.message : '共享轴范围无法求值',
    );
  }
  const ids = new Set<string>();
  const detailLegends: MarkerLegendSamples = new Map();
  for (const panel of template.panels) {
    const rendered = renderPanel(template, data, {
      panel,
      plots: prepared.get(panel.panelId)!,
      shared,
      diagnostics: [],
      purpose: options.purpose ?? 'display',
    });
    svg += rendered.svg;
    diagnostics.push(...rendered.diagnostics);
    for (const id of rendered.ids ?? []) ids.add(id);
    for (const [id, samples] of rendered.detailLegends ?? [])
      detailLegends.set(id, samples);
  }
  svg +=
    renderPageAnnotations(template.annotations, viewport) +
    renderPageLegends(template, ids, viewport, detailLegends);
  svg += '</svg>';
  diagnostics.push(...publicationDiagnostics(template, svg));
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error'))
    return { ok: false, diagnostics };
  return { ok: true, svg, diagnostics };
}

function validateRenderInput(
  template: FigureTemplate,
  data: DataBindingSet,
): RenderResult | undefined {
  if (!validateFigureTemplate(template).ok)
    return failure(
      'RENDER_TEMPLATE_INVALID',
      'FigureTemplate failed validation',
    );
  const viewport = pageViewport(template.page);
  if (
    ![viewport.width, viewport.height].every((n) => Number.isFinite(n) && n > 0)
  )
    return failure(
      'RENDER_TEMPLATE_INVALID',
      'Page dimensions must be positive and finite',
    );
  if (data.kind !== 'data-binding-set' || data.version !== '1.0.0')
    return failure(
      'RENDER_DATA_INVALID',
      'DataBindingSet version is unsupported',
    );
  const diagnostics = validateXyLineConnections(template, data);
  return diagnostics.length ? { ok: false, diagnostics } : undefined;
}
