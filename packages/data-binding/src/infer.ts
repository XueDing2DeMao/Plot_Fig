import type {
  DataBindingSet,
  DataColumn,
  DataDiagnostic,
  DataValue,
} from './types.js';

function isNumber(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

function columnId(name: string, index: number, used: Set<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') || `column-${index}`;
  let id = base;
  let suffix = 1;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

function inferColumn(
  name: string,
  index: number,
  values: string[],
  id: string,
): DataColumn {
  const nonEmpty = values.filter((value) => value.trim() !== '');
  const numeric = nonEmpty.length > 0 && nonEmpty.every(isNumber);
  const unique = new Set(nonEmpty);
  const valueType = numeric
    ? 'number'
    : unique.size <= 32
      ? 'category'
      : 'string';
  const converted: DataValue[] = values.map((value) => {
    if (value.trim() === '') return null;
    return numeric ? Number(value) : value;
  });
  return { columnId: id, name, index, valueType, values: converted };
}

export function inferDataBindingSet(
  rows: string[][],
  sourceName: string,
): DataBindingSet {
  if (rows.length === 0) {
    return {
      kind: 'data-binding-set',
      version: '1.0.0',
      source: { kind: 'csv', name: sourceName, rowCount: 0 },
      columns: [],
      bindings: [],
      diagnostics: [
        {
          code: 'CSV_EMPTY',
          severity: 'info',
          sourcePath: '/',
          message: 'CSV contains no rows',
        },
      ],
    };
  }
  const headers = rows[0] ?? [];
  const used = new Set<string>();
  const diagnostics: DataDiagnostic[] = [];
  const columns = headers.map((name, index) => {
    if (headers.findIndex((candidate) => candidate === name) !== index)
      diagnostics.push({
        code: 'CSV_DUPLICATE_HEADER',
        severity: 'warning',
        sourcePath: `/header/${index}`,
        message: `Duplicate header: ${name}`,
      });
    const values = rows.slice(1).map((row) => row[index] ?? '');
    return inferColumn(name, index, values, columnId(name, index, used));
  });
  return {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'csv', name: sourceName, rowCount: rows.length - 1 },
    columns,
    bindings: [],
    diagnostics,
  };
}
