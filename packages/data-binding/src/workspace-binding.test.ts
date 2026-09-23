import { describe, expect, it } from 'vitest';
import { createDataTable, updateTableColumn } from './data-table.js';
import {
  bindWorkspace,
  columnKey,
  bindTableToPlot,
  removeWorkspaceTable,
  appendWorkspaceTables,
} from './workspace-binding.js';
import { emptyWorkspace } from './workspace-types.js';
import { defaultTemplate } from '../../web-editor/src/state/default-template.js';
import { addSeries } from '../../web-editor/src/state/series-operations.js';

function table(tableId: string, values: string[][]) {
  return createDataTable({
    tableId,
    source: { kind: 'csv', name: tableId + '.csv' },
    rows: [['X', 'Y'], ...values],
  });
}
describe('workspace bindings', () => {
  it('binds same-named columns from different tables without collision', () => {
    const added = addSeries(defaultTemplate(), {});
    if (!added.ok) throw new Error(added.message);
    const template = added.value.template;
    const tables = [
      table('a', [
        ['0', '1'],
        ['1', '2'],
      ]),
      table('b', [
        ['10', '30'],
        ['20', '40'],
        ['30', '50'],
      ]),
    ];
    let workspace = appendWorkspaceTables(emptyWorkspace(), tables);
    workspace = bindTableToPlot(workspace, template, {
      plotSlotId: template.panels[0]!.plotSlots[0]!.plotSlotId,
      tableId: 'a',
    });
    workspace = bindTableToPlot(workspace, template, {
      plotSlotId: 'series-2',
      tableId: 'b',
    });
    const data = bindWorkspace(template, workspace);
    expect(data.bindings.every((b) => b.status === 'valid')).toBe(true);
    expect(
      data.columns.find(
        (c) => c.columnId === columnKey({ tableId: 'b', columnId: 'y' }),
      )?.values,
    ).toEqual([30, 40, 50]);
    expect(new Set(data.columns.map((c) => c.columnId)).size).toBe(4);
    const removed = bindWorkspace(
      template,
      removeWorkspaceTable(workspace, 'a'),
    );
    expect(removed.bindings.filter((b) => b.status === 'valid')).toHaveLength(
      2,
    );
    expect(workspace.tables).toHaveLength(2);
  });
  it('rejects cross-table XY pairing and date Y, while projecting date X', () => {
    const template = defaultTemplate();
    let a = table('a', [
      ['2024-01-01', '1'],
      ['2024-01-02', '2'],
    ]);
    a = updateTableColumn(a, 'x', { settings: { type: 'date' } });
    const workspace = {
      tables: [a, table('b', [['0', '3']])],
      activeTableId: 'a',
      slotBindings: {
        'slot-x': { tableId: 'a', columnId: 'x' },
        'slot-y': { tableId: 'a', columnId: 'y' },
      },
    };
    const good = bindWorkspace(template, workspace);
    expect(good.columns[0]?.values[0]).toBe(Date.UTC(2024, 0, 1));
    expect(good.bindings.every((b) => b.status === 'valid')).toBe(true);
    expect(
      bindWorkspace(template, {
        ...workspace,
        slotBindings: {
          ...workspace.slotBindings,
          'slot-y': { tableId: 'a', columnId: 'x' },
        },
      }).bindings.at(-1)?.status,
    ).toBe('invalid');
    expect(
      bindWorkspace(template, {
        ...workspace,
        slotBindings: {
          ...workspace.slotBindings,
          'slot-y': { tableId: 'b', columnId: 'y' },
        },
      }).diagnostics.some((d) => d.code === 'TABLE_BINDING_INVALID'),
    ).toBe(true);
  });
  it('assigns unique table ids on repeated imports without rebinding existing data', () => {
    const first = appendWorkspaceTables(emptyWorkspace(), [
      table('a', [['0', '1']]),
    ]);
    const second = appendWorkspaceTables(first, [table('a', [['3', '4']])]);
    expect(new Set(second.tables.map((t) => t.tableId)).size).toBe(2);
    expect(second.tables[0]?.rows).toEqual(first.tables[0]?.rows);
  });
});
