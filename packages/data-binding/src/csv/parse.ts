import type { DataDiagnostic } from '../types.js';

export type CsvParseResult =
  | { ok: true; rows: string[][]; diagnostics: DataDiagnostic[] }
  | { ok: false; rows: string[][]; diagnostics: DataDiagnostic[] };

function diagnostic(
  code: DataDiagnostic['code'],
  severity: DataDiagnostic['severity'],
  sourcePath: string,
  message: string,
): DataDiagnostic {
  return { code, severity, sourcePath, message };
}

export function parseCsvText(
  text: string,
  _sourceName: string,
): CsvParseResult {
  if (text.trim() === '') {
    return {
      ok: true,
      rows: [],
      diagnostics: [diagnostic('CSV_EMPTY', 'info', '/', 'CSV input is empty')],
    };
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closedQuote = false;
  let rowIndex = 0;
  let columnIndex = 0;

  const error = (message: string): CsvParseResult => ({
    ok: false,
    rows,
    diagnostics: [
      diagnostic(
        'CSV_PARSE_ERROR',
        'error',
        `/row/${rowIndex}/column/${columnIndex}`,
        message,
      ),
    ],
  });
  const pushField = () => {
    row.push(field);
    field = '';
    columnIndex += 1;
    closedQuote = false;
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
    rowIndex += 1;
    columnIndex = 0;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else if (character === '\r' || character === '\n') {
        return error('Quoted fields cannot span multiple lines');
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === ',') {
        pushField();
      } else if (character === '\r' || character === '\n') {
        pushRow();
        if (character === '\r' && text[index + 1] === '\n') index += 1;
      } else {
        return error('Unexpected content after closing quote');
      }
    } else if (character === '"' && field === '') {
      quoted = true;
    } else if (character === '"') {
      return error('Quote must begin a field');
    } else if (character === ',') {
      pushField();
    } else if (character === '\r' || character === '\n') {
      pushRow();
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else {
      field += character;
    }
  }

  if (quoted) return error('Unterminated quoted field');
  if (field !== '' || row.length > 0 || !text.endsWith('\n')) pushRow();
  return { ok: true, rows, diagnostics: [] };
}
