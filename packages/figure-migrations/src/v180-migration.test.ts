import { describe, expect, it } from 'vitest';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { createCurrentDocument } from '../../../tests/helpers/figure-payloads.js';
import { loadFigurePayload } from './load.js';

describe('1.7 to 1.8 migration', () => {
  it('upgrades the version, preserves axis bindings and records legacy range behavior', () => {
    const old = { ...structuredClone(validTemplate), schemaVersion: '1.7.0' };
    const before = structuredClone(old);

    const result = loadFigurePayload(old);

    expect(result).toMatchObject({
      ok: true,
      migratedFrom: '1.7.0',
      value: { ...old, schemaVersion: '1.22.0' },
    });
    expect(old).toEqual(before);
    if (!result.ok || result.value.kind !== 'figure-template')
      throw new Error('migration failed');
    expect(result.value.panels[0]!.axes[0]!.compatibility).toEqual({
      unboundRange: 'panel-v1.7',
    });
  });

  it('changes the document and embedded template versions together', () => {
    const document = createCurrentDocument() as ReturnType<
      typeof createCurrentDocument
    > & { schemaVersion: string };
    document.schemaVersion = '1.7.0';
    (document.templateSnapshot as { schemaVersion: string }).schemaVersion =
      '1.7.0';

    expect(loadFigurePayload(document)).toMatchObject({
      ok: true,
      migratedFrom: '1.7.0',
      value: {
        schemaVersion: '1.22.0',
        templateSnapshot: { schemaVersion: '1.22.0' },
      },
    });
  });

  it('rejects a 1.7 payload carrying a 1.8-only alignment field', () => {
    const old = { ...structuredClone(validTemplate), schemaVersion: '1.7.0' };
    Object.assign(old.panels[0]!, {
      yAxisAlignment: {
        leftAxisId: 'axis-y',
        rightAxisId: 'axis-y',
        value: 0,
      },
    });

    expect(loadFigurePayload(old)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'FIGURE_MIGRATION_FAILED' }],
    });
  });
});
