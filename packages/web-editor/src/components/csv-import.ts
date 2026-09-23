import { inferDataBindingSet } from '@plot-fig/data-binding';

export type CsvImportOptions = {
  encoding: 'utf-8' | 'gb18030' | 'utf-16le';
  delimiter: ',' | '\t' | ';';
  headerRow: number;
  dataStartRow: number;
};

export type CsvImportPreview = {
  text: string;
  rows: string[][];
  options: CsvImportOptions;
  detectedEncoding: string;
  delimiter: CsvImportOptions['delimiter'];
};

const encodings = ['utf-8', 'gb18030', 'utf-16le'] as const;

function decode(bytes: ArrayBuffer, encoding: CsvImportOptions['encoding']) {
  return new TextDecoder(encoding).decode(bytes).replace(/^\uFEFF/, '');
}

export async function readCsvFile(
  file: File,
  encoding: CsvImportOptions['encoding'] = 'utf-8',
): Promise<{ text: string; detectedEncoding: string }> {
  if (typeof file.arrayBuffer !== 'function') {
    const text = typeof file.text === 'function' ? await file.text() : '';
    return {
      text,
      detectedEncoding: encoding === 'utf-8' ? 'UTF-8' : encoding,
    };
  }
  const bytes = await file.arrayBuffer();
  if (encoding !== 'utf-8')
    return { text: decode(bytes, encoding), detectedEncoding: encoding };
  const utf8 = decode(bytes, 'utf-8');
  if (!utf8.includes('\uFFFD'))
    return { text: utf8, detectedEncoding: 'UTF-8' };
  return { text: decode(bytes, 'gb18030'), detectedEncoding: 'GB18030' };
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (character === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

export function parsePreviewRows(text: string, delimiter: string): string[][] {
  return text.split(/\r\n|\n|\r/).map((line) => splitLine(line, delimiter));
}

function numericRatio(row: string[], nextRows: string[][]): number {
  if (row.length < 2) return 0;
  const values = nextRows
    .slice(0, 8)
    .flatMap((next) => row.map((_, i) => next[i] ?? ''));
  const populated = values.filter((value) => value.trim() !== '');
  return populated.length === 0
    ? 0
    : populated.filter((value) => Number.isFinite(Number(value))).length /
        populated.length;
}

export function detectHeaderRow(rows: string[][]): number {
  const firstNumeric = rows.findIndex(
    (row, index) => index > 0 && numericRatio(row, [row]) >= 0.5,
  );
  if (firstNumeric < 1) return 0;
  let candidate = firstNumeric - 1;
  while (candidate > 0 && isUnitRow(rows[candidate] ?? [])) candidate -= 1;
  return candidate;
}

function isUnitRow(row: string[]): boolean {
  const values = row.filter((cell) => cell.trim() !== '');
  return (
    values.length > 0 &&
    values.every((cell) => /^[\s()[\]A-Za-z0-9%μ/.*-]{1,16}$/.test(cell))
  );
}

function quoteCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCanonicalCsv(rows: string[][]): string {
  return rows.map((row) => row.map(quoteCsvCell).join(',')).join('\n');
}

export function makePreview(
  text: string,
  options: CsvImportOptions,
  detectedEncoding: string,
): CsvImportPreview {
  const rows = parsePreviewRows(text, options.delimiter);
  return {
    text,
    rows,
    options,
    detectedEncoding,
    delimiter: options.delimiter,
  };
}

export function suggestBindings(
  rows: string[][],
  options: CsvImportOptions,
  sourceName: string,
) {
  const sourceRows = [
    rows[options.headerRow] ?? [],
    ...rows.slice(options.dataStartRow).filter((row) => row.some(Boolean)),
  ];
  const data = inferDataBindingSet(sourceRows, sourceName);
  const numeric = data.columns.filter(
    (column) => column.valueType === 'number',
  );
  return {
    data,
    x: numeric[0]?.columnId ?? '',
    y: numeric[1]?.columnId ?? numeric[0]?.columnId ?? '',
  };
}

export function availableEncodings() {
  return encodings;
}
