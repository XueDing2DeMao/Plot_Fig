import { describe, expect, it } from 'vitest';
import {
  collectSignatures,
  createValidSnapshot,
  expectInvalid,
} from '../../../../tests/helpers/origin-snapshot.js';
import { validateOriginSnapshot } from '../snapshot-schema.js';

describe('validateOriginSnapshot structure', () => {
  it('aggregates missing fields, enum mismatches and closed-schema failures', () => {
    const input = createValidSnapshot() as Record<string, unknown>;
    delete input.name;
    input.script = 'range aa=1;';
    (input.page as Record<string, unknown>).unit = 'meter';
    (input.layers as Array<Record<string, unknown>>)[0]!.extraLayer = true;
    (
      (input.layers as Array<Record<string, unknown>>)[0]!.frame as Record<
        string,
        unknown
      >
    ).extraFrame = true;
    (
      (
        (
          (input.layers as Array<Record<string, unknown>>)[0]!.plots as Array<
            Record<string, unknown>
          >
        )[0]!.bindings as Record<string, unknown>
      ).x as Record<string, unknown>
    ).extraBinding = true;

    const result = validateOriginSnapshot(input);

    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/name');
    expect(collectSignatures(result.diagnostics)).toEqual(
      expect.arrayContaining([
        'ORIGIN_SNAPSHOT_INVALID@/name',
        'ORIGIN_SNAPSHOT_INVALID@/script',
        'ORIGIN_SNAPSHOT_INVALID@/page/unit',
        'ORIGIN_SNAPSHOT_INVALID@/layers/0/extraLayer',
        'ORIGIN_SNAPSHOT_INVALID@/layers/0/frame/extraFrame',
        'ORIGIN_SNAPSHOT_INVALID@/layers/0/plots/0/bindings/x/extraBinding',
      ]),
    );
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(6);
  });

  it('allows automation but rejects script-like root fields outside automation', () => {
    const input = createValidSnapshot() as Record<string, unknown>;
    input.labtalkScript = 'type -b "hello";';

    const result = validateOriginSnapshot(input);

    expectInvalid(result, 'ORIGIN_SNAPSHOT_INVALID', '/labtalkScript');
  });
});
