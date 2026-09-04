import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { escapeXml, formatNumber } from './geometry.js';
import { renderPanel } from './panel.js';
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${formatNumber(template.page.size.width.value)}${template.page.size.width.unit}" height="${formatNumber(template.page.size.height.value)}${template.page.size.height.unit}" viewBox="0 0 1000 800" role="img" aria-label="XY 图形预览" data-role="figure"><rect data-role="page-background" width="1000" height="800" fill="${escapeXml(template.page.background)}" />`;
}

export function renderTemplateSvg(
  template: FigureTemplate,
  data: DataBindingSet,
): RenderResult {
  if (!validateFigureTemplate(template).ok)
    return failure(
      'RENDER_TEMPLATE_INVALID',
      'FigureTemplate failed validation',
    );
  if (data.kind !== 'data-binding-set' || data.version !== '1.0.0')
    return failure(
      'RENDER_DATA_INVALID',
      'DataBindingSet version is unsupported',
    );
  let svg = openSvg(template);
  const diagnostics: RenderDiagnostic[] = [];
  for (const panel of template.panels) {
    const rendered = renderPanel(template, data, panel);
    svg += rendered.svg;
    diagnostics.push(...rendered.diagnostics);
  }
  svg += '</svg>';
  if (diagnostics.some((diagnostic) => diagnostic.severity === 'error'))
    return { ok: false, diagnostics };
  return { ok: true, svg, diagnostics };
}
