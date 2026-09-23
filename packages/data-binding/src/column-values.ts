import { excelDateValue, parseDateValue } from './datetime.js';
import type {
  ColumnSettings,
  ColumnType,
  DataTable,
  RawCell,
  TableColumn,
  OrganizedColumn,
} from './workspace-types.js';
import type { DataDiagnostic } from './types.js';

export function numericValue(value: string): number | null {
  const text = value.trim();
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const grouped = /^[+-]?\d{1,3}(?:[, _]\d{3})+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
  const normalized = grouped.test(text) ? text.replace(/[, _]/g, '') : text;
  return decimal.test(normalized) && Number.isFinite(Number(normalized))
    ? Number(normalized)
    : null;
}

export function defaultColumnSettings(
  type: ColumnType = 'string',
): ColumnSettings {
  return {
    type,
    unit: '',
    missingTokens: [],
    dateFormat: 'ymd',
    utcOffsetMinutes: 0,
  };
}

export function inferColumnType(values: RawCell[]): ColumnType {
  const populated = values
    .filter((v) => v !== null && String(v).trim() !== '')
    .map(String);
  if (!populated.length) return 'string';
  const settings = defaultColumnSettings('date');
  if (populated.every((value) => parseDateValue(value, settings) !== null))
    return 'date';
  if (
    populated.every(
      (value) =>
        parseDateValue(value, { ...settings, type: 'datetime' }) !== null,
    )
  )
    return 'datetime';
  if (populated.every((value) => numericValue(value) !== null)) return 'number';
  return new Set(populated).size <= 32 ? 'category' : 'string';
}

function convertCell(raw: RawCell, column: TableColumn, table: DataTable) {
  const text = raw === null ? '' : String(raw);
  const missing =
    raw === null ||
    !text.trim() ||
    column.settings.missingTokens.includes(text.trim());
  if (missing) return { value: null, missing: true };
  const { type } = column.settings;
  if (type === 'string' || type === 'category')
    return { value: text, missing: false };
  if (type === 'number') return { value: numericValue(text), missing: false };
  const value =
    table.source.kind === 'xlsx' && typeof raw === 'number'
      ? excelDateValue(raw, table.source.date1904 ?? false, column.settings)
      : parseDateValue(text, column.settings);
  return { value, missing: false };
}

export function organizeColumn(
  table: DataTable,
  column: TableColumn,
  diagnostics: DataDiagnostic[],
): OrganizedColumn {
  let missingCount = 0,
    invalidCount = 0;
  const values = table.rows
    .slice(table.region.dataStartRow)
    .map((row, index) => {
      const converted = convertCell(row[column.index] ?? null, column, table);
      if (converted.missing) missingCount += 1;
      else if (converted.value === null) {
        invalidCount += 1;
        diagnostics.push({
          code: 'TABLE_VALUE_INVALID',
          severity: 'warning',
          sourcePath: `/tables/${table.tableId}/row/${index + table.region.dataStartRow + 1}/column/${column.columnId}`,
          message: `${table.name} · ${column.name}：第 ${index + table.region.dataStartRow + 1} 行无法转换为 ${column.settings.type}`,
        });
      }
      return converted.value;
    });
  return { ...column, values, missingCount, invalidCount };
}
