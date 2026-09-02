import { describe, expect, it } from 'vitest';
import { createFigurePayloadLoader } from './load.js';

function expectMigrationFailed(
  result: ReturnType<ReturnType<typeof createFigurePayloadLoader>>,
): void {
  expect(result).toEqual({
    ok: false,
    diagnostics: [
      {
        code: 'FIGURE_MIGRATION_FAILED',
        severity: 'error',
        path: '/',
        message: 'migration pipeline failed',
      },
    ],
  });
}

describe('createFigurePayloadLoader safety boundaries', () => {
  it('returns MIGRATION_FAILED when lookup throws a sensitive error', () => {
    const load = createFigurePayloadLoader(() => {
      throw new Error('sensitive lookup failure');
    });
    let result: ReturnType<typeof load> | undefined;

    expect(() => {
      result = load({ kind: 'figure-template', schemaVersion: '0.1.0' });
    }).not.toThrow();
    expectMigrationFailed(result!);
  });

  it.each([
    [
      'targetVersion getter',
      () =>
        Object.defineProperty(
          { migrate: (input: unknown) => input },
          'targetVersion',
          {
            enumerable: true,
            get() {
              throw new Error('sensitive targetVersion getter');
            },
          },
        ),
    ],
    [
      'migrate proxy getter',
      () =>
        new Proxy(
          { targetVersion: '1.0.0' },
          {
            get(target, property, receiver) {
              if (property === 'migrate') {
                throw new Error('sensitive migrate getter');
              }
              return Reflect.get(target, property, receiver);
            },
          },
        ),
    ],
  ])(
    'returns MIGRATION_FAILED when lookup returns a %s step',
    (_label, step) => {
      const load = createFigurePayloadLoader(() => step() as never);
      let result: ReturnType<typeof load> | undefined;

      expect(() => {
        result = load({ kind: 'figure-template', schemaVersion: '0.1.0' });
      }).not.toThrow();
      expectMigrationFailed(result!);
    },
  );
});
