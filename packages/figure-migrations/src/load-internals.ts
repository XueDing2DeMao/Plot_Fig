import {
  canonicalizeFigurePayload,
  validateFigureDocument,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import type { LoadResult, MigrationDiagnostic } from './types.js';
import {
  parseSchemaVersion,
  readEnvelope,
  type PayloadKind,
  type SchemaVersion,
} from './version.js';

const CURRENT_SCHEMA_VERSION = '1.0.0';
const CURRENT_VERSION = parseSchemaVersion(CURRENT_SCHEMA_VERSION);

export type MigrationStep = {
  targetVersion: string;
  migrate: (input: unknown) => unknown;
};

export type MigrationLookup = (
  kind: PayloadKind,
  schemaVersion: string,
) => MigrationStep | undefined;

type SupportedEnvelope = {
  kind: PayloadKind;
  schemaVersion: string;
};

type SafeCloneResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      path: string;
    };

type ReflectionResult<T> = { ok: true; value: T } | { ok: false };

function compareVersions(left: SchemaVersion, right: SchemaVersion): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

function diagnostic(
  code: MigrationDiagnostic['code'],
  path: string,
  message: string,
): MigrationDiagnostic {
  return {
    code,
    severity: 'error',
    path,
    message,
  };
}

function fail(
  code: MigrationDiagnostic['code'],
  path: string,
  message: string,
): LoadResult {
  return {
    ok: false,
    diagnostics: [diagnostic(code, path, message)],
  };
}

function migrationFailed(): LoadResult {
  return fail('FIGURE_MIGRATION_FAILED', '/', 'migration pipeline failed');
}

function getCanonicalErrorPath(error: unknown): string {
  if (!(error instanceof Error)) {
    return '/';
  }

  const match = / at (\/.*)$/u.exec(error.message);
  return match?.[1] ?? '/';
}

function cloneCanonical(value: unknown): SafeCloneResult {
  try {
    return {
      ok: true,
      value: JSON.parse(canonicalizeFigurePayload(value)) as unknown,
    };
  } catch (error) {
    return {
      ok: false,
      path: getCanonicalErrorPath(error),
    };
  }
}

function reflect<T>(read: () => T): ReflectionResult<T> {
  try {
    return { ok: true, value: read() };
  } catch {
    return { ok: false };
  }
}

function readSupportedEnvelope(input: unknown): SupportedEnvelope | LoadResult {
  const envelope = readEnvelope(input);
  if (!envelope.ok) {
    return fail(
      'FIGURE_INVALID_ENVELOPE',
      '/',
      'kind and schemaVersion are required own data properties',
    );
  }

  const parsed = parseSchemaVersion(envelope.envelope.schemaVersion);
  if (!parsed) {
    return fail(
      'FIGURE_VERSION_UNSUPPORTED',
      '/schemaVersion',
      'schemaVersion must be a strict semantic version',
    );
  }

  if (!CURRENT_VERSION) {
    return migrationFailed();
  }

  if (compareVersions(parsed, CURRENT_VERSION) > 0) {
    return fail(
      'FIGURE_FUTURE_VERSION_UNSUPPORTED',
      '/schemaVersion',
      'schemaVersion is newer than this loader supports',
    );
  }

  return {
    kind: envelope.envelope.kind,
    schemaVersion: envelope.envelope.schemaVersion,
  };
}

function validateCurrent(
  kind: PayloadKind,
  value: unknown,
  migratedFrom?: string,
): LoadResult {
  const result =
    kind === 'figure-template'
      ? validateFigureTemplate(value)
      : validateFigureDocument(value);
  if (!result.ok) {
    return {
      ok: false,
      diagnostics: result.issues.map((issue) =>
        diagnostic(issue.code, issue.path, issue.message),
      ),
    };
  }

  return {
    ok: true,
    value: result.value,
    ...(migratedFrom ? { migratedFrom } : {}),
    diagnostics: [],
  };
}

function loadCurrentPayload(kind: PayloadKind, input: unknown): LoadResult {
  const cloned = cloneCanonical(input);
  if (!cloned.ok) {
    return fail(
      'FIGURE_SCHEMA_INVALID',
      cloned.path,
      'payload must be canonical JSON',
    );
  }

  return validateCurrent(kind, cloned.value);
}

function getMigrationStepOrFail(
  envelope: SupportedEnvelope,
  lookup: MigrationLookup,
): MigrationStep | LoadResult {
  const step = reflect(() => lookup(envelope.kind, envelope.schemaVersion));
  if (!step.ok) {
    return migrationFailed();
  }
  if (!step.value) {
    return fail(
      'FIGURE_VERSION_UNSUPPORTED',
      '/schemaVersion',
      'no migration path is registered for this schemaVersion',
    );
  }

  const candidate = step.value;
  const targetVersion = reflect(() => candidate.targetVersion);
  const migrate = reflect(() => candidate.migrate);
  if (
    !targetVersion.ok ||
    !migrate.ok ||
    typeof targetVersion.value !== 'string' ||
    typeof migrate.value !== 'function'
  ) {
    return migrationFailed();
  }

  if (targetVersion.value === envelope.schemaVersion) {
    return migrationFailed();
  }

  return {
    targetVersion: targetVersion.value,
    migrate: migrate.value,
  };
}

function applyMigrationStep(
  input: unknown,
  envelope: SupportedEnvelope,
  step: MigrationStep,
): { ok: true; value: unknown; envelope: SupportedEnvelope } | LoadResult {
  let migrated: unknown;

  try {
    migrated = step.migrate(input);
  } catch {
    return migrationFailed();
  }

  const cloned = cloneCanonical(migrated);
  if (!cloned.ok) {
    return migrationFailed();
  }

  const next = readEnvelope(cloned.value);
  if (
    !next.ok ||
    next.envelope.kind !== envelope.kind ||
    next.envelope.schemaVersion !== step.targetVersion
  ) {
    return migrationFailed();
  }

  return {
    ok: true,
    value: cloned.value,
    envelope: {
      kind: next.envelope.kind,
      schemaVersion: next.envelope.schemaVersion,
    },
  };
}

export function applyMigration(
  input: unknown,
  lookup: MigrationLookup,
): LoadResult {
  const initial = readSupportedEnvelope(input);
  if ('diagnostics' in initial) {
    return initial;
  }

  const migratedFrom =
    initial.schemaVersion === CURRENT_SCHEMA_VERSION
      ? undefined
      : initial.schemaVersion;
  if (initial.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return loadCurrentPayload(initial.kind, input);
  }

  let value = input;
  let envelope = initial;
  const visited = new Set<string>();

  while (envelope.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    const currentKey = `${envelope.kind}@${envelope.schemaVersion}`;
    if (visited.has(currentKey)) {
      return migrationFailed();
    }
    visited.add(currentKey);

    const step = getMigrationStepOrFail(envelope, lookup);
    if ('diagnostics' in step) {
      return step;
    }

    const advanced = applyMigrationStep(value, envelope, step);
    if ('diagnostics' in advanced) {
      return advanced;
    }

    value = advanced.value;
    envelope = advanced.envelope;
  }

  return validateCurrent(envelope.kind, value, migratedFrom);
}
