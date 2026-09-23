import { migrateV1210ToV1220 } from './migrations/v1.21.0-to-v1.22.0.js';
import { migrateV1120ToV1130 } from './migrations/v1.12.0-to-v1.13.0.js';
import { migrateV1130ToV1140 } from './migrations/v1.13.0-to-v1.14.0.js';
import { migrateV1140ToV1150 } from './migrations/v1.14.0-to-v1.15.0.js';
import { migrateV1150ToV1160 } from './migrations/v1.15.0-to-v1.16.0.js';
import { migrateV1160ToV1170 } from './migrations/v1.16.0-to-v1.17.0.js';
import { migrateV1170ToV1180 } from './migrations/v1.17.0-to-v1.18.0.js';
import { migrateV1180ToV1190 } from './migrations/v1.18.0-to-v1.19.0.js';
import { migrateV1190ToV1200 } from './migrations/v1.19.0-to-v1.20.0.js';
import { migrateV1200ToV1210 } from './migrations/v1.20.0-to-v1.21.0.js';
import { migrateV140ToV150 } from './migrations/v1.4.0-to-v1.5.0.js';
import { migrateV150ToV160 } from './migrations/v1.5.0-to-v1.6.0.js';
import { migrateV160ToV170 } from './migrations/v1.6.0-to-v1.7.0.js';
import { migrateV170ToV180 } from './migrations/v1.7.0-to-v1.8.0.js';
import { migrateV180ToV190 } from './migrations/v1.8.0-to-v1.9.0.js';
import { migrateV100ToV110 } from './migrations/v1.0.0-to-v1.1.0.js';
import { migrateV110ToV120 } from './migrations/v1.1.0-to-v1.2.0.js';
import { migrateV120ToV130 } from './migrations/v1.2.0-to-v1.3.0.js';
import { migrateV130ToV140 } from './migrations/v1.3.0-to-v1.4.0.js';
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

import { migrateV1100ToV1110 } from './migrations/v1.10.0-to-v1.11.0.js';
import { migrateV1110ToV1120 } from './migrations/v1.11.0-to-v1.12.0.js';
const findStoredMigrationStep = createMigrationRegistry([
  [
    'figure-template',
    '1.21.0',
    { targetVersion: '1.22.0', migrate: migrateV1210ToV1220 },
  ],
  [
    'figure-document',
    '1.21.0',
    { targetVersion: '1.22.0', migrate: migrateV1210ToV1220 },
  ],
  [
    'figure-template',
    '1.20.0',
    { targetVersion: '1.21.0', migrate: migrateV1200ToV1210 },
  ],
  [
    'figure-document',
    '1.20.0',
    { targetVersion: '1.21.0', migrate: migrateV1200ToV1210 },
  ],
  [
    'figure-template',
    '1.19.0',
    { targetVersion: '1.20.0', migrate: migrateV1190ToV1200 },
  ],
  [
    'figure-document',
    '1.19.0',
    { targetVersion: '1.20.0', migrate: migrateV1190ToV1200 },
  ],
  [
    'figure-template',
    '1.18.0',
    { targetVersion: '1.19.0', migrate: migrateV1180ToV1190 },
  ],
  [
    'figure-document',
    '1.18.0',
    { targetVersion: '1.19.0', migrate: migrateV1180ToV1190 },
  ],
  [
    'figure-template',
    '1.17.0',
    { targetVersion: '1.18.0', migrate: migrateV1170ToV1180 },
  ],
  [
    'figure-document',
    '1.17.0',
    { targetVersion: '1.18.0', migrate: migrateV1170ToV1180 },
  ],
  [
    'figure-template',
    '1.16.0',
    { targetVersion: '1.17.0', migrate: migrateV1160ToV1170 },
  ],
  [
    'figure-document',
    '1.16.0',
    { targetVersion: '1.17.0', migrate: migrateV1160ToV1170 },
  ],
  [
    'figure-template',
    '1.15.0',
    { targetVersion: '1.16.0', migrate: migrateV1150ToV1160 },
  ],
  [
    'figure-document',
    '1.15.0',
    { targetVersion: '1.16.0', migrate: migrateV1150ToV1160 },
  ],
  [
    'figure-template',
    '1.14.0',
    { targetVersion: '1.15.0', migrate: migrateV1140ToV1150 },
  ],
  [
    'figure-document',
    '1.14.0',
    { targetVersion: '1.15.0', migrate: migrateV1140ToV1150 },
  ],
  [
    'figure-template',
    '1.13.0',
    { targetVersion: '1.14.0', migrate: migrateV1130ToV1140 },
  ],
  [
    'figure-document',
    '1.13.0',
    { targetVersion: '1.14.0', migrate: migrateV1130ToV1140 },
  ],
  [
    'figure-template',
    '1.12.0',
    { targetVersion: '1.13.0', migrate: migrateV1120ToV1130 },
  ],
  [
    'figure-document',
    '1.12.0',
    { targetVersion: '1.13.0', migrate: migrateV1120ToV1130 },
  ],
  [
    'figure-template',
    '1.11.0',
    { targetVersion: '1.12.0', migrate: migrateV1110ToV1120 },
  ],
  [
    'figure-document',
    '1.11.0',
    { targetVersion: '1.12.0', migrate: migrateV1110ToV1120 },
  ],
  [
    'figure-template',
    '1.10.0',
    { targetVersion: '1.11.0', migrate: migrateV1100ToV1110 },
  ],
  [
    'figure-document',
    '1.10.0',
    { targetVersion: '1.11.0', migrate: migrateV1100ToV1110 },
  ],
  [
    'figure-template',
    '1.9.0',
    { targetVersion: '1.10.0', migrate: migrateV190ToV1100 },
  ],
  [
    'figure-document',
    '1.9.0',
    { targetVersion: '1.10.0', migrate: migrateV190ToV1100 },
  ],
  [
    'figure-template',
    '1.8.0',
    { targetVersion: '1.9.0', migrate: migrateV180ToV190 },
  ],
  [
    'figure-document',
    '1.8.0',
    { targetVersion: '1.9.0', migrate: migrateV180ToV190 },
  ],
  [
    'figure-template',
    '1.7.0',
    { targetVersion: '1.8.0', migrate: migrateV170ToV180 },
  ],
  [
    'figure-document',
    '1.7.0',
    { targetVersion: '1.8.0', migrate: migrateV170ToV180 },
  ],
  [
    'figure-template',
    '1.6.0',
    { targetVersion: '1.7.0', migrate: migrateV160ToV170 },
  ],
  [
    'figure-document',
    '1.6.0',
    { targetVersion: '1.7.0', migrate: migrateV160ToV170 },
  ],
  [
    'figure-template',
    '1.5.0',
    { targetVersion: '1.6.0', migrate: migrateV150ToV160 },
  ],
  [
    'figure-document',
    '1.5.0',
    { targetVersion: '1.6.0', migrate: migrateV150ToV160 },
  ],
  [
    'figure-template',
    '1.4.0',
    { targetVersion: '1.5.0', migrate: migrateV140ToV150 },
  ],
  [
    'figure-document',
    '1.4.0',
    { targetVersion: '1.5.0', migrate: migrateV140ToV150 },
  ],
  [
    'figure-template',
    '1.3.0',
    { targetVersion: '1.4.0', migrate: migrateV130ToV140 },
  ],
  [
    'figure-document',
    '1.3.0',
    { targetVersion: '1.4.0', migrate: migrateV130ToV140 },
  ],
  [
    'figure-template',
    '1.2.0',
    { targetVersion: '1.3.0', migrate: migrateV120ToV130 },
  ],
  [
    'figure-document',
    '1.2.0',
    { targetVersion: '1.3.0', migrate: migrateV120ToV130 },
  ],
  [
    'figure-template',
    '1.1.0',
    { targetVersion: '1.2.0', migrate: migrateV110ToV120 },
  ],
  [
    'figure-document',
    '1.1.0',
    { targetVersion: '1.2.0', migrate: migrateV110ToV120 },
  ],
  [
    'figure-template',
    '1.0.0',
    { targetVersion: '1.1.0', migrate: migrateV100ToV110 },
  ],
  [
    'figure-document',
    '1.0.0',
    { targetVersion: '1.1.0', migrate: migrateV100ToV110 },
  ],
  [
    'figure-template',
    '0.1.0',
    { targetVersion: '1.0.0', migrate: migrateV010ToV100 },
  ],
]);

export function findMigrationStep(
  kind: PayloadKind,
  schemaVersion: string,
): MigrationStep | undefined {
  return findStoredMigrationStep(kind, schemaVersion);
}

import { migrateV190ToV1100 } from './migrations/v1.9.0-to-v1.10.0.js';
