import { describe, expect, it } from 'vitest';
import * as registryModule from './registry.js';

type RegistryTestApi = {
  createMigrationRegistry?: (
    entries: ReadonlyArray<
      readonly [
        kind: 'figure-template' | 'figure-document',
        schemaVersion: string,
        step: {
          targetVersion: string;
          migrate: (input: unknown) => unknown;
        },
      ]
    >,
  ) => (
    kind: 'figure-template' | 'figure-document',
    schemaVersion: string,
  ) =>
    | {
        targetVersion: string;
        migrate: (input: unknown) => unknown;
      }
    | undefined;
};

describe('findMigrationStep', () => {
  it('returns a frozen isolated step so callers cannot mutate registry state', () => {
    const first = registryModule.findMigrationStep('figure-template', '0.1.0');

    expect(first).toBeDefined();
    expect(Reflect.set(first!, 'targetVersion', '9.9.9')).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);

    const second = registryModule.findMigrationStep('figure-template', '0.1.0');

    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    expect(Object.isFrozen(second)).toBe(true);
    expect(second).toMatchObject({
      targetVersion: '1.0.0',
      migrate: expect.any(Function),
    });
  });
});

describe('createMigrationRegistry', () => {
  it('fails fast on duplicate registry keys', () => {
    const { createMigrationRegistry } = registryModule as RegistryTestApi;

    expect(createMigrationRegistry).toEqual(expect.any(Function));
    expect(() =>
      createMigrationRegistry!([
        [
          'figure-template',
          '0.1.0',
          { targetVersion: '1.0.0', migrate: (input) => input },
        ],
        [
          'figure-template',
          '0.1.0',
          { targetVersion: '1.0.1', migrate: (input) => input },
        ],
      ]),
    ).toThrowError(
      new TypeError(
        'duplicate migration registry entry for figure-template@0.1.0',
      ),
    );
  });
});
