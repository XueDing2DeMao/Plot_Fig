import { expect, it } from 'vitest';
import {
  bindTableToPlot,
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { changeSeries, importTables } from '../state/workspace-editor.js';
import { tableBatchItems } from '../batch/items.js';

function model() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    ['a', 'b'].map((id) =>
      createDataTable({
        tableId: id,
        source: { name: `${id}.csv`, kind: 'csv' },
        rows: [
          ['X', 'Y'],
          ['1', '2'],
          ['2', '3'],
        ],
      }),
    ),
  );
}

it('requires explicit mapping when using the current multi-table figure as a full template', () => {
  const m = changeSeries(model(), 'duplicate', 'series-1');
  m.workspace = bindTableToPlot(m.workspace, m.template, {
    plotSlotId: m.template.panels[0]!.plotSlots[1]!.plotSlotId,
    tableId: 'b',
  });
  expect(
    bindWorkspace(m.template, m.workspace).diagnostics.filter(
      (d) => d.severity === 'error',
    ),
  ).toEqual([]);
  expect(tableBatchItems(m, ['a'])[0]!.error).toContain('多张表');
  expect(
    tableBatchItems(m, ['a'], { template: m.template })[0]!.error,
  ).toContain('多张表');
});

it.each(['date', 'datetime'] as const)(
  'accepts supported temporal X columns (%s)',
  (type) => {
    const m = model();
    for (const table of m.workspace.tables) {
      table.columns[0]!.settings.type = type;
      table.rows = [
        ['X', 'Y'],
        ['2026-01-01', '2'],
        ['2026-01-02', '3'],
      ];
    }
    expect(
      bindWorkspace(m.template, m.workspace).diagnostics.filter(
        (d) => d.severity === 'error',
      ),
    ).toEqual([]);
    expect(tableBatchItems(m, ['a'])[0]!.error).toBeUndefined();
  },
);
