import { roleAcceptsType, type FigureTemplate } from '@plot-fig/figure-schema';
import type { ColumnRef, DataWorkspace } from '@plot-fig/data-binding';

/** 只属于当前批次；null 表示用户明确不绑定此槽。 */
export type BatchColumnMapping = Record<string, ColumnRef | null>;
export type BatchColumnMappings = Record<string, BatchColumnMapping>;

export function hasMultipleBatchSources(
  template: FigureTemplate,
  workspace: DataWorkspace,
) {
  return (
    new Set(
      template.dataSlots.flatMap((s) => {
        const ref = workspace.slotBindings[s.dataSlotId];
        return ref ? [ref.tableId] : [];
      }),
    ).size > 1
  );
}

/** 两列兜底只用于一条 XY 曲线，先锁定手选/同名列，再分配剩余列。 */
function twoColumnXY(
  template: FigureTemplate,
  workspace: DataWorkspace,
  names: Record<string, string>,
  overrides: BatchColumnMapping,
) {
  const table = workspace.tables[0];
  const plots = template.panels.flatMap((p) => p.plotSlots);
  const plot = plots[0];
  const result: Record<string, ColumnRef> = {};
  if (
    workspace.tables.length !== 1 ||
    table?.columns.length !== 2 ||
    template.panels.length !== 1 ||
    plots.length !== 1 ||
    plot?.kind !== 'xy'
  )
    return result;
  const columns = [...table.columns].sort((a, b) => a.index - b.index);
  // 重复表头仍需手选，不能靠位置隐藏导入歧义。
  if (new Set(columns.map((c) => c.name.trim().toLowerCase())).size !== 2)
    return result;
  const slots = [plot.bindings.x, plot.bindings.y].map((id) =>
    template.dataSlots.find((s) => s.dataSlotId === id)!,
  );
  const refFor = (columnId: string) => ({ tableId: table.tableId, columnId });
  const available = (columnId: string) =>
    !Object.values(result).some((r) => r.columnId === columnId);
  for (const slot of slots) {
    const ref = overrides[slot.dataSlotId];
    if (ref) result[slot.dataSlotId] = ref;
  }
  for (const slot of slots) {
    if (Object.hasOwn(overrides, slot.dataSlotId)) continue;
    const matches = columns.filter(
      (c) => c.name === (names[slot.dataSlotId] ?? slot.name),
    );
    if (matches.length === 1 && available(matches[0]!.columnId))
      result[slot.dataSlotId] = refFor(matches[0]!.columnId);
  }
  for (const slot of slots) {
    if (Object.hasOwn(overrides, slot.dataSlotId) || result[slot.dataSlotId])
      continue;
    const column = columns.find(
      (c) => c.name.trim().toLowerCase() === slot.role,
    );
    if (column && available(column.columnId))
      result[slot.dataSlotId] = refFor(column.columnId);
  }
  for (const slot of slots) {
    if (Object.hasOwn(overrides, slot.dataSlotId) || result[slot.dataSlotId])
      continue;
    const column = columns.find((c) => available(c.columnId));
    if (column) result[slot.dataSlotId] = refFor(column.columnId);
  }
  return result;
}

export function sourceColumnNames(
  template: FigureTemplate,
  workspace: DataWorkspace,
) {
  return Object.fromEntries(
    template.dataSlots.flatMap((slot) => {
      const ref = workspace.slotBindings[slot.dataSlotId];
      const name =
        ref &&
        workspace.tables
          .find((t) => t.tableId === ref.tableId)
          ?.columns.find((c) => c.columnId === ref.columnId)?.name;
      return name === undefined ? [] : [[slot.dataSlotId, name]];
    }),
  );
}

export function inspectBatchColumns(
  template: FigureTemplate,
  workspace: DataWorkspace,
  names: Record<string, string> = {},
  overrides: BatchColumnMapping = {},
  autoOptional = true,
  autoXY = false,
) {
  const inferred = autoXY
    ? twoColumnXY(template, workspace, names, overrides)
    : {};
  return template.dataSlots.map((slot) => {
    const id = slot.dataSlotId,
      name = names[id] ?? slot.name;
    const explicit = Object.hasOwn(overrides, id);
    const candidates = workspace.tables.flatMap((table) =>
      table.columns
        .filter((column) => column.name === name)
        .map((column) => ({
          table,
          column,
          ref: { tableId: table.tableId, columnId: column.columnId },
        })),
    );
    const ref = explicit
      ? (overrides[id] ?? undefined)
      : !slot.required && !autoOptional && names[id] === undefined
        ? undefined
        : (inferred[id] ??
          (candidates.length === 1 ? candidates[0]!.ref : undefined));
    const table =
      ref && workspace.tables.find((t) => t.tableId === ref.tableId);
    const column =
      table && table.columns.find((c) => c.columnId === ref!.columnId);
    const location = `${workspace.tables.map((t) => t.name).join('、')} / ${slot.name} (${slot.role})`;
    let error = '';
    if (explicit && ref && !column) error = `${location}：所选数据列已不存在`;
    else if (
      !explicit &&
      candidates.length > 1 &&
      (autoOptional || slot.required || names[id] !== undefined)
    )
      error = `${location}：列名重复「${name}」，请显式选择数据列`;
    else if (!ref && (slot.required || (!explicit && names[id] !== undefined)))
      error = `${location}：${slot.required ? '必需列' : '原绑定列'}缺失「${name}」，请选择数据列`;
    // 正式绑定器将日期 X 转为时间戳，其余角色仍按原列类型校验。
    else if (
      column &&
      !roleAcceptsType(
        slot.role,
        slot.role === 'x' && ['date', 'datetime'].includes(column.settings.type)
          ? 'number'
          : column.settings.type,
      )
    )
      error = `${location}：列「${column.name}」类型 ${column.settings.type} 不兼容`;
    return { slot, name, ref, error };
  });
}

export function resolveBatchColumns(
  ...args: Parameters<typeof inspectBatchColumns>
) {
  const rows = inspectBatchColumns(...args),
    errors = rows.filter((r) => r.error);
  if (errors.length) throw new Error(errors.map((r) => r.error).join('；'));
  return Object.fromEntries(
    rows.flatMap((r) => (r.ref ? [[r.slot.dataSlotId, r.ref]] : [])),
  );
}
