import type { FigureTemplate } from '../schema/figure-template.js';

export function collectTemplateExtensionEntries(
  value: FigureTemplate,
): Array<readonly [string, unknown | undefined]> {
  const entries: Array<readonly [string, unknown | undefined]> = [
    ['/extensions/origin', value.extensions?.origin],
    ['/page/extensions/origin', value.page.extensions?.origin],
  ];

  value.panels.forEach((panel, panelIndex) => {
    entries.push([
      `/panels/${panelIndex}/extensions/origin`,
      panel.extensions?.origin,
    ]);
    panel.axes.forEach((axis, axisIndex) => {
      entries.push([
        `/panels/${panelIndex}/axes/${axisIndex}/extensions/origin`,
        axis.extensions?.origin,
      ]);
    });
    panel.plotSlots.forEach((plotSlot, plotSlotIndex) => {
      entries.push([
        `/panels/${panelIndex}/plotSlots/${plotSlotIndex}/extensions/origin`,
        plotSlot.extensions?.origin,
      ]);
    });
  });

  value.dataSlots.forEach((slot, slotIndex) => {
    entries.push([
      `/dataSlots/${slotIndex}/extensions/origin`,
      slot.extensions?.origin,
    ]);
  });
  value.annotations.forEach((annotation, annotationIndex) => {
    entries.push([
      `/annotations/${annotationIndex}/extensions/origin`,
      annotation.extensions?.origin,
    ]);
  });

  return entries;
}
