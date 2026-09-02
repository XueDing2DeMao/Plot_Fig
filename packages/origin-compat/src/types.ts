export type ImportDiagnosticCode =
  | 'ORIGIN_SNAPSHOT_INVALID'
  | 'ORIGIN_UNSUPPORTED_PROPERTY'
  | 'ORIGIN_LOSSY_CONVERSION'
  | 'ORIGIN_SCRIPT_IGNORED'
  | 'ORIGIN_DANGEROUS_KEY_REJECTED'
  | 'ORIGIN_INPUT_LIMIT_EXCEEDED'
  | 'ORIGIN_INVALID_REFERENCE'
  | 'FIGURE_SCHEMA_INVALID'
  | 'FIGURE_DOMAIN_INVARIANT_FAILED'
  | 'FIGURE_FUTURE_VERSION_UNSUPPORTED';

export type ImportDiagnostic = {
  code: ImportDiagnosticCode;
  severity: 'info' | 'warning' | 'error';
  message: string;
  sourcePath: string;
  targetPath?: string;
  recoverable: boolean;
  securityCategory?: 'script' | 'dangerous-key' | 'input-limit' | 'html';
};

export type CompatibilityDisposition =
  | 'mapped'
  | 'preservedInExtensions'
  | 'lossy'
  | 'dropped'
  | 'ignoredForSecurity';

export type CompatibilityItem = {
  sourcePath: string;
  targetPath?: string;
  disposition: CompatibilityDisposition;
  message: string;
};

export type CompatibilityCounts = {
  mapped: number;
  preservedInExtensions: number;
  lossy: number;
  dropped: number;
  ignoredForSecurity: number;
};

export type CompatibilityReport = {
  items: CompatibilityItem[];
  counts: CompatibilityCounts;
};

export type ImportProvenance = {
  importerVersion: string;
  originVersion?: string;
  sourceHash?: string;
};

type ImportBase = {
  diagnostics: ImportDiagnostic[];
  compatibilityReport: CompatibilityReport;
  provenance: ImportProvenance;
};

export type ImportResult<T> =
  | (ImportBase & { status: 'success' | 'partial'; value: T })
  | (ImportBase & { status: 'failure'; value?: never });

export type ImportOriginOptions = {
  importerVersion?: string;
};
