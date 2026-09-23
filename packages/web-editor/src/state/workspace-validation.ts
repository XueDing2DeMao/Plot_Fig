import {
  createDataTable,
  DATA_LIMITS,
  type ColumnSettings,
  type DataTable,
  type DataWorkspace,
  type RawCell,
  type TableColumn,
  type TableRegion,
  type TableSource,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';

export function object(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}：需要对象`);
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string, max = 256): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`${path}：文本无效`);
  return value;
}
function identifier(value: unknown, path: string) {
  const id = text(value, path, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id))
    throw new Error(`${path}：ID 无效`);
  return id;
}
function array(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error(`${path}：数组无效或超出上限`);
  return value;
}
function member<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T))
    throw new Error(`${path}：选项无效`);
  return value as T;
}
function source(value: unknown): TableSource {
  const record = object(value, '/source');
  const result: TableSource = {
    kind: member(
      record.kind,
      ['csv', 'txt', 'xlsx', 'clipboard'],
      '/source/kind',
    ),
    name: text(record.name, '/source/name'),
  };
  if (record.sheetName !== undefined)
    result.sheetName = text(record.sheetName, '/source/sheetName');
  if (record.date1904 !== undefined) {
    if (typeof record.date1904 !== 'boolean')
      throw new Error('/source/date1904：需要布尔值');
    result.date1904 = record.date1904;
  }
  return result;
}
function settings(value: unknown): ColumnSettings {
  const record = object(value, '/settings');
  if (typeof record.unit !== 'string' || record.unit.length > 256)
    throw new Error('/settings/unit：单位无效');
  const offset = record.utcOffsetMinutes;
  if (
    typeof offset !== 'number' ||
    !Number.isInteger(offset) ||
    Math.abs(offset) > 840
  )
    throw new Error('/settings/utcOffsetMinutes：时区偏移无效');
  return {
    type: member(
      record.type,
      ['number', 'category', 'string', 'date', 'datetime'],
      '/settings/type',
    ),
    unit: record.unit,
    dateFormat: member(
      record.dateFormat,
      ['iso', 'ymd', 'dmy', 'mdy'],
      '/settings/dateFormat',
    ),
    utcOffsetMinutes: offset,
    missingTokens: array(
      record.missingTokens,
      '/settings/missingTokens',
      100,
    ).map((token) => text(token, '/settings/missingTokens')),
  };
}
function columns(value: unknown): TableColumn[] {
  const seen = new Set<string>();
  return array(value, '/columns', DATA_LIMITS.columns).map((entry, index) => {
    const column = object(entry, '/columns');
    const columnId = identifier(column.columnId, '/columnId');
    if (seen.has(columnId) || column.index !== index)
      throw new Error('/columns：重复 ID 或列顺序错误');
    seen.add(columnId);
    return {
      columnId,
      index,
      name: text(column.name, '/column/name'),
      settings: settings(column.settings),
    };
  });
}
function rawRows(value: unknown): RawCell[][] {
  let cells = 0;
  return array(value, '/rows', DATA_LIMITS.rows).map((row) => {
    const entries = array(row, '/row', DATA_LIMITS.columns);
    cells += entries.length;
    if (cells > DATA_LIMITS.cells) throw new Error('/rows：超过单元格上限');
    return entries.map((cell) => {
      if (
        cell === null ||
        typeof cell === 'string' ||
        (typeof cell === 'number' && Number.isFinite(cell))
      )
        return cell;
      throw new Error('/row/cell：单元格必须为文本、有限数值或 null');
    });
  });
}
function readTable(value: unknown): DataTable {
  const record = object(value, '/tables');
  const region = object(record.region, '/region');
  const table = createDataTable({
    tableId: identifier(record.tableId, '/tableId'),
    name: text(record.name, '/table/name'),
    source: source(record.source),
    rows: rawRows(record.rows),
    options: region as TableRegion,
  });
  const parsedColumns = columns(record.columns);
  if (table.columns.length !== parsedColumns.length)
    throw new Error('/columns：与数据区域宽度不一致');
  table.columns = parsedColumns;
  table.importDiagnostics = array(
    record.importDiagnostics,
    '/importDiagnostics',
    DATA_LIMITS.cells,
  ).map((value) => {
    const item = object(value, '/importDiagnostics');
    return {
      code: member(item.code, ['TABLE_IMPORT_WARNING'], '/diagnostic/code'),
      severity: member(item.severity, ['warning'], '/diagnostic/severity'),
      sourcePath: text(item.sourcePath, '/diagnostic/sourcePath', 1024),
      message: text(item.message, '/diagnostic/message', 4096),
    };
  });
  return table;
}
export function validateWorkspace(
  value: unknown,
  template: FigureTemplate,
): DataWorkspace {
  const record = object(value, '/workspace');
  const tables = array(
    record.tables,
    '/workspace/tables',
    DATA_LIMITS.cells,
  ).map(readTable);
  const ids = new Set(tables.map((table) => table.tableId));
  if (ids.size !== tables.length) throw new Error('/workspace/tables：重复 ID');
  const cells = tables.reduce(
    (sum, table) =>
      sum +
      table.rows.reduce(
        (count, row) => count + Math.max(row.length, table.columns.length),
        0,
      ),
    0,
  );
  if (cells > DATA_LIMITS.cells) throw new Error('/workspace：超过单元格上限');
  const activeTableId =
    record.activeTableId === null
      ? null
      : identifier(record.activeTableId, '/activeTableId');
  if (activeTableId !== null && !ids.has(activeTableId))
    throw new Error('/activeTableId：找不到数据表');
  const slotIds = new Set(template.dataSlots.map((slot) => slot.dataSlotId));
  const entries = Object.entries(
    object(record.slotBindings, '/slotBindings'),
  ).map(([slotId, value]) => {
    const ref = object(value, `/slotBindings/${slotId}`);
    const tableId = identifier(ref.tableId, '/tableId'),
      columnId = identifier(ref.columnId, '/columnId');
    if (
      !slotIds.has(slotId) ||
      !tables
        .find((table) => table.tableId === tableId)
        ?.columns.some((column) => column.columnId === columnId)
    )
      throw new Error(`/slotBindings/${slotId}：悬空引用`);
    return [slotId, { tableId, columnId }] as const;
  });
  return { tables, activeTableId, slotBindings: Object.fromEntries(entries) };
}
