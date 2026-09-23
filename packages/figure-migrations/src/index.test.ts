import { readFile } from 'node:fs/promises';
import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as figureMigrations from '@plot-fig/figure-migrations';
import {
  loadFigurePayload,
  type LoadResult,
  type MigrationDiagnostic,
} from '@plot-fig/figure-migrations';
import {
  createCurrentTemplate,
  withoutLegacyAxisRangeFlags,
} from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload as internalLoadFigurePayload } from './load.js';
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

const fixture = new URL(
  '../../../tests/fixtures/migrations/figure-template-v0.1.0.json',
  import.meta.url,
);

const readLegacyTemplate = async (): Promise<unknown> =>
  JSON.parse(await readFile(fixture, 'utf8')) as unknown;

describe('root package entry', () => {
  it('exports only the stable runtime API surface', () => {
    expect(Object.keys(figureMigrations).sort()).toEqual(['loadFigurePayload']);
    expect(figureMigrations).not.toHaveProperty('createFigurePayloadLoader');
    expect(figureMigrations).not.toHaveProperty('findMigrationStep');
    expect(figureMigrations).not.toHaveProperty('parseSchemaVersion');
    expect(figureMigrations).not.toHaveProperty('readEnvelope');
    expect(figureMigrations).not.toHaveProperty('migrateV010ToV100');
  });

  it('re-exports the stable loader for current and legacy payloads', async () => {
    const current = createCurrentTemplate();
    const legacy = await readLegacyTemplate();
    const currentResult = loadFigurePayload(current);
    const legacyResult = loadFigurePayload(legacy);

    expect(loadFigurePayload).toBe(internalLoadFigurePayload);
    expect(currentResult).toEqual({
      ok: true,
      value: expect.any(Object),
      diagnostics: [],
    });
    if (currentResult.ok) {
      expect(currentResult).not.toHaveProperty('migratedFrom');
      expect(canonicalizeFigurePayload(currentResult.value)).toBe(
        canonicalizeFigurePayload(current),
      );
    }

    expect(legacyResult).toMatchObject({
      ok: true,
      migratedFrom: '0.1.0',
      diagnostics: [],
    });
    if (legacyResult.ok) {
      expect(
        canonicalizeFigurePayload(
          withoutLegacyAxisRangeFlags(legacyResult.value),
        ),
      ).toBe(
        canonicalizeFigurePayload({
          ...(migrateV010ToV100(legacy) as object),
          schemaVersion: '1.22.0',
        }),
      );
    }
  });

  it('re-exports only the public result types', () => {
    const diagnostic: MigrationDiagnostic = {
      code: 'FIGURE_SCHEMA_INVALID',
      severity: 'error',
      path: '/kind',
      message: 'must be figure-template or figure-document',
    };
    const failure: LoadResult = {
      ok: false,
      diagnostics: [diagnostic],
    };
    const success: LoadResult = {
      ok: true,
      value: createCurrentTemplate(),
      diagnostics: [],
    };

    expect(failure.diagnostics[0]).toEqual(diagnostic);
    expect(success.ok).toBe(true);
    expectTypeOf<
      ReturnType<typeof loadFigurePayload>
    >().toEqualTypeOf<LoadResult>();
  });
});
