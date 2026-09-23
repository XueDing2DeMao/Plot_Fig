import {
  createDataTable,
  type DataTable,
  type TableRegion,
} from '@plot-fig/data-binding';

function uniqueColumnId(candidate: string, used: Set<string>): string {
  let value = candidate;
  let suffix = 1;
  while (used.has(value)) value = `${candidate}-${suffix++}`;
  used.add(value);
  return value;
}

export function rebuildImportedTable(
  table: DataTable,
  region: TableRegion,
): DataTable {
  const rebuilt = createDataTable({
    tableId: table.tableId,
    name: table.name,
    source: table.source,
    rows: table.rows,
    options: region,
    diagnostics: table.importDiagnostics,
  });
  const headerChanged = region.headerRow !== table.region.headerRow;
  const unitChanged = region.unitRow !== table.region.unitRow;
  const used = new Set<string>();
  rebuilt.columns = rebuilt.columns.map((column, index) => {
    const previous = table.columns[index];
    if (!previous)
      return {
        ...column,
        columnId: uniqueColumnId(column.columnId, used),
      };
    const columnId = uniqueColumnId(previous.columnId, used);
    return {
      ...column,
      columnId,
      name: headerChanged ? column.name : previous.name,
      settings: {
        ...previous.settings,
        unit: unitChanged ? column.settings.unit : previous.settings.unit,
      },
    };
  });
  return rebuilt;
}
