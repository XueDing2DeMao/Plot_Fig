import type { DataWorkspace } from '@plot-fig/data-binding';
import type { CurveGroup, PlotSlot } from '@plot-fig/figure-schema';

type Mapping = NonNullable<CurveGroup['colorMapping']>;
export type GroupParameterImportRow = {
  plotSlotId: string;
  curveName: string;
  columnName: string | null;
} & ({ ok: true; value: number } | { ok: false; error: string });

export function parseGroupParameterColumnName(name: string): number | null {
  const text = name.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text))
    return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** 只沿 Y 的现有绑定读取列名，不从显示名、其他列或数据单元格猜测。 */
export function previewGroupParameterImport(
  plots: readonly PlotSlot[],
  workspace: DataWorkspace,
): GroupParameterImportRow[] {
  return plots.map((plot): GroupParameterImportRow => {
    const base = {
      plotSlotId: plot.plotSlotId,
      curveName: plot.legendEntry.text || plot.plotSlotId,
      columnName: null,
    };
    const slotId = 'y' in plot.bindings ? plot.bindings.y : undefined;
    if (!slotId) return { ...base, ok: false, error: '此曲线没有 Y 数据绑定' };
    const reference = workspace.slotBindings[slotId];
    if (!reference)
      return { ...base, ok: false, error: `Y 数据槽「${slotId}」未绑定数据列` };
    const table = workspace.tables.find(
      (item) => item.tableId === reference.tableId,
    );
    if (!table)
      return {
        ...base,
        ok: false,
        error: `Y 源数据表「${reference.tableId}」不存在`,
      };
    const column = table.columns.find(
      (item) => item.columnId === reference.columnId,
    );
    if (!column)
      return {
        ...base,
        ok: false,
        error: `Y 源数据列「${reference.columnId}」不存在`,
      };
    const row = { ...base, columnName: column.name };
    if (!column.name.trim())
      return { ...row, ok: false, error: 'Y 源列名为空' };
    const value = parseGroupParameterColumnName(column.name);
    return value === null
      ? {
          ...row,
          ok: false,
          error: `列名「${column.name}」不是完整的有限十进制数`,
        }
      : { ...row, ok: true, value };
  });
}

/** 一次性合并预览成功项；失败项和不相关成员保留原值。 */
export function mergeImportedGroupParameters(
  mapping: Mapping,
  rows: readonly GroupParameterImportRow[],
): Mapping {
  const imported = new Map<string, number>();
  for (const row of rows)
    if (row.ok && Number.isFinite(row.value))
      imported.set(row.plotSlotId, row.value);
  if (!imported.size) return mapping;
  const current = mapping.source === 'values' ? mapping.values : [];
  const ids = new Set(current.map((entry) => entry.plotSlotId));
  let changed = mapping.source !== 'values';
  const values = current.map((entry) => {
    const value = imported.get(entry.plotSlotId);
    if (value === undefined || Object.is(value, entry.value)) return entry;
    changed = true;
    return { ...entry, value };
  });
  for (const [plotSlotId, value] of imported) {
    if (ids.has(plotSlotId)) continue;
    changed = true;
    values.push({ plotSlotId, value });
  }
  return changed ? { ...mapping, source: 'values', values } : mapping;
}
