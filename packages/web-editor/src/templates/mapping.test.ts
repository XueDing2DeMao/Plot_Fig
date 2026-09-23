import { expect, it } from 'vitest';
import { emptyWorkspace, createDataTable } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { applyFullTemplate, suggestMappings } from './mapping.js';
it('requires explicit required mappings and preserves source tables', () => {
  const template = defaultTemplate(),
    workspace = emptyWorkspace();
  workspace.tables = [
    createDataTable({
      tableId: 't',
      source: { kind: 'csv', name: 'sample' },
      rows: [
        ['x', 'y'],
        ['1', '2'],
        ['2', '4'],
      ],
    }),
  ];
  const before = structuredClone(workspace);
  expect(() =>
    applyFullTemplate({ template, workspace }, template, {}),
  ).toThrow();
  const mapping = suggestMappings(template, workspace);
  const next = applyFullTemplate({ template, workspace }, template, mapping);
  expect(next.workspace.tables).toEqual(before.tables);
  expect(workspace).toEqual(before);
  expect(Object.keys(next.workspace.slotBindings).length).toBe(2);
});
