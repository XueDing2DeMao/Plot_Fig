import { describe, expect, it } from 'vitest';
import {
  createTypedImportResult,
  createValidSnapshot,
  expectInvalid,
} from '../../../../tests/helpers/origin-snapshot.js';
import { validateOriginSnapshot } from '../snapshot-schema.js';

describe('validateOriginSnapshot contract', () => {
  it('accepts a complete Snapshot and keeps type contracts explicit', () => {
    const snapshot = createValidSnapshot();
    const result = createTypedImportResult(snapshot);

    expect(validateOriginSnapshot(snapshot)).toEqual({
      ok: true,
      value: snapshot,
    });
    expect(result.compatibilityReport.counts).toEqual({
      mapped: 0,
      preservedInExtensions: 0,
      lossy: 0,
      dropped: 0,
      ignoredForSecurity: 0,
    });
  });

  it.each(['1.0.1', '1.1.0', '2.0.0'])(
    'rejects future snapshotVersion %s with a dedicated diagnostic code',
    (snapshotVersion) => {
      const input = {
        ...createValidSnapshot(),
        snapshotVersion,
      };
      const result = validateOriginSnapshot(input);

      expectInvalid(
        result,
        'FIGURE_FUTURE_VERSION_UNSUPPORTED',
        '/snapshotVersion',
      );
    },
  );

  it.each(['1.0', '01.0.0', '1.0.0-alpha', '0.9.9'])(
    'treats loose or older snapshotVersion %s as an invalid Snapshot contract',
    (snapshotVersion) => {
      const input = {
        ...createValidSnapshot(),
        snapshotVersion,
      };
      const result = validateOriginSnapshot(input);

      expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/snapshotVersion');
    },
  );
});
