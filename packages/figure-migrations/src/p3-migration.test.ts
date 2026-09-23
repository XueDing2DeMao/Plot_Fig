import { expect, it } from 'vitest';
import { loadFigurePayload } from './load.js';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';

it('migrates a 1.0.0 XY template without changing inputs or styles', () => {
  const old = { ...chartTemplate('xy'), schemaVersion: '1.0.0' };
  const result = loadFigurePayload(old);
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(withoutLegacyAxisRangeFlags(result.value)).toEqual({
      ...old,
      schemaVersion: '1.22.0',
    });
  expect(old.schemaVersion).toBe('1.0.0');
});
it('migrates a document and its nested template together', () => {
  const old = {
    kind: 'figure-document',
    schemaVersion: '1.0.0',
    documentId: 'doc',
    templateSnapshot: {
      ...chartTemplate('xy'),
      schemaVersion: '1.0.0',
      dataSlots: [],
      panels: [],
    },
    dataSources: [],
    bindingSet: [],
  };
  old.templateSnapshot = {
    ...chartTemplate('xy'),
    schemaVersion: '1.0.0',
  } as any;
  old.templateSnapshot.dataSlots.forEach(
    (slot: any) => (slot.required = false),
  );
  const result = loadFigurePayload(old);
  expect(result.ok).toBe(true);
  if (result.ok && result.value.kind === 'figure-document') {
    expect(result.value.schemaVersion).toBe('1.22.0');
    expect(result.value.templateSnapshot.schemaVersion).toBe('1.22.0');
  }
});
it('rejects new charts pretending to be old data and mixed document versions', () => {
  expect(
    loadFigurePayload({ ...chartTemplate('bar'), schemaVersion: '1.0.0' }).ok,
  ).toBe(false);
  const template = chartTemplate('xy');
  expect(
    loadFigurePayload({
      kind: 'figure-document',
      schemaVersion: '1.0.0',
      documentId: 'doc',
      templateSnapshot: template,
      dataSources: [],
      bindingSet: [],
    }).ok,
  ).toBe(false);
});
import { withoutLegacyAxisRangeFlags } from '../../../tests/helpers/figure-payloads.js';
