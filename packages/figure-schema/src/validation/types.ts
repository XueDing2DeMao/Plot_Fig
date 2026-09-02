export type ValidationIssue = {
  code: 'FIGURE_SCHEMA_INVALID' | 'FIGURE_DOMAIN_INVARIANT_FAILED';
  path: string;
  message: string;
};

export type ValidationResult<T> =
  { ok: true; value: T; issues: [] } | { ok: false; issues: ValidationIssue[] };
