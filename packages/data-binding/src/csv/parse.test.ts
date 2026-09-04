import { describe, expect, it } from 'vitest';
import { parseCsvText } from './parse.js';

describe('parseCsvText', () => {
  it('parses quoted fields, escaped quotes, empty values and CRLF', () => {
    const result = parseCsvText(
      'X,Y,Note\r\n1,"hello, world","say ""hi"""\r\n2,,ok\r\n',
      'fixture.csv',
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.rows).toEqual([
        ['X', 'Y', 'Note'],
        ['1', 'hello, world', 'say "hi"'],
        ['2', '', 'ok'],
      ]);
  });

  it('reports blank input and unterminated quoted fields', () => {
    expect(parseCsvText('  \r\n', 'empty.csv')).toMatchObject({
      ok: true,
      rows: [],
      diagnostics: [{ code: 'CSV_EMPTY', severity: 'info', sourcePath: '/' }],
    });
    expect(parseCsvText('X,Y\n1,"broken', 'broken.csv')).toMatchObject({
      ok: false,
      diagnostics: [
        {
          code: 'CSV_PARSE_ERROR',
          severity: 'error',
          sourcePath: '/row/1/column/1',
        },
      ],
    });
  });
});
