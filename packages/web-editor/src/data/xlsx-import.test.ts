import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { readWorkbook } from './xlsx-import.js';
import { createDataTable, organizeTable } from '@plot-fig/data-binding';

function workbookBytes(date1904 = false) {
  const book = XLSX.utils.book_new();
  book.Workbook = { WBProps: { date1904 } };
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Date', 'Y', 'Formula'],
    [61, 4, 8],
    [62, 5, null],
  ]);
  sheet.A2!.z = 'yyyy-mm-dd';
  sheet.A3!.z = 'yyyy-mm-dd';
  sheet.C2 = { t: 'n', f: 'B2*2', v: 8 };
  sheet.C3 = { t: 'n', f: 'B3*2' };
  XLSX.utils.book_append_sheet(book, sheet, 'Measurements');
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([
      ['X', 'Y'],
      [1, 3],
    ]),
    'Other',
  );
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
describe('xlsx ingestion', () => {
  it('reads multiple real worksheets, date metadata and cached formula values', async () => {
    const result = await readWorkbook(workbookBytes(), 'book.xlsx');
    expect(result.map((s) => s.source.sheetName)).toEqual([
      'Measurements',
      'Other',
    ]);
    const table = createDataTable({ tableId: 't', ...result[0]! });
    const organized = organizeTable(table);
    expect(table.rows[1]?.[0]).toBe(61);
    expect(organized.columns[0]?.values).toEqual(['1900-03-01', '1900-03-02']);
    expect(organized.columns[2]?.values).toEqual([8, null]);
    expect(table.importDiagnostics.length).toBeGreaterThan(0);
  });
  it('respects the workbook epoch and rejects non-XLSX data', async () => {
    const result = await readWorkbook(workbookBytes(true), 'mac.xlsx');
    expect(result[0]?.source.date1904).toBe(true);
    const organized = organizeTable(
      createDataTable({ tableId: 't', ...result[0]! }),
    );
    expect(organized.columns[0]?.values[0]).toBe('1904-03-02');
    await expect(
      readWorkbook(new TextEncoder().encode('X,Y\n1,2').buffer, 'fake.xlsx'),
    ).rejects.toThrow(/XLSX/);
  });
  it('ignores locale and quoted text when distinguishing dates from times', async () => {
    const book = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Date', 'Timestamp'],
      [61, 61.5],
    ]);
    sheet.A2!.z = '[$-en-US]yyyy-mm-dd "days"';
    sheet.B2!.z = 'yyyy-mm-dd hh:mm:ss';
    XLSX.utils.book_append_sheet(book, sheet, 'Dates');
    const bytes = XLSX.write(book, {
      type: 'array',
      bookType: 'xlsx',
    }) as ArrayBuffer;
    const result = await readWorkbook(bytes, 'dates.xlsx');
    const organized = organizeTable(
      createDataTable({ tableId: 't', ...result[0]! }),
    );
    expect(organized.columns.map((column) => column.settings.type)).toEqual([
      'date',
      'datetime',
    ]);
    expect(organized.columns.map((column) => column.values[0])).toEqual([
      '1900-03-01',
      '1900-03-01T12:00:00.000Z',
    ]);
  });
});
