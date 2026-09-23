import { bindWorkspace, columnKey } from '@plot-fig/data-binding';
import type { AxisAdvanced } from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';
import { assertTemplate, newIdentifier } from './publication-utils.js';
export function configureAxisBinding(
  model: WorkspaceEditor,
  axisId: string,
  advanced: AxisAdvanced,
): WorkspaceEditor {
  const next = structuredClone(model),
    axis = next.template.panels
      .flatMap((p) => p.axes)
      .find((a) => a.axisId === axisId);
  if (!axis) throw Error('找不到坐标轴');
  const data = bindWorkspace(model.template, model.workspace);
  axis.advanced = structuredClone(advanced);
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, v] of Object.entries(value)) {
      if (
        (key === 'dataSlotId' || key === 'positionSlotId') &&
        typeof v === 'string' &&
        v.startsWith('@column:')
      ) {
        const column = data.columns.find((c) => c.columnId === v.slice(8));
        if (!column?.source) throw Error('请选择存在的数据列');
        const table = next.workspace.tables.find(
            (t) => t.tableId === column.source!.tableId,
          )!,
          raw = table.columns.find(
            (c) =>
              columnKey({ tableId: table.tableId, columnId: c.columnId }) ===
              column.columnId,
          )!;
        const id = newIdentifier(next.template, axisId + '-data');
        next.template.dataSlots.push({
          dataSlotId: id,
          name: column.name,
          role: 'label',
          valueType: column.valueType,
          required: false,
        });
        next.workspace.slotBindings[id] = {
          tableId: table.tableId,
          columnId: raw.columnId,
        };
        (value as Record<string, unknown>)[key] = id;
      } else visit(v);
    }
  }
  visit(axis.advanced);
  assertTemplate(next.template);
  return next;
}
