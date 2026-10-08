import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import { expect, it } from 'vitest';
import { loadFigurePayload } from './load.js';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';

it('loads 1.1 templates as 1.3 without mutating their inputs', () => {
  const old = { ...chartTemplate('bar'), schemaVersion: '1.1.0' };
  const copy = structuredClone(old);
  const result = loadFigurePayload(old);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      result.value.kind === 'figure-template' &&
        withoutLegacyAxisRangeFlags(result.value).panels,
    ).toEqual(old.panels);
  }
  expect(old).toEqual(copy);
});
import { withoutLegacyAxisRangeFlags } from '../../../tests/helpers/figure-payloads.js';
