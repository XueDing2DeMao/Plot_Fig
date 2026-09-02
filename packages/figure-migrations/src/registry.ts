import type { PayloadKind } from './version.js';
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

type MigrationStep = Readonly<{
  targetVersion: string;
  migrate: (input: unknown) => unknown;
}>;

type RegistryEntry = readonly [PayloadKind, string, MigrationStep];

function getStepKey(kind: PayloadKind, schemaVersion: string): string {
  return `${kind}@${schemaVersion}`;
}

function freezeStep(step: MigrationStep): MigrationStep {
  return Object.freeze({
    targetVersion: step.targetVersion,
    migrate: step.migrate,
  });
}

export function createMigrationRegistry(entries: ReadonlyArray<RegistryEntry>) {
  const steps = new Map<string, MigrationStep>();

  for (const [kind, schemaVersion, step] of entries) {
    const key = getStepKey(kind, schemaVersion);
    if (steps.has(key)) {
      throw new TypeError(`duplicate migration registry entry for ${key}`);
    }
    steps.set(key, freezeStep(step));
  }

  return (
    kind: PayloadKind,
    schemaVersion: string,
  ): MigrationStep | undefined => {
    const stored = steps.get(getStepKey(kind, schemaVersion));
    return stored ? freezeStep(stored) : undefined;
  };
}

const findStoredMigrationStep = createMigrationRegistry([
  [
    'figure-template',
    '0.1.0',
    {
      targetVersion: '1.0.0',
      migrate: migrateV010ToV100,
    },
  ],
]);

export function findMigrationStep(
  kind: PayloadKind,
  schemaVersion: string,
): MigrationStep | undefined {
  return findStoredMigrationStep(kind, schemaVersion);
}
