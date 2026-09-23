import { expect, it } from 'vitest';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { bindWorkspace } from './workspace-binding.js';
import { createDataTable } from './data-table.js';

it('does not invalidate a shared slot used by another correctly paired plot', () => {
  const template = chartTemplate('area');
  const second = structuredClone(template.panels[0]!.plotSlots[0]!);
  if (second.kind !== 'area') throw new Error('fixture');
  second.plotSlotId = 'cross-table';
  second.bindings.y = 'other-y';
  template.panels[0]!.plotSlots.push(second);
  template.dataSlots.push({ ...template.dataSlots[1]!, dataSlotId: 'other-y' });
  const table = createDataTable({
    tableId: 't',
    source: { kind: 'csv', name: 't.csv' },
    rows: [
      ['x', 'y'],
      ['0', '1'],
      ['1', '2'],
    ],
  });
  const result = bindWorkspace(template, {
    tables: [table, { ...table, tableId: 'other' }],
    activeTableId: 't',
    slotBindings: {
      'slot-x': { tableId: 't', columnId: 'x' },
      'slot-y': { tableId: 't', columnId: 'y' },
      'other-y': { tableId: 'other', columnId: 'y' },
    },
  });
  expect(result.bindings.find((b) => b.dataSlotId === 'slot-x')!.status).toBe(
    'valid',
  );
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      code: 'TABLE_BINDING_INVALID',
      sourcePath: '/plotSlots/cross-table',
    }),
  );
});

it('binds textual categories and a numeric value using their actual roles', () => {
  const table = createDataTable({
    tableId: 't',
    source: { kind: 'csv', name: 'bar.csv' },
    rows: [
      ['category', 'value'],
      ['A', '2'],
      ['B', '3'],
    ],
  });
  table.columns[0]!.settings.type = 'category';
  const result = bindWorkspace(chartTemplate('bar'), {
    tables: [table],
    activeTableId: 't',
    slotBindings: {
      'slot-category': { tableId: 't', columnId: table.columns[0]!.columnId },
      'slot-value': { tableId: 't', columnId: table.columns[1]!.columnId },
    },
  });
  expect(result.bindings.map((b) => b.status)).toEqual(['valid', 'valid']);
  expect(result.diagnostics).toEqual([]);
});
it('rejects XYZ from different tables and does not require unbound optional groups', () => {
  const table = createDataTable({
    tableId: 't',
    source: { kind: 'csv', name: 'grid.csv' },
    rows: [
      ['x', 'y', 'z'],
      ['0', '0', '1'],
      ['1', '1', '2'],
    ],
  });
  const other = { ...structuredClone(table), tableId: 'other' };
  const result = bindWorkspace(chartTemplate('heatmap'), {
    tables: [table, other],
    activeTableId: 't',
    slotBindings: Object.fromEntries(
      ['x', 'y', 'z'].map((r, i) => [
        'slot-' + r,
        {
          tableId: r === 'z' ? 'other' : 't',
          columnId: table.columns[i]!.columnId,
        },
      ]),
    ),
  });
  expect(result.bindings.every((b) => b.status === 'invalid')).toBe(true);
  const box: any = chartTemplate('box');
  box.dataSlots.push({
    dataSlotId: 'slot-group',
    name: 'group',
    role: 'group',
    valueType: 'category',
    required: false,
  });
  box.panels[0].plotSlots[0].bindings.group = 'slot-group';
  const bound = bindWorkspace(box, {
    tables: [table],
    activeTableId: 't',
    slotBindings: {
      'slot-values': { tableId: 't', columnId: table.columns[0]!.columnId },
    },
  });
  expect(bound.diagnostics).toEqual([]);
});
