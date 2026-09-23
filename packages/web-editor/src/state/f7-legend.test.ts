import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import { tableActions, figureActions } from './workspace-actions.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

it('new legends follow column names and preserve explicit manual overrides', () => {
  let model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { kind: 'csv', name: 'a.csv' },
        rows: [
          ['Time', 'Signal'],
          ['0', '1'],
          ['1', '2'],
        ],
      }),
    ],
  );
  expect(model.template.panels[0]!.plotSlots[0]!.legendEntry.text).toBe(
    'Signal',
  );
  const plot = model.template.panels[0]!.plotSlots[0]!;
  plot.legendEntry = {
    ...plot.legendEntry,
    text: 'My signal',
    source: 'manual',
  } as typeof plot.legendEntry;
  const actions = tableActions(model, (change) => {
    model = change(model);
  });
  actions.onImport([
    createDataTable({
      tableId: 'b',
      source: { kind: 'csv', name: 'b.csv' },
      rows: [
        ['Time', 'Other'],
        ['0', '3'],
      ],
    }),
  ]);
  expect(model.template.panels[0]!.plotSlots[0]!.legendEntry.text).toBe(
    'My signal',
  );
  actions.onTable('series-1', 'b');
  expect(model.template.panels[0]!.plotSlots[0]!.legendEntry.text).toBe(
    'My signal',
  );
  model.template.panels[0]!.plotSlots[0]!.legendEntry.source = 'auto';
  figureActions((change) => {
    model = change(model);
  }).onModel(model);
  expect(model.template.panels[0]!.plotSlots[0]!.legendEntry.text).toBe(
    'Other',
  );
  const table = model.workspace.tables.find((t) => t.tableId === 'b')!;
  actions.onColumn(
    (model.template.panels[0]!.plotSlots[0]!.bindings as { y: string }).y,
    'b',
    table.columns[0]!.columnId,
  );
  expect(model.template.panels[0]!.plotSlots[0]!.legendEntry.text).toBe('Time');
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(model.template, model.workspace),
  );
  expect(reopened).toMatchObject({ ok: true, template: model.template });
});
