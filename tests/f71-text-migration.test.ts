import { expect, it } from 'vitest';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { validTemplate } from '../packages/figure-schema/src/schema/fixtures.js';
import { createCurrentDocument } from './helpers/figure-payloads.js';

it('upgrades 1.20 templates while preserving implicit plain text semantics', () => {
  const old: any = structuredClone(validTemplate);
  old.schemaVersion = '1.20.0';
  const before = structuredClone(old);
  const result = loadFigurePayload(old);
  expect(result).toMatchObject({
    ok: true,
    migratedFrom: '1.20.0',
    value: { schemaVersion: '1.22.0' },
  });
  expect(old).toEqual(before);
  if (result.ok) {
    const migrated = result.value as any;
    expect(migrated.panels[0].axes[0].tickLabels.textFormat).toBe('plain');
    expect(migrated.panels[0].plotSlots[0].legendEntry.format).toBe('plain');
  }
});

it('upgrades document and snapshot versions together', () => {
  const document: any = createCurrentDocument();
  document.schemaVersion = '1.20.0';
  document.templateSnapshot.schemaVersion = '1.20.0';
  expect(loadFigurePayload(document)).toMatchObject({
    ok: true,
    value: {
      schemaVersion: '1.22.0',
      templateSnapshot: { schemaVersion: '1.22.0' },
    },
  });
});

it('rejects 1.20 payloads that smuggle 1.21 text fields', () => {
  const old: any = structuredClone(validTemplate);
  old.schemaVersion = '1.20.0';
  old.panels[0].axes[0].tickLabels.textFormat = 'rich';
  expect(loadFigurePayload(old)).toMatchObject({ ok: false });
});

it('rejects auto format when it is smuggled into a 1.20 payload', () => {
  const old: any = structuredClone(validTemplate);
  old.schemaVersion = '1.20.0';
  old.panels[0].axes[0].title = {
    text: '$x_i^2$',
    format: 'auto',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
  };
  expect(loadFigurePayload(old)).toMatchObject({ ok: false });
});
