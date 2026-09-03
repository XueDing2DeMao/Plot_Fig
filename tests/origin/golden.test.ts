import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import { importOriginSnapshot } from '../../packages/origin-compat/src/index.js';
import { createOriginSnapshot } from './fixture-factory.js';

describe('Origin import golden path', () => {
  it('returns a validated FigureTemplate and stable provenance', () => {
    const result = importOriginSnapshot(createOriginSnapshot(), {
      importerVersion: 'test-importer',
    });
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(validateFigureTemplate(result.value).ok).toBe(true);
      expect(result.value.provenance).toEqual({
        sourceKind: 'origin-snapshot',
        sourceHash: 'sha256:origin-security-fixture',
        importerVersion: 'test-importer',
      });
    }
    expect(result.compatibilityReport.counts).toEqual({
      mapped: 2,
      preservedInExtensions: 0,
      lossy: 0,
      dropped: 0,
      ignoredForSecurity: 0,
    });
  });

  it('returns partial and ignores automation for security', () => {
    const result = importOriginSnapshot(
      createOriginSnapshot((snapshot) => {
        snapshot.automation = [{ kind: 'python', text: 'print(1)' }];
      }),
    );
    expect(result.status).toBe('partial');
    expect(
      result.diagnostics.some(
        (entry) => entry.code === 'ORIGIN_SCRIPT_IGNORED',
      ),
    ).toBe(true);
    expect(result.compatibilityReport.counts.ignoredForSecurity).toBe(1);
  });

  it('fails closed on a conflicting slot reference', () => {
    const result = importOriginSnapshot(
      createOriginSnapshot((snapshot) => {
        snapshot.layers[0]!.plots[0]!.bindings.y = {
          slotId: 'slot-x',
          name: 'Y-as-X',
          valueType: 'number',
        };
      }),
    );
    expect(result.status).toBe('failure');
    expect(
      result.diagnostics.some(
        (entry) => entry.code === 'ORIGIN_INVALID_REFERENCE',
      ),
    ).toBe(true);
  });
});
