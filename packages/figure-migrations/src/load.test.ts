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
import { createFigurePayloadLoader, loadFigurePayload } from './load.js';
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

describe('loadFigurePayload', () => {
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

  it.each([
    [
      'nested accessor',
      () => {
        let calls = 0;
        const input = createCurrentTemplate() as FigureTemplate & {
          page: Record<string, unknown>;
        };
        Object.defineProperty(input.page, 'size', {
          enumerable: true,
          get() {
            calls += 1;
            return { width: 1, height: 1 };
          },
        });
        return { calls: () => calls, input, path: '/page/size' };
      },
    ],
    [
      'nested proxy',
      () => ({
        calls: () => 0,
        input: {
          ...createCurrentTemplate(),
          theme: new Proxy(
            {},
            {
              ownKeys() {
                throw new Error('proxy leak');
              },
            },
          ) as Record<string, unknown>,
        },
        path: '/theme',
      }),
    ],
    [
      'cycle',
      () => {
        const input = createCurrentTemplate() as FigureTemplate & {
          extensions: { origin: Record<string, unknown> };
        };
        input.extensions.origin.self = input.extensions.origin;
        return { calls: () => 0, input, path: '/extensions/origin/self' };
      },
    ],
    [
      'non-JSON value',
      () => ({
        calls: () => 0,
        input: {
          ...createCurrentTemplate(),
          metadata: { name: 'Basic XY', tags: [Symbol('xy')] as unknown[] },
        },
        path: '/metadata/tags/0',
      }),
    ],
  ])('does not throw for unsafe current payloads with %s', (_label, build) => {
    const { calls, input, path } = build();
    let result: ReturnType<typeof loadFigurePayload> | undefined;

    expect(() => {
      result = loadFigurePayload(input);
    }).not.toThrow();
    expect(calls()).toBe(0);
    expectSingleDiagnostic(
      result!,
      'FIGURE_SCHEMA_INVALID',
      path,
      'payload must be canonical JSON',
    );
  });

  it.each([
    [
      'throws',
      () => {
        throw new Error('secret payload text');
      },
    ],
    ['wrong kind', () => ({ kind: 'figure-document', schemaVersion: '1.0.0' })],
    [
      'wrong target version',
      () => ({ kind: 'figure-template', schemaVersion: '1.0.1' }),
    ],
    [
      'non-progress',
      () => ({ kind: 'figure-template', schemaVersion: '0.1.0' }),
    ],
    [
      'cyclic output',
      () => {
        const output = {
          kind: 'figure-template',
          schemaVersion: '1.0.0',
        } as Record<string, unknown>;
        output.self = output;
        return output;
      },
    ],
  ])('returns stable MIGRATION_FAILED when a step %s', (_label, migrate) => {
    const load = createFigurePayloadLoader(() => ({
      targetVersion: '1.0.0',
      migrate,
    }));
    let result: ReturnType<typeof load> | undefined;

    expect(() => {
      result = load({ kind: 'figure-template', schemaVersion: '0.1.0' });
    }).not.toThrow();
    expectSingleDiagnostic(
      result!,
      'FIGURE_MIGRATION_FAILED',
      '/',
      'migration pipeline failed',
    );
  });

  it('returns stable MIGRATION_FAILED when migration steps form a cycle', () => {
    const load = createFigurePayloadLoader((kind, schemaVersion) => {
      if (kind !== 'figure-template') return undefined;
      if (schemaVersion === '0.1.0') {
        return {
          targetVersion: '0.2.0',
          migrate: () => ({ kind: 'figure-template', schemaVersion: '0.2.0' }),
        };
      }
      if (schemaVersion === '0.2.0') {
        return {
          targetVersion: '0.1.0',
          migrate: () => ({ kind: 'figure-template', schemaVersion: '0.1.0' }),
        };
      }
      return undefined;
    });

    expectSingleDiagnostic(
      load({ kind: 'figure-template', schemaVersion: '0.1.0' }),
      'FIGURE_MIGRATION_FAILED',
      '/',
      'migration pipeline failed',
    );
  });
});
