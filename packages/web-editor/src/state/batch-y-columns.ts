import {
  plotBindingEntries,
  roleAcceptsType,
  validateFigureTemplate,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import { bindWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from './workspace-editor.js';
import { addSeries } from './series-operations.js';
import { synchronizeCurveOneAxisTitles } from './axis-title-bindings.js';

export type BatchYSelection = {
  panelId: string;
  tableId: string;
  xColumnId: string;
  yColumnIds: string[];
};

export function batchYBindings(plot: PlotSlot) {
  if (plot.kind === 'xy' || plot.kind === 'area')
    return { x: plot.bindings.x, y: plot.bindings.y, category: false };
  if (plot.kind === 'bar')
    return {
      x: plot.bindings.category,
      y: plot.bindings.value,
      category: true,
    };
  return undefined;
}

/** 一次提交整批绑定，共享原始数据表，避免按每一列复制并解析整份数据。 */
export function batchYColumns(
  model: WorkspaceEditor,
  request: BatchYSelection,
): WorkspaceEditor {
  const panel = model.template.panels.find(
    (p) => p.panelId === request.panelId,
  );
  const source = panel?.plotSlots.at(-1);
  const roles = source && batchYBindings(source);
  if (!panel || !source || !roles)
    throw new Error(
      '批量 Y 列适用于折线、散点、柱形和面积图，请先选择图表类型并新增曲线',
    );
  const table = model.workspace.tables.find(
    (t) => t.tableId === request.tableId,
  );
  if (!table) throw new Error('所选数据表不存在');
  const x = table.columns.find((c) => c.columnId === request.xColumnId);
  if (
    !x ||
    !(roles.category
      ? roleAcceptsType('category', x.settings.type)
      : ['number', 'date', 'datetime'].includes(x.settings.type))
  )
    throw new Error('请选择兼容的 X 数据列');
  const selected = new Set(request.yColumnIds);
  if (!selected.size) throw new Error('请至少选择一列 Y 数据');
  if (selected.has(request.xColumnId))
    throw new Error('X 数据列不能同时作为批量 Y 列');
  for (const id of selected) {
    const column = table.columns.find((c) => c.columnId === id);
    if (!column || column.settings.type !== 'number')
      throw new Error('所选 Y 数据列不存在或不是数值类型');
  }
  const existing = new Set(
    panel.plotSlots.flatMap((plot) => {
      const binding = batchYBindings(plot);
      if (
        !binding ||
        plot.kind !== source.kind ||
        plot.xAxisId !== source.xAxisId ||
        plot.yAxisId !== source.yAxisId
      )
        return [];
      const xRef = model.workspace.slotBindings[binding.x!];
      const yRef = model.workspace.slotBindings[binding.y!];
      return xRef?.tableId === table.tableId &&
        xRef.columnId === request.xColumnId &&
        yRef?.tableId === table.tableId
        ? [yRef.columnId]
        : [];
    }),
  );
  const columns = table.columns.filter(
    (c) => selected.has(c.columnId) && !existing.has(c.columnId),
  );
  if (!columns.length) return model;
  for (const entry of plotBindingEntries(source)) {
    if (entry.slotId === roles.x || entry.slotId === roles.y) continue;
    const slot = model.template.dataSlots.find(
      (s) => s.dataSlotId === entry.slotId,
    )!;
    if (
      slot.required &&
      model.workspace.slotBindings[entry.slotId]?.tableId !== table.tableId
    )
      throw new Error(
        `必填附加列“${slot.name}”尚未绑定到所选数据表，请先完成当前曲线的同表绑定`,
      );
  }
  let template = model.template;
  const slotBindings = { ...model.workspace.slotBindings };
  const data = bindWorkspace(model.template, model.workspace);
  for (const column of columns) {
    const previous = template.panels
      .find((p) => p.panelId === panel.panelId)!
      .plotSlots.at(-1)!;
    const result = addSeries(template, {}, panel.panelId, data);
    if (!result.ok) throw new Error(result.message);
    template = result.value.template;
    const plot = template.panels
      .find((p) => p.panelId === panel.panelId)!
      .plotSlots.at(-1)!;
    const binding = batchYBindings(plot)!;
    // 与“新增曲线”保持一致，附加误差/映射角色继承现有绑定，再覆盖 X/Y。
    for (const entry of plotBindingEntries(previous)) {
      const ref = slotBindings[entry.slotId];
      const target = plotBindingEntries(plot).find(
        (item) => item.role === entry.role,
      );
      if (ref?.tableId === table.tableId && target)
        slotBindings[target.slotId] = { ...ref };
    }
    slotBindings[binding.x!] = {
      tableId: table.tableId,
      columnId: request.xColumnId,
    };
    slotBindings[binding.y!] = {
      tableId: table.tableId,
      columnId: column.columnId,
    };
  }
  const validation = validateFigureTemplate(template);
  if (!validation.ok)
    throw new Error(validation.issues[0]?.message ?? '批量曲线设置无效');
  return synchronizeCurveOneAxisTitles(model, {
    ...model,
    template,
    workspace: { ...model.workspace, slotBindings },
  });
}
