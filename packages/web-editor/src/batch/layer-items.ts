import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { isolateLayer } from '../state/layer-batch.js';
import type { BatchItem } from './items.js';

export function layerBatchItems(
  model: WorkspaceEditor,
  panelIds: string[],
): BatchItem[] {
  return [...new Set(panelIds)].map((id) => {
    const index = model.template.panels.findIndex((p) => p.panelId === id);
    const name = model.template.panels[index]?.name ?? `图层 ${index + 1}`;
    try {
      const layer = isolateLayer(model, id);
      const missing = layer.template.dataSlots.filter(
        (slot) =>
          slot.required && !layer.workspace.slotBindings[slot.dataSlotId],
      );
      return {
        id,
        name,
        model: layer,
        ...(missing.length
          ? {
              error:
                '请先为本图层绑定数据列：' +
                [...new Set(missing.map((slot) => slot.name))].join('、'),
            }
          : {}),
      };
    } catch (error) {
      return {
        id,
        name,
        error: error instanceof Error ? error.message : '无法读取图层',
      };
    }
  });
}
