import { findMigrationStep } from './registry.js';
import { applyMigration, type MigrationLookup } from './load-internals.js';
import type { LoadResult } from './types.js';

export function createFigurePayloadLoader(
  lookup: MigrationLookup,
): (input: unknown) => LoadResult {
  return (input) => applyMigration(input, lookup);
}

export const loadFigurePayload = createFigurePayloadLoader(findMigrationStep);
