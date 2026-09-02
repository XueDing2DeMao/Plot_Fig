import { readFile } from 'node:fs/promises';
import {
  canonicalizeFigurePayload,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import type { MigrationDiagnostic } from './types.js';
import {
  createCurrentDocument,
  createCurrentTemplate,
  expectNoSharedFigureRefs,
} from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './load.js';
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

const fixture = new URL(
  '../../../tests/fixtures/migrations/figure-template-v0.1.0.json',
  import.meta.url,
);

const readLegacyTemplate = async () =>
  JSON.parse(await readFile(fixture, 'utf8')) as unknown;

function expectSingleDiagnostic(
  result: ReturnType<typeof loadFigurePayload>,
  code: MigrationDiagnostic['code'],
  path: string,
  message: string | ReturnType<typeof expect.any> = expect.any(String),
): void {
  expect(result).toEqual({
    ok: false,
    diagnostics: [{ code, severity: 'error', path, message }],
  });
}

describe('loadFigurePayload current and versioned flows', () => {
  it.each([
    ['template', createCurrentTemplate],
    ['document', createCurrentDocument],
  ] as const)(
    'loads the current %s without mutation or shared references',
    (_label, buildInput) => {
      const input = buildInput();
      const before = canonicalizeFigurePayload(input);
      const result = loadFigurePayload(input);

      expect(result).toEqual({
        ok: true,
        value: expect.any(Object),
        diagnostics: [],
      });
      expect(canonicalizeFigurePayload(input)).toBe(before);
      if (result.ok) {
        expect(result).not.toHaveProperty('migratedFrom');
        expect(canonicalizeFigurePayload(result.value)).toBe(before);
        expectNoSharedFigureRefs(result.value, input);
      }
    },
  );

  it('migrates a v0.1.0 template to the current version', async () => {
    const input = await readLegacyTemplate();
    const before = canonicalizeFigurePayload(input);
    const result = loadFigurePayload(input);

    expect(canonicalizeFigurePayload(input)).toBe(before);
    expect(result).toMatchObject({
      ok: true,
      migratedFrom: '0.1.0',
      diagnostics: [],
    });
    if (result.ok) {
      expect(canonicalizeFigurePayload(result.value)).toBe(
        canonicalizeFigurePayload(migrateV010ToV100(input)),
      );
      expect(result.value).not.toBe(input);
      expect((result.value as FigureTemplate).page).not.toBe(
        (input as FigureTemplate).page,
      );
    }
  });

  it.each([null, [], {}, { schemaVersion: '1.0.0' }])(
    'rejects malformed envelopes for %j',
    (input) => {
      expectSingleDiagnostic(
        loadFigurePayload(input),
        'FIGURE_INVALID_ENVELOPE',
        '/',
        'kind and schemaVersion are required own data properties',
      );
    },
  );

  it.each(['1.0', '01.0.0', '1.0.0-alpha'])(
    'rejects malformed or loose schemaVersion %s',
    (schemaVersion) => {
      expectSingleDiagnostic(
        loadFigurePayload({ kind: 'figure-template', schemaVersion }),
        'FIGURE_VERSION_UNSUPPORTED',
        '/schemaVersion',
        'schemaVersion must be a strict semantic version',
      );
    },
  );

  it.each(['1.0.1', '1.1.0', '2.0.0'])(
    'rejects future schemaVersion %s using full semver ordering',
    (schemaVersion) => {
      expectSingleDiagnostic(
        loadFigurePayload({ kind: 'figure-template', schemaVersion }),
        'FIGURE_FUTURE_VERSION_UNSUPPORTED',
        '/schemaVersion',
        'schemaVersion is newer than this loader supports',
      );
    },
  );

  it.each([
    { kind: 'figure-template', schemaVersion: '0.0.9' },
    { kind: 'figure-document', schemaVersion: '0.1.0' },
  ] as const)('rejects unsupported historical payload %j', (input) => {
    expectSingleDiagnostic(
      loadFigurePayload(input),
      'FIGURE_VERSION_UNSUPPORTED',
      '/schemaVersion',
      'no migration path is registered for this schemaVersion',
    );
  });

  it.each([
    [
      'structural',
      () => {
        const input = createCurrentTemplate() as FigureTemplate & {
          extraRoot?: boolean;
        };
        input.extraRoot = true;
        return {
          input,
          code: 'FIGURE_SCHEMA_INVALID' as const,
          path: '/extraRoot',
        };
      },
    ],
    [
      'domain',
      () => {
        const input = createCurrentDocument();
        input.bindingSet = input.bindingSet.slice(0, 1);
        return {
          input,
          code: 'FIGURE_DOMAIN_INVARIANT_FAILED' as const,
          path: '/bindingSet',
        };
      },
    ],
  ])(
    'forwards %s validation failures with stable code and path',
    (_label, build) => {
      const { input, code, path } = build();
      expectSingleDiagnostic(loadFigurePayload(input), code, path);
    },
  );
});
