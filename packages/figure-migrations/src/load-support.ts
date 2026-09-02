import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
import type { LoadResult, MigrationDiagnostic } from './types.js';

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

export function diagnostic(
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

export function fail(
  code: MigrationDiagnostic['code'],
  path: string,
  message: string,
): LoadResult {
  return {
    ok: false,
    diagnostics: [diagnostic(code, path, message)],
  };
}

export function migrationFailed(): LoadResult {
  return fail('FIGURE_MIGRATION_FAILED', '/', 'migration pipeline failed');
}

function getCanonicalErrorPath(error: unknown): string {
  if (!(error instanceof Error)) {
    return '/';
  }

  const match = / at (\/.*)$/u.exec(error.message);
  return match?.[1] ?? '/';
}

export function cloneCanonical(value: unknown): SafeCloneResult {
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

export function reflect<T>(read: () => T): ReflectionResult<T> {
  try {
    return { ok: true, value: read() };
  } catch {
    return { ok: false };
  }
}
