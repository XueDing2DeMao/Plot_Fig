import {
  roleAcceptsType,
  plotBindingEntries,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { organizeTable } from './data-table.js';
import type {
  DataBindingSet,
  DataColumn,
  DataDiagnostic,
  SlotBinding,
} from './types.js';
import {
  DATA_LIMITS,
  type ColumnRef,
  type DataTable,
  type DataWorkspace,
  type TableColumn,
} from './workspace-types.js';

export const columnKey = (ref: ColumnRef) =>
  `${ref.tableId.length}:${ref.tableId}:${ref.columnId}`;

function renderColumn(
  table: DataTable,
  column: ReturnType<typeof organizeTable>['columns'][number],
): DataColumn {
  const type = column.settings.type;
  const temporal = type === 'date' || type === 'datetime';
  return {
    columnId: columnKey({ tableId: table.tableId, columnId: column.columnId }),
    source: {
      tableId: table.tableId,
      tableName: table.name,
      dataStartRow: table.region.dataStartRow,
    },
    name: column.name,
    ...(column.settings.unit ? { unit: column.settings.unit } : {}),
    index: column.index,
    valueType: temporal ? 'number' : type,
    values: temporal
      ? column.values.map((v) => (v === null ? null : Date.parse(String(v))))
      : column.values,
  };
}

function resolveBinding(
  slot: FigureTemplate['dataSlots'][number],
  workspace: DataWorkspace,
) {
  const ref = workspace.slotBindings[slot.dataSlotId];
  const table = workspace.tables.find((item) => item.tableId === ref?.tableId);
  const column = table?.columns.find((item) => item.columnId === ref?.columnId);
  if (!ref || !column) return undefined;
  const type = column.settings.type;
  const valid =
    roleAcceptsType(slot.role, type) ||
    (slot.role === 'x' && ['date', 'datetime'].includes(type));
  return {
    binding: {
      dataSlotId: slot.dataSlotId,
      columnId: columnKey(ref),
      status: valid ? 'valid' : 'invalid',
    } as SlotBinding,
    column,
  };
}

function checkPairedTables(
  template: FigureTemplate,
  workspace: DataWorkspace,
  data: DataBindingSet,
) {
  const plots = template.panels.flatMap((panel) => panel.plotSlots);
  const consumers = new Map<string, number>();
  for (const plot of plots)
    for (const { slotId } of plotBindingEntries(plot))
      consumers.set(slotId, (consumers.get(slotId) ?? 0) + 1);
  for (const plot of plots) {
    const ids = plotBindingEntries(plot).map((entry) => entry.slotId);
    const refs = ids.flatMap((id) =>
      workspace.slotBindings[id] ? [workspace.slotBindings[id]!] : [],
    );
    const temporalGrid =
      (plot.kind === 'heatmap' || plot.kind === 'contour') &&
      refs.some((ref) => {
        const col = workspace.tables
          .find((t) => t.tableId === ref.tableId)
          ?.columns.find((c) => c.columnId === ref.columnId);
        return col && ['date', 'datetime'].includes(col.settings.type);
      });
    if (new Set(refs.map((ref) => ref.tableId)).size <= 1 && !temporalGrid)
      continue;
    data.bindings = data.bindings.map((binding) =>
      ids.includes(binding.dataSlotId) &&
      consumers.get(binding.dataSlotId) === 1
        ? { ...binding, status: 'invalid' }
        : binding,
    );
    data.diagnostics.push({
      code: 'TABLE_BINDING_INVALID',
      severity: 'error',
      sourcePath: `/plotSlots/${plot.plotSlotId}`,
      message: temporalGrid
        ? '网格 X/Y/Z 需要数值列'
        : '同一图表的输入必须来自同一张表',
    });
  }
}

export function bindWorkspace(
  template: FigureTemplate,
  workspace: DataWorkspace,
): DataBindingSet {
  const columns: DataColumn[] = [],
    diagnostics: DataDiagnostic[] = [],
    bindings: SlotBinding[] = [];
  for (const table of workspace.tables) {
    const organized = organizeTable(table);
    columns.push(
      ...organized.columns.map((column) => renderColumn(table, column)),
    );
    for (const diagnostic of organized.diagnostics)
      diagnostics.push(diagnostic);
  }
  for (const slot of template.dataSlots) {
    const resolved = resolveBinding(slot, workspace);
    if (!resolved && !slot.required && !workspace.slotBindings[slot.dataSlotId])
      continue;
    if (resolved) bindings.push(resolved.binding);
    if (resolved?.binding.status === 'valid') continue;
    diagnostics.push({
      code: resolved ? 'COLUMN_TYPE_CONFLICT' : 'SLOT_COLUMN_MISSING',
      severity: 'error',
      sourcePath: `/dataSlots/${slot.dataSlotId}`,
      message: resolved
        ? `${slot.name} 的列类型不兼容，当前为 ${resolved.column.settings.type}`
        : `${slot.name} 尚未绑定可用数据列`,
    });
  }
  const data: DataBindingSet = {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: {
      kind: 'session',
      name: '数据工作区',
      rowCount: workspace.tables.reduce(
        (max, table) =>
          Math.max(max, table.rows.length - table.region.dataStartRow),
        0,
      ),
    },
    columns,
    bindings,
    diagnostics,
  };
  checkPairedTables(template, workspace, data);
  return data;
}

export function suggestTableColumn(
  table: DataTable,
  slot: { name: string; role: string },
): TableColumn | undefined {
  const matches = table.columns.filter(
    (column) => column.name.toLowerCase() === slot.name.toLowerCase(),
  );
  if (matches.length === 1) return matches[0];
  const numeric = table.columns.filter(
    (column) => column.settings.type === 'number',
  );
  if (['category', 'group', 'split'].includes(slot.role))
    return (
      table.columns.find((c) =>
        ['category', 'string'].includes(c.settings.type),
      ) ?? (slot.role === 'category' ? table.columns[0] : undefined)
    );
  if (slot.role === 'values') return numeric[0];
  if (slot.role === 'z') return numeric[2];
  if (slot.role === 'x')
    return (
      table.columns.find((column) =>
        ['date', 'datetime'].includes(column.settings.type),
      ) ?? numeric[0]
    );
  return numeric[1] ?? numeric[0] ?? table.columns[1] ?? table.columns[0];
}

export function bindTableToPlot(
  workspace: DataWorkspace,
  template: FigureTemplate,
  selection: { plotSlotId: string; tableId: string },
): DataWorkspace {
  const plot = template.panels
    .flatMap((panel) => panel.plotSlots)
    .find((p) => p.plotSlotId === selection.plotSlotId);
  if (!plot) throw new Error('找不到曲线');
  const table = workspace.tables.find((t) => t.tableId === selection.tableId);
  const slotBindings = { ...workspace.slotBindings };
  for (const slotId of Object.values(plot.bindings)) {
    if (!slotId) continue;
    delete slotBindings[slotId];
    const slot = template.dataSlots.find((s) => s.dataSlotId === slotId);
    const column = table && slot && suggestTableColumn(table, slot);
    if (column)
      slotBindings[slotId] = {
        tableId: table!.tableId,
        columnId: column.columnId,
      };
  }
  return { ...workspace, slotBindings };
}

export function appendWorkspaceTables(
  workspace: DataWorkspace,
  incoming: DataTable[],
): DataWorkspace {
  const used = new Set(workspace.tables.map((table) => table.tableId));
  const added = incoming.map((table) => {
    let tableId = table.tableId,
      suffix = 1;
    while (used.has(tableId)) tableId = `${table.tableId}-${suffix++}`;
    used.add(tableId);
    return { ...table, tableId };
  });
  const tables = [...workspace.tables, ...added];
  const cells = tables.reduce(
    (sum, table) =>
      sum +
      table.rows.reduce(
        (count, row) => count + Math.max(row.length, table.columns.length),
        0,
      ),
    0,
  );
  if (cells > DATA_LIMITS.cells) throw new Error('工作区超过单元格上限');
  return {
    ...workspace,
    tables,
    activeTableId: added[0]?.tableId ?? workspace.activeTableId,
  };
}

export function removeWorkspaceTable(
  workspace: DataWorkspace,
  tableId: string,
): DataWorkspace {
  const tables = workspace.tables.filter((table) => table.tableId !== tableId);
  return {
    tables,
    activeTableId:
      workspace.activeTableId === tableId
        ? (tables[0]?.tableId ?? null)
        : workspace.activeTableId,
    slotBindings: Object.fromEntries(
      Object.entries(workspace.slotBindings).filter(
        ([, ref]) => ref.tableId !== tableId,
      ),
    ),
  };
}
