import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { mapOriginSnapshot } from './map.js';
import { normalizeOriginSnapshot } from './normalize.js';
import { buildCompatibilityReport } from './report.js';
import { scrubOriginSnapshot } from './security.js';
import { validateOriginSnapshot } from './snapshot-schema.js';
import type {
  CompatibilityItem,
  ImportDiagnostic,
  ImportOriginOptions,
  ImportResult,
} from './types.js';

const emptyReport = () => buildCompatibilityReport([]);

export function importOriginSnapshot(
  input: unknown,
  options: ImportOriginOptions = {},
): ImportResult<FigureTemplate> {
  const importerVersion = options.importerVersion ?? '0.1.0';
  const parsed = validateOriginSnapshot(input);
  if (!parsed.ok) {
    return {
      status: 'failure',
      diagnostics: parsed.diagnostics,
      compatibilityReport: emptyReport(),
      provenance: { importerVersion },
    };
  }
  const provenance = {
    importerVersion,
    originVersion: parsed.value.originVersion,
    sourceHash: parsed.value.sourceHash,
  };
  const scrubbed = scrubOriginSnapshot(parsed.value);
  if (!scrubbed.ok) {
    return {
      status: 'failure',
      diagnostics: scrubbed.diagnostics,
      compatibilityReport: buildCompatibilityReport(scrubbed.items),
      provenance,
    };
  }
  const mapped = mapOriginSnapshot(
    normalizeOriginSnapshot(scrubbed.value),
    importerVersion,
  );
  const diagnostics: ImportDiagnostic[] = [
    ...scrubbed.diagnostics,
    ...mapped.diagnostics,
  ];
  const items: CompatibilityItem[] = [...scrubbed.items, ...mapped.items];
  if (diagnostics.some((entry) => entry.severity === 'error')) {
    return {
      status: 'failure',
      diagnostics,
      compatibilityReport: buildCompatibilityReport(items),
      provenance,
    };
  }
  const validation = validateFigureTemplate(mapped.value);
  if (!validation.ok) {
    diagnostics.push(
      ...validation.issues.map((entry) => ({
        code: entry.code,
        severity: 'error' as const,
        sourcePath: '/',
        targetPath: entry.path,
        message: entry.message,
        recoverable: false,
      })),
    );
    return {
      status: 'failure',
      diagnostics,
      compatibilityReport: buildCompatibilityReport(items),
      provenance,
    };
  }
  const partial = items.some((item) =>
    ['lossy', 'dropped', 'ignoredForSecurity'].includes(item.disposition),
  );
  return {
    status: partial ? 'partial' : 'success',
    value: validation.value,
    diagnostics,
    compatibilityReport: buildCompatibilityReport(items),
    provenance,
  };
}
