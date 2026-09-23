import { describe, expect, it } from 'vitest';
import {
  detectHeaderRow,
  parsePreviewRows,
  suggestBindings,
} from './csv-import.js';

describe('CSV import preview helpers', () => {
  it('finds a real header after metadata and keeps unit rows out of numeric inference', () => {
    const text = [
      '试验名称,Sample,,',
      '说明,压缩试验,,',
      '',
      '位移,载荷,时间',
      '(mm),(N),(s)',
      '"0.0","-1.2","0.0"',
      '"0.1","-1.5","0.1"',
    ].join('\n');
    const rows = parsePreviewRows(text, ',');
    const headerRow = detectHeaderRow(rows);
    const dataStartRow = headerRow + 2;
    const suggestion = suggestBindings(
      rows,
      { encoding: 'gb18030', delimiter: ',', headerRow, dataStartRow },
      'sample.csv',
    );

    expect(headerRow).toBe(3);
    expect(suggestion.data.columns.map((column) => column.valueType)).toEqual([
      'number',
      'number',
      'number',
    ]);
    expect(suggestion.data.source.rowCount).toBe(2);
    expect(suggestion.x).toBe('column-0');
  });

  it('supports tabs and preserves quoted commas', () => {
    const rows = parsePreviewRows('Name\tValue\n"A, B"\t1', '\t');
    expect(rows).toEqual([
      ['Name', 'Value'],
      ['A, B', '1'],
    ]);
  });
});
