import { inferDataBindingSet } from './infer.js';
import {
  defaultColumnSettings,
  inferColumnType,
  organizeColumn,
} from './column-values.js';
import {
  DATA_LIMITS,
  type ColumnSettings,
  type ColumnType,
  type DataTable,
  type OrganizedTable,
  type RawCell,
  type TableRegion,
  type TableSource,
} from './workspace-types.js';
import type { DataDiagnostic } from './types.js';

type TableInput = {
  tableId: string;
  source: TableSource;
  name?: string;
  rows: RawCell[][];
  options?: TableRegion;
  hints?: Record<number, ColumnType>;
  diagnostics?: DataDiagnostic[];
};
const DEFAULT_REGION: TableRegion = {
  headerRow: 0,
  unitRow: null,
  dataStartRow: 1,
};

function validateRegion(rows: RawCell[][], region: TableRegion) {
  if (!rows.length) throw new Error('数据表为空');
  if (
    !Number.isInteger(region.dataStartRow) ||
    region.dataStartRow < 0 ||
    region.dataStartRow > rows.length
  )
    throw new Error('数据起始行超出范围');
  for (const index of [region.headerRow, region.unitRow]) {
    if (
      index !== null &&
      (!Number.isInteger(index) || index < 0 || index >= region.dataStartRow)
    )
      throw new Error('表头与单位行必须位于数据起始行之前');
  }
  if (region.headerRow !== null && region.headerRow === region.unitRow)
    throw new Error('表头和单位行不能相同');
}

function tableHeaders(input: TableInput, region: TableRegion) {
  if (region.headerRow !== null)
    return input.rows[region.headerRow]!.map((value) =>
      value === null ? '' : String(value),
    );
  const width = input.rows
    .slice(region.dataStartRow)
    .reduce((max, row) => Math.max(max, row.length), 0);
  return Array.from({ length: width }, () => '');
}

function checkSize(rows: RawCell[][], width: number, region: TableRegion) {
  if (!width || width > DATA_LIMITS.columns || rows.length > DATA_LIMITS.rows)
    throw new Error('数据表行列数超出范围');
  const cells = rows.reduce((sum, row) => sum + Math.max(row.length, width), 0);
  if (cells > DATA_LIMITS.cells) throw new Error('数据超过单元格上限');
  const extra = rows.findIndex(
    (row, index) => index >= region.dataStartRow && row.length > width,
  );
  if (extra >= 0)
    throw new Error(`第 ${extra + 1} 行超出表头 ${width} 列，请调整数据区`);
}

function createColumns(
  input: TableInput,
  region: TableRegion,
  headers: string[],
) {
  const inferred = inferDataBindingSet([headers], input.source.name);
  return inferred.columns.map((column) => {
    const type =
      input.hints?.[column.index] ??
      inferColumnType(
        input.rows
          .slice(region.dataStartRow)
          .map((row) => row[column.index] ?? null),
      );
    const unit =
      region.unitRow === null
        ? ''
        : String(input.rows[region.unitRow]?.[column.index] ?? '').replace(
            /^[([]|[)\]]$/g,
            '',
          );
    return {
      columnId: column.columnId,
      index: column.index,
      name: column.name || `列 ${column.index + 1}`,
      settings: { ...defaultColumnSettings(type), unit },
    };
  });
}

export function createDataTable(input: TableInput): DataTable {
  const region = input.options ?? DEFAULT_REGION;
  validateRegion(input.rows, region);
  const headers = tableHeaders(input, region);
  checkSize(input.rows, headers.length, region);
  return {
    tableId: input.tableId,
    name: input.name ?? input.source.sheetName ?? input.source.name,
    source: { ...input.source },
    rows: structuredClone(input.rows),
    region: { ...region },
    columns: createColumns(input, region, headers),
    importDiagnostics: structuredClone(input.diagnostics ?? []),
  };
}

export function updateTableColumn(
  table: DataTable,
  columnId: string,
  patch: { name?: string; settings?: Partial<ColumnSettings> },
): DataTable {
  if (!table.columns.some((column) => column.columnId === columnId))
    throw new Error('找不到数据列');
  return {
    ...table,
    columns: table.columns.map((column) =>
      column.columnId === columnId
        ? {
            ...column,
            name: patch.name?.trim() || column.name,
            settings: { ...column.settings, ...patch.settings },
          }
        : column,
    ),
  };
}

export function organizeTable(table: DataTable): OrganizedTable {
  const diagnostics = [...table.importDiagnostics];
  const columns = table.columns.map((column) =>
    organizeColumn(table, column, diagnostics),
  );
  return {
    columns,
    diagnostics,
    rowCount: table.rows.length - table.region.dataStartRow,
  };
}
