import type { PayloadKind } from './version.js';
import { migrateV010ToV100 } from './migrations/v0.1.0-to-v1.0.0.js';

type MigrationStep = Readonly<{
  targetVersion: string;
  migrate: (input: unknown) => unknown;
}>;

const steps = new Map<string, MigrationStep>([
  [
    'figure-template@0.1.0',
    {
      targetVersion: '1.0.0',
      migrate: migrateV010ToV100,
    },
  ],
]);

function getStepKey(kind: PayloadKind, schemaVersion: string): string {
  return `${kind}@${schemaVersion}`;
}

export function findMigrationStep(
  kind: PayloadKind,
  schemaVersion: string,
): MigrationStep | undefined {
  return steps.get(getStepKey(kind, schemaVersion));
}
