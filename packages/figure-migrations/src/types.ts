import type { FigureDocument, FigureTemplate } from '@plot-fig/figure-schema';

export type FigurePayload = FigureTemplate | FigureDocument;

export type MigrationDiagnostic = {
  code:
    | 'FIGURE_INVALID_ENVELOPE'
    | 'FIGURE_VERSION_UNSUPPORTED'
    | 'FIGURE_FUTURE_VERSION_UNSUPPORTED'
    | 'FIGURE_MIGRATION_FAILED'
    | 'FIGURE_SCHEMA_INVALID'
    | 'FIGURE_DOMAIN_INVARIANT_FAILED';
  severity: 'error';
  path: string;
  message: string;
};

export type LoadResult =
  | {
      ok: true;
      value: FigurePayload;
      migratedFrom?: string;
      diagnostics: [];
    }
  | {
      ok: false;
      diagnostics: MigrationDiagnostic[];
    };
