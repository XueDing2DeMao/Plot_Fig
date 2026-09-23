import type { FigureTemplate } from '@plot-fig/figure-schema';

export type PropertyObjectRef =
  | { kind: 'page' }
  | { kind: 'panel'; panelId: string }
  | { kind: 'plot'; panelId: string; plotSlotId: string }
  | { kind: 'axis'; panelId: string; axisId: string };

export type PropertyObjectEntry = {
  ref: PropertyObjectRef;
  key: string;
  label: string;
  caption: string;
  depth: number;
};

export function propertyObjectKey(ref: PropertyObjectRef): string {
  switch (ref.kind) {
    case 'page':
      return JSON.stringify(['page']);
    case 'panel':
      return JSON.stringify(['panel', ref.panelId]);
    case 'plot':
      return JSON.stringify(['plot', ref.panelId, ref.plotSlotId]);
    case 'axis':
      return JSON.stringify(['axis', ref.panelId, ref.axisId]);
  }
}

export function listPropertyObjects(
  template: FigureTemplate,
): PropertyObjectEntry[] {
  const objects: PropertyObjectEntry[] = [];
  const add = (
    ref: PropertyObjectRef,
    label: string,
    caption: string,
    depth: number,
  ) => {
    objects.push({ ref, key: propertyObjectKey(ref), label, caption, depth });
  };
  add({ kind: 'page' }, `图页 ${template.metadata.name}`, '图页', 0);
  for (const panel of template.panels) {
    const panelId = panel.panelId;
    add(
      { kind: 'panel', panelId },
      `图层 ${panel.name ?? panelId}`,
      `图层 · ${panelId}${panel.visible === false ? ' · 已隐藏' : ''}`,
      1,
    );
    for (const plot of panel.plotSlots)
      add(
        { kind: 'plot', panelId, plotSlotId: plot.plotSlotId },
        `曲线 ${plot.legendEntry.text || plot.plotSlotId}`,
        `数据曲线 · ${panelId}${panel.visible === false || plot.visible === false ? ' · 已隐藏' : ''}`,
        2,
      );
    for (const axis of panel.axes) {
      const labels = {
        bottom: '下 X 轴',
        top: '上 X 轴',
        left: '左 Y 轴',
        right: '右 Y 轴',
      };
      const repeated =
        panel.axes.filter((item) => item.position === axis.position).length > 1;
      add(
        { kind: 'axis', panelId, axisId: axis.axisId },
        labels[axis.position] + (repeated ? `（${axis.axisId}）` : ''),
        `坐标轴 · ${panelId}`,
        2,
      );
    }
  }
  return objects;
}

export function initialPropertyObject(
  template: FigureTemplate,
  activePanelId?: string,
): PropertyObjectRef {
  const panel =
    template.panels.find((item) => item.panelId === activePanelId) ??
    template.panels[0];
  if (!panel) return { kind: 'page' };
  const plot = panel.plotSlots[0];
  return plot
    ? { kind: 'plot', panelId: panel.panelId, plotSlotId: plot.plotSlotId }
    : { kind: 'panel', panelId: panel.panelId };
}

export function resolvePropertyObject(
  template: FigureTemplate,
  ref: PropertyObjectRef,
): PropertyObjectRef {
  if (ref.kind === 'page') return ref;
  const panel = template.panels.find((item) => item.panelId === ref.panelId);
  if (!panel) return { kind: 'page' };
  if (ref.kind === 'panel') return ref;
  const exists =
    ref.kind === 'plot'
      ? panel.plotSlots.some((plot) => plot.plotSlotId === ref.plotSlotId)
      : panel.axes.some((axis) => axis.axisId === ref.axisId);
  return exists ? ref : { kind: 'panel', panelId: panel.panelId };
}
