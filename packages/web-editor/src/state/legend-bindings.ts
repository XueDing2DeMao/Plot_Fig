import type { WorkspaceEditor } from './workspace-editor.js';

/** 只有明确选择自动来源的条目跟随绑定；旧项目和手动空文字均保持原样。 */
export function synchronizeLegendSources(
  model: WorkspaceEditor,
): WorkspaceEditor {
  let template = model.template;
  for (const panel of model.template.panels)
    for (const plot of panel.plotSlots) {
      if (plot.legendEntry.source !== 'auto') continue;
      const bindings = plot.bindings as Record<string, string>;
      const slot =
        bindings.y ?? bindings.values ?? bindings.value ?? bindings.z;
      const ref = slot ? model.workspace.slotBindings[slot] : undefined;
      const column =
        ref &&
        model.workspace.tables
          .find((t) => t.tableId === ref.tableId)
          ?.columns.find((c) => c.columnId === ref.columnId);
      const text = (
        column?.name ||
        model.template.dataSlots.find((s) => s.dataSlotId === slot)?.name ||
        plot.plotSlotId
      )
        .replaceAll('<', '＜')
        .replaceAll('>', '＞')
        .slice(0, 1024);
      if (text === plot.legendEntry.text) continue;
      if (template === model.template) template = structuredClone(template);
      template.panels
        .find((p) => p.panelId === panel.panelId)!
        .plotSlots.find(
          (p) => p.plotSlotId === plot.plotSlotId,
        )!.legendEntry.text = text;
    }
  return template === model.template ? model : { ...model, template };
}
