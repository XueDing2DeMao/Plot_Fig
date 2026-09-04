import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';

export type RenderDiagnostic = {
  code:
    | 'RENDER_TEMPLATE_INVALID'
    | 'RENDER_DATA_INVALID'
    | 'RENDER_NOT_IMPLEMENTED';
  severity: 'warning' | 'error';
  sourcePath: string;
  message: string;
};

export type RenderResult =
  | { ok: true; svg: string; diagnostics: RenderDiagnostic[] }
  | { ok: false; diagnostics: RenderDiagnostic[] };

export type RendererInput = { template: FigureTemplate; data: DataBindingSet };
