import type { ErrorObject } from 'ajv';
import {
  OriginTemplateSnapshotV1Schema,
  type OriginTemplateSnapshotV1,
} from './snapshot-contract.js';
import {
  appendPath,
  cloneForValidation,
  compareSemVer,
  isPlainRecord,
  parseSemVer,
  readIsArray,
  readOwnDataProperty,
} from './snapshot-validation-helpers.js';
import type { ImportDiagnostic } from './types.js';

type Ajv2020Constructor = typeof import('ajv/dist/2020.js').Ajv2020;
const CURRENT_SNAPSHOT_VERSION = '1.0.0' as const;

const Ajv2020 = (await import('ajv/dist/2020.js'))
  .Ajv2020 as Ajv2020Constructor;
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});
const validator = ajv.compile<OriginTemplateSnapshotV1>(
  OriginTemplateSnapshotV1Schema,
);

function diagnostic(
  code: ImportDiagnostic['code'],
  sourcePath: string,
  message: string,
): ImportDiagnostic {
  return {
    code,
    severity: 'error',
    sourcePath,
    message,
    recoverable: false,
  };
}

const currentVersion = (() => {
  const parsed = parseSemVer(CURRENT_SNAPSHOT_VERSION);
  if (parsed === undefined) {
    throw new Error(
      'Current snapshot version must be a strict semantic version',
    );
  }
  return parsed;
})();

function getFutureVersionDiagnostic(
  input: unknown,
): ImportDiagnostic | undefined {
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }
  const isArray = readIsArray(input);
  if (isArray !== false || !isPlainRecord(input)) {
    return undefined;
  }
  const version = readOwnDataProperty(input, 'snapshotVersion');
  if (!version.ok || typeof version.value !== 'string') {
    return undefined;
  }
  const parsed = parseSemVer(version.value);
  if (parsed === undefined || compareSemVer(parsed, currentVersion) <= 0) {
    return undefined;
  }
  return diagnostic(
    'FIGURE_FUTURE_VERSION_UNSUPPORTED',
    '/snapshotVersion',
    'snapshotVersion is newer than this validator supports',
  );
}

function getIssuePath(error: ErrorObject): string {
  if (error.keyword === 'required') {
    const missingProperty = (error.params as { missingProperty?: string })
      .missingProperty;
    if (missingProperty) {
      return appendPath(error.instancePath || '/', missingProperty);
    }
  }
  if (error.keyword === 'additionalProperties') {
    const additionalProperty = (error.params as { additionalProperty?: string })
      .additionalProperty;
    if (additionalProperty) {
      return appendPath(error.instancePath || '/', additionalProperty);
    }
  }
  return error.instancePath || '/';
}

function mapSchemaIssues(
  errors: ErrorObject[] | null | undefined,
): ImportDiagnostic[] {
  return (errors ?? [])
    .map((error) =>
      diagnostic(
        'ORIGIN_SNAPSHOT_INVALID',
        getIssuePath(error),
        error.message ?? 'Origin Snapshot failed schema validation',
      ),
    )
    .sort(
      (left, right) =>
        left.sourcePath.localeCompare(right.sourcePath) ||
        left.code.localeCompare(right.code) ||
        left.message.localeCompare(right.message),
    );
}

export { OriginTemplateSnapshotV1Schema } from './snapshot-contract.js';
export type { OriginTemplateSnapshotV1 } from './snapshot-contract.js';

export function validateOriginSnapshot(
  input: unknown,
):
  | { ok: true; value: OriginTemplateSnapshotV1 }
  | { ok: false; diagnostics: ImportDiagnostic[] } {
  try {
    const futureVersion = getFutureVersionDiagnostic(input);
    if (futureVersion) {
      return { ok: false, diagnostics: [futureVersion] };
    }

    const cloned = cloneForValidation(input);
    if (!cloned.ok) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            'ORIGIN_SNAPSHOT_INVALID',
            cloned.sourcePath,
            cloned.message,
          ),
        ],
      };
    }

    try {
      if (validator(cloned.value)) {
        return { ok: true, value: cloned.value };
      }
      return { ok: false, diagnostics: mapSchemaIssues(validator.errors) };
    } catch {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            'ORIGIN_SNAPSHOT_INVALID',
            '/',
            'Origin Snapshot validation failed unexpectedly',
          ),
        ],
      };
    }
  } catch {
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          'ORIGIN_SNAPSHOT_INVALID',
          '/',
          'Origin Snapshot validation failed unexpectedly',
        ),
      ],
    };
  }
}
