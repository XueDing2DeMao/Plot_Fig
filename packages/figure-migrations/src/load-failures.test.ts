import {
  canonicalizeFigurePayload,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import type { MigrationDiagnostic } from './types.js';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { createFigurePayloadLoader, loadFigurePayload } from './load.js';

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

describe('loadFigurePayload failure boundaries', () => {
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

  it('does not mutate current payloads while rejecting unsafe values', () => {
    const input = {
      ...createCurrentTemplate(),
      metadata: { name: 'Basic XY', tags: [Symbol('xy')] as unknown[] },
    };

    expectSingleDiagnostic(
      loadFigurePayload(input),
      'FIGURE_SCHEMA_INVALID',
      '/metadata/tags/0',
      'payload must be canonical JSON',
    );
    expect(canonicalizeFigurePayload(createCurrentTemplate())).toBe(
      canonicalizeFigurePayload(createCurrentTemplate()),
    );
  });
});
