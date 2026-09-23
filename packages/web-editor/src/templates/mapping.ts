import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { ColumnRef } from '@plot-fig/data-binding';
import type { DataWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { bindWorkspace } from '@plot-fig/data-binding';
import { roleAcceptsType } from '@plot-fig/figure-schema';
import { renderFigureSvg, rescaleFigureRanges } from '@plot-fig/svg-renderer';

export function suggestMappings(
  template: FigureTemplate,
  workspace: DataWorkspace,
): Record<string, ColumnRef> {
  const mapping: Record<string, ColumnRef> = {};
  for (const slot of template.dataSlots) {
    const matches = workspace.tables.flatMap((table) =>
      table.columns
        .filter(
          (c) =>
            (c.name.toLowerCase() === slot.name.toLowerCase() ||
              c.name.toLowerCase() === slot.role.toLowerCase()) &&
            roleAcceptsType(slot.role, c.settings.type),
        )
        .map((c) => ({ tableId: table.tableId, columnId: c.columnId })),
    );
    if (matches.length === 1) mapping[slot.dataSlotId] = matches[0]!;
  }
  return mapping;
}
export function applyFullTemplate(
  model: WorkspaceEditor,
  template: FigureTemplate,
  mapping: Record<string, ColumnRef>,
): WorkspaceEditor {
  const workspace = structuredClone(model.workspace);
  workspace.slotBindings = structuredClone(mapping);
  for (const slot of template.dataSlots)
    if (slot.required && !mapping[slot.dataSlotId])
      throw new Error('请选择数据列：' + slot.name);
  const data = bindWorkspace(template, workspace);
  const resolved = rescaleFigureRanges({
    before: template,
    candidate: template,
    beforeData: data,
    data,
    reason: 'initialize',
  });
  template = resolved.template;
  const result = renderFigureSvg(template, data);
  const errors = [
    ...data.diagnostics,
    ...resolved.diagnostics,
    ...result.diagnostics,
  ].filter((d) => d.severity === 'error');
  if (!result.ok || errors.length)
    throw new Error(
      errors.map((e) => e.message).join('\n') || '模板无法应用到这些数据',
    );
  return {
    template: structuredClone(template),
    workspace,
    activePanelId: template.panels[0]!.panelId,
  };
}
