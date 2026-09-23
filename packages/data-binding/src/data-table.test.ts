import { describe, expect, it } from 'vitest';
import {
  createDataTable,
  organizeTable,
  updateTableColumn,
} from './data-table.js';

const source = { kind: 'csv' as const, name: 'sample.csv' };
describe('data table organization', () => {
  it('keeps raw data, units, empty rows and duplicate column identities', () => {
    const table = createDataTable({
      tableId: 'table-1',
      source,
      rows: [
        ['X', 'X', 'Code'],
        ['mm', 'N', ''],
        ['0', '1e3', '001'],
        [''],
        ['2', '-999', '002'],
      ],
      options: { headerRow: 0, unitRow: 1, dataStartRow: 2 },
    });
    expect(table.columns.map((c) => c.columnId)).toEqual(['x', 'x-1', 'code']);
    expect(table.columns[0]?.settings.unit).toBe('mm');
    const edited = updateTableColumn(table, 'code', {
      settings: { type: 'string' },
    });
    const missing = updateTableColumn(edited, 'x-1', {
      settings: { missingTokens: ['-999'] },
    });
    expect(organizeTable(missing).columns.map((c) => c.values)).toEqual([
      [0, null, 2],
      [1000, null, null],
      ['001', null, '002'],
    ]);
    expect(missing.rows).toEqual(table.rows);
  });
  it('reports conversion errors and allows recovering original text', () => {
    const table = createDataTable({
      tableId: 't',
      source,
      rows: [['Y'], ['3'], ['bad']],
    });
    const numeric = updateTableColumn(table, 'y', {
      settings: { type: 'number', unit: 'm' },
    });
    const organized = organizeTable(numeric);
    expect(organized.columns[0]?.values).toEqual([3, null]);
    expect(organized.diagnostics[0]?.sourcePath).toContain('/row/3');
    expect(organized.columns[0]?.invalidCount).toBe(1);
    expect(
      organizeTable(
        updateTableColumn(numeric, 'y', { settings: { type: 'string' } }),
      ).columns[0]?.values,
    ).toEqual(['3', 'bad']);
  });
  it('supports no header, explicit missing tokens and date inference', () => {
    const table = createDataTable({
      tableId: 't',
      source,
      rows: [
        ['2024-01-01', 'NA'],
        ['2024-01-02', 'N/A'],
      ],
      options: { headerRow: null, unitRow: null, dataStartRow: 0 },
    });
    expect(table.columns[0]?.settings.type).toBe('date');
    expect(organizeTable(table).columns[1]?.values).toEqual(['NA', 'N/A']);
    const changed = updateTableColumn(table, 'column-1', {
      settings: { missingTokens: ['NA', 'N/A'] },
    });
    expect(organizeTable(changed).columns[1]?.values).toEqual([null, null]);
  });
  it('rejects extra fields and invalid data regions without dropping data', () => {
    expect(() =>
      createDataTable({ tableId: 't', source, rows: [['X'], ['1', '2']] }),
    ).toThrow(/2.*列/);
    expect(() =>
      createDataTable({
        tableId: 't',
        source,
        rows: [['X'], ['1']],
        options: { headerRow: 0, unitRow: null, dataStartRow: 0 },
      }),
    ).toThrow(/数据起始行/);
  });
});
