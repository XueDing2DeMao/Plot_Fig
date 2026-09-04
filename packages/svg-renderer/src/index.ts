import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { RenderResult } from './types.js';

export type { RenderDiagnostic, RenderResult, RendererInput } from './types.js';

export function renderFigureSvg(
  template: FigureTemplate,
  data: DataBindingSet,
): RenderResult {
  if (!validateFigureTemplate(template).ok) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'RENDER_TEMPLATE_INVALID',
          severity: 'error',
          sourcePath: '/',
          message: 'FigureTemplate failed validation',
        },
      ],
    };
  }
  if (data.kind !== 'data-binding-set' || data.version !== '1.0.0') {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'RENDER_DATA_INVALID',
          severity: 'error',
          sourcePath: '/',
          message: 'DataBindingSet version is unsupported',
        },
      ],
    };
  }
  return {
    ok: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" data-role="figure" />',
    diagnostics: [
      {
        code: 'RENDER_NOT_IMPLEMENTED',
        severity: 'warning',
        sourcePath: '/',
        message: 'XY rendering is pending',
      },
    ],
  };
}
