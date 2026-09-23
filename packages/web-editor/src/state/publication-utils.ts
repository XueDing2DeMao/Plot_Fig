import {
  plotBindingEntries,
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { templateIdentifiers } from './series-operations.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import { axisDataSlotIds } from './axis-data-refs.js';
export function newIdentifier(
  template: FigureTemplate,
  prefix: string,
): string {
  const ids = templateIdentifiers(template);
  let id = prefix,
    index = 1;
  while (ids.has(id)) id = prefix + '-' + index++;
  return id;
}
export function assertTemplate(template: FigureTemplate): FigureTemplate {
  const result = validateFigureTemplate(template);
  if (!result.ok)
    throw new Error(
      result.issues
        .slice(0, 4)
        .map((i) => i.path + ': ' + i.message)
        .join('；'),
    );
  return template;
}
export function pruneSlots(model: WorkspaceEditor, candidates: Set<string>) {
  const plots = model.template.panels.flatMap((p) => p.plotSlots);
  const used = new Set(
    plots.flatMap((p) => plotBindingEntries(p).map((e) => e.slotId)),
  );
  const removed = new Set([...candidates].filter((id) => !used.has(id)));
  for (const panel of model.template.panels)
    for (const axis of panel.axes)
      for (const id of axisDataSlotIds(axis.advanced)) removed.delete(id);
  model.template.dataSlots = model.template.dataSlots.filter(
    (s) => !removed.has(s.dataSlotId),
  );
  for (const id of removed) delete model.workspace.slotBindings[id];
  const ids = new Set(plots.map((p) => p.plotSlotId));
  for (const a of model.template.annotations)
    if (a.kind === 'legend' && a.layout?.plotSlotIds)
      a.layout.plotSlotIds = a.layout.plotSlotIds.filter((id) => ids.has(id));
}
export function panelForPlot(template: FigureTemplate, id: string) {
  const panel = template.panels.find((p) =>
    p.plotSlots.some((plot) => plot.plotSlotId === id),
  );
  if (!panel) throw new Error('找不到图表所属图层');
  return panel;
}
export function synchronizeSharedAxes(
  template: FigureTemplate,
  panelId: string,
) {
  for (const group of template.sharedAxisGroups ?? []) {
    const ref = group.members.find((m) => m.panelId === panelId);
    if (!ref) continue;
    synchronizeSharedAxis(template, ref);
  }
}

export function synchronizeSharedAxis(
  template: FigureTemplate,
  ref: { panelId: string; axisId: string },
) {
  const source = template.panels
    .find((panel) => panel.panelId === ref.panelId)
    ?.axes.find((axis) => axis.axisId === ref.axisId);
  if (!source) throw new Error(`找不到共享源轴 ${ref.panelId}/${ref.axisId}`);
  for (const group of template.sharedAxisGroups ?? []) {
    if (
      !group.members.some(
        (member) =>
          member.panelId === ref.panelId && member.axisId === ref.axisId,
      )
    )
      continue;
    for (const member of group.members) {
      const axis = template.panels
        .find((panel) => panel.panelId === member.panelId)
        ?.axes.find((item) => item.axisId === member.axisId);
      if (!axis)
        throw new Error(`找不到共享目标轴 ${member.panelId}/${member.axisId}`);
      axis.range = structuredClone(source.range);
      axis.scale = source.scale;
      if (source.symLog) axis.symLog = structuredClone(source.symLog);
      else delete axis.symLog;
      if (source.logTicks) axis.logTicks = structuredClone(source.logTicks);
      else delete axis.logTicks;
      if (source.scaleOptions)
        axis.scaleOptions = structuredClone(source.scaleOptions);
      else delete axis.scaleOptions;
      const advanced = { ...axis.advanced };
      for (const key of ['breaks', 'categoryOrder'] as const) {
        if (source.advanced?.[key])
          Object.assign(advanced, {
            [key]: structuredClone(source.advanced[key]),
          });
        else delete advanced[key];
      }
      if (Object.keys(advanced).length) axis.advanced = advanced;
      else delete axis.advanced;
      axis.reverse = source.reverse;
      if (source.rescale) axis.rescale = structuredClone(source.rescale);
      else delete axis.rescale;
    }
  }
}
