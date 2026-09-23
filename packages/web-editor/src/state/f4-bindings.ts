import { bindWorkspace, columnKey } from '@plot-fig/data-binding';
import {
  plotBindingEntries,
  roleAcceptsType,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  newIdentifier,
  assertTemplate,
  pruneSlots,
} from './publication-utils.js';

export function f4BindingColumns(model: WorkspaceEditor, plot: PlotSlot) {
  const primary =
    'x' in plot.bindings
      ? plot.bindings.x
      : 'category' in plot.bindings
        ? plot.bindings.category
        : undefined;
  const tableId = primary
    ? model.workspace.slotBindings[primary]?.tableId
    : undefined;
  return bindWorkspace(model.template, model.workspace).columns.filter(
    (c) => c.source?.tableId === tableId,
  );
}

/** 新绑定与所依赖的显示规则一次写入，数据槽不与其他曲线共享修改。 */
export function configureF4Binding(
  model: WorkspaceEditor,
  plotId: string,
  role: 'lineColor' | 'group' | 'label',
  columnId: string,
  patch?: Partial<PlotSlot>,
): WorkspaceEditor {
  const next = structuredClone(model),
    plot = next.template.panels
      .flatMap((p) => p.plotSlots)
      .find((p) => p.plotSlotId === plotId);
  if (
    !plot ||
    !['xy', 'area', 'bar'].includes(plot.kind) ||
    (role !== 'label' && plot.kind !== 'xy')
  )
    throw new Error('当前曲线不支持此数据绑定');
  if (patch) Object.assign(plot, structuredClone(patch));
  const bindings = plot.bindings as Record<string, string>,
    old = bindings[role];
  if (!columnId) {
    delete bindings[role];
    if (old) pruneSlots(next, new Set([old]));
    return assertModel(next);
  }
  const column = f4BindingColumns(model, plot).find(
    (c) => c.columnId === columnId,
  );
  if (!column?.source) throw new Error('请选择与曲线主数据同表的数据列');
  const table = next.workspace.tables.find(
    (t) => t.tableId === column.source!.tableId,
  )!;
  const raw = table.columns.find(
    (c) =>
      columnKey({ tableId: table.tableId, columnId: c.columnId }) ===
      column.columnId,
  )!;
  if (
    !roleAcceptsType(role, raw.settings.type) ||
    (role === 'lineColor' &&
      plot.kind === 'xy' &&
      plot.lineMapping?.mode === 'continuous' &&
      column.valueType !== 'number')
  )
    throw new Error('该数据列类型与映射方式不兼容');
  const shared =
    old &&
    next.template.panels
      .flatMap((p) => p.plotSlots)
      .some(
        (p) =>
          p !== plot && plotBindingEntries(p).some((e) => e.slotId === old),
      );
  const id =
    old && !shared ? old : newIdentifier(next.template, plotId + '-' + role);
  if (!old || shared)
    next.template.dataSlots.push({
      dataSlotId: id,
      name: { lineColor: '线条颜色', group: '子集分组', label: '数据标签' }[
        role
      ],
      role,
      valueType: column.valueType,
      required: false,
    });
  else
    next.template.dataSlots.find((s) => s.dataSlotId === id)!.valueType =
      column.valueType;
  bindings[role] = id;
  next.workspace.slotBindings[id] = {
    tableId: table.tableId,
    columnId: raw.columnId,
  };
  if (old) pruneSlots(next, new Set([old]));
  return assertModel(next);
}
function assertModel(model: WorkspaceEditor) {
  assertTemplate(model.template);
  return model;
}
