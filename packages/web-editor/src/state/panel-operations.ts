import {
  defaultTextStyle,
  resolvePanelFrames,
  plotBindingEntries,
  type FigureTemplate,
  type Panel,
  type Annotation,
} from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  newIdentifier,
  assertTemplate,
  pruneSlots,
} from './publication-utils.js';
import { assertIndependentLayout } from './panel-frame-links.js';
import { defaultTemplate } from './default-template.js';
import { remapCurveRelations } from './f4-curve-relations.js';
import { axisDataSlotIds, remapAxisData } from './axis-data-refs.js';
import { synchronizeSharedAxis } from './publication-utils.js';

export function addPanel(
  model: WorkspaceEditor,
  sourceId: string,
): WorkspaceEditor {
  if (model.template.panels.length >= 16) throw new Error('最多支持 16 个图层');
  const source = model.template.panels.find(
    (panel) => panel.panelId === sourceId,
  );
  if (!source) throw new Error('找不到图层');
  const next = structuredClone(model),
    panel = defaultTemplate().panels[0]!;
  panel.panelId = newIdentifier(next.template, 'panel');
  panel.frame = { ...source.frame };
  panel.plotSlots = [];
  for (const axis of panel.axes)
    axis.axisId = newIdentifier(
      next.template,
      panel.panelId + '-' + axis.axisId,
    );
  next.template.panels.push(panel);
  next.activePanelId = panel.panelId;
  assertTemplate(next.template);
  return next;
}

function copyContent(
  model: WorkspaceEditor,
  source: Panel,
  target: Panel,
  origin = model,
) {
  const names = new Map<string, string>();
  const allocate = (old: string) => {
    if (!names.has(old))
      names.set(
        old,
        newIdentifier(model.template, target.panelId + '-' + names.size),
      );
    return names.get(old)!;
  };
  for (const axis of target.axes) axis.axisId = allocate(axis.axisId);
  for (const axis of target.axes)
    if (axis.placement?.mode === 'cross')
      axis.placement.axisId = allocate(axis.placement.axisId);
  if (target.axisLengthRatio) {
    target.axisLengthRatio.xAxisId = allocate(target.axisLengthRatio.xAxisId);
    target.axisLengthRatio.yAxisId = allocate(target.axisLengthRatio.yAxisId);
  }
  if (target.yAxisAlignment) {
    target.yAxisAlignment.leftAxisId = allocate(
      target.yAxisAlignment.leftAxisId,
    );
    target.yAxisAlignment.rightAxisId = allocate(
      target.yAxisAlignment.rightAxisId,
    );
  }
  const slots = new Set(
    source.plotSlots.flatMap((p) => plotBindingEntries(p).map((e) => e.slotId)),
  );
  for (const axis of source.axes)
    for (const id of axisDataSlotIds(axis.advanced)) slots.add(id);
  for (const id of slots) {
    const slot = origin.template.dataSlots.find((s) => s.dataSlotId === id)!;
    const newId = allocate(id);
    model.template.dataSlots.push({
      ...structuredClone(slot),
      dataSlotId: newId,
    });
    if (origin.workspace.slotBindings[id])
      model.workspace.slotBindings[newId] = {
        ...origin.workspace.slotBindings[id],
      };
  }
  for (const plot of target.plotSlots) {
    plot.plotSlotId = allocate(plot.plotSlotId);
    plot.xAxisId = allocate(plot.xAxisId);
    plot.yAxisId = allocate(plot.yAxisId);
    plot.bindings = Object.fromEntries(
      plotBindingEntries(plot).map((e) => [e.role, allocate(e.slotId)]),
    ) as typeof plot.bindings;
  }
  remapCurveRelations(target, names);
  for (const axis of target.axes) {
    remapAxisData(axis.advanced, names);
    if (axis.advanced?.link?.panelId === source.panelId) {
      axis.advanced.link.panelId = target.panelId;
      axis.advanced.link.axisId = names.get(axis.advanced.link.axisId)!;
    }
  }
  return names;
}
function copyAnnotations(
  model: WorkspaceEditor,
  source: Panel,
  { target, names }: { target: Panel; names: Map<string, string> },
  origin = model,
) {
  const annotations = origin.template.annotations.filter(
    (a) => a.coordinateSpace !== 'page' && a.panelId === source.panelId,
  );
  for (const original of annotations) {
    const a = structuredClone(original);
    a.annotationId =
      a.kind === 'text' &&
      a.coordinateSpace === 'panel' &&
      original.annotationId === 'panel-label-' + source.panelId
        ? 'panel-label-' + target.panelId
        : newIdentifier(model.template, 'annotation-copy');
    if (a.coordinateSpace === 'page') continue;
    a.panelId = target.panelId;
    if (a.coordinateSpace === 'data') {
      a.xAxisId = names.get(a.xAxisId)!;
      a.yAxisId = names.get(a.yAxisId)!;
    }
    if (a.kind === 'legend' && a.layout?.plotSlotIds)
      a.layout.plotSlotIds = a.layout.plotSlotIds
        .map((id) => names.get(id)!)
        .filter(Boolean);
    model.template.annotations.push(a);
  }
}
export function duplicatePanel(
  model: WorkspaceEditor,
  id: string,
): WorkspaceEditor {
  return appendPanelFrom(model, model, id);
}
export function appendPanelFrom(
  model: WorkspaceEditor,
  origin: WorkspaceEditor,
  id: string,
): WorkspaceEditor {
  const next = structuredClone(model),
    source = origin.template.panels.find((p) => p.panelId === id);
  if (!source) throw new Error('找不到图层');
  if (next.template.panels.length >= 16) throw new Error('最多支持 16 个图层');
  const target = structuredClone(source);
  target.panelId = newIdentifier(next.template, 'panel');
  const names = copyContent(next, source, target, origin);
  copyAnnotations(next, source, { target, names }, origin);
  next.template.panels.push(target);
  next.activePanelId = target.panelId;
  assertTemplate(next.template);
  return next;
}
export function removePanel(
  model: WorkspaceEditor,
  id: string,
): WorkspaceEditor {
  if (model.template.panels.length <= 1) throw new Error('至少保留一个图层');
  const next = structuredClone(model),
    panel = next.template.panels.find((p) => p.panelId === id);
  if (!panel) throw new Error('找不到图层');
  if (
    next.template.panels.some(
      (p) =>
        p.panelId !== id &&
        p.axes.some((a) => a.advanced?.link?.panelId === id),
    )
  )
    throw new Error('此图层仍被公式轴链接，请先解除目标轴链接');
  next.template = resolvePanelFrames(next.template);
  for (const child of next.template.panels)
    if (child.frameLink?.parentPanelId === id) delete child.frameLink;
  next.template.panels = next.template.panels.filter((p) => p.panelId !== id);
  next.template.annotations = next.template.annotations.filter(
    (a) => a.coordinateSpace === 'page' || a.panelId !== id,
  );
  if (next.template.sharedAxisGroups)
    next.template.sharedAxisGroups = next.template.sharedAxisGroups
      .map((g) => ({
        ...g,
        members: g.members.filter((m) => m.panelId !== id),
      }))
      .filter((g) => g.members.length > 1);
  pruneSlots(
    next,
    new Set(
      panel.plotSlots.flatMap((p) =>
        plotBindingEntries(p).map((e) => e.slotId),
      ),
    ),
  );
  const activeId = model.activePanelId ?? model.template.panels[0]!.panelId;
  const removedIndex = model.template.panels.findIndex((p) => p.panelId === id);
  next.activePanelId = next.template.panels.some((p) => p.panelId === activeId)
    ? activeId
    : next.template.panels[
        Math.min(removedIndex, next.template.panels.length - 1)
      ]!.panelId;
  assertTemplate(next.template);
  return next;
}
export function movePanel(
  model: WorkspaceEditor,
  id: string,
  offset: number,
): WorkspaceEditor {
  const next = structuredClone(model),
    items = next.template.panels,
    index = items.findIndex((p) => p.panelId === id),
    target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return model;
  [items[index], items[target]] = [items[target]!, items[index]!];
  return next;
}
export function layoutPanels(
  template: FigureTemplate,
  options: { columns: number; gap: number; margin: number; labels: boolean },
): FigureTemplate {
  assertIndependentLayout(
    template,
    template.panels.map((p) => p.panelId),
  );
  const { columns, gap, margin } = options,
    rows = Math.ceil(template.panels.length / columns);
  if (
    !Number.isInteger(columns) ||
    columns < 1 ||
    columns > 4 ||
    ![gap, margin].every((n) => Number.isFinite(n) && n >= 0)
  )
    throw new Error('布局参数无效');
  const width = (1 - 2 * margin - (columns - 1) * gap) / columns,
    height = (1 - 2 * margin - (rows - 1) * gap) / rows;
  if (width <= 0 || height <= 0) throw new Error('边距或间距过大');
  const next = structuredClone(template);
  next.panels.forEach((p, i) => {
    p.frame = {
      x: margin + (i % columns) * (width + gap),
      y: margin + Math.floor(i / columns) * (height + gap),
      width,
      height,
    };
  });
  return options.labels ? labelPanels(next) : assertTemplate(next);
}
export function labelPanels(template: FigureTemplate): FigureTemplate {
  const next = structuredClone(template);
  next.panels.forEach((p, i) => {
    const label: Annotation = {
      annotationId: 'panel-label-' + p.panelId,
      kind: 'text',
      coordinateSpace: 'panel',
      panelId: p.panelId,
      position: { x: 0, y: 1.04 },
      text: String.fromCharCode(97 + i),
      format: 'plain',
      textStyle: { ...defaultTextStyle(), bold: true, fontSizePt: 8 },
    };
    const index = next.annotations.findIndex(
      (a) => a.annotationId === label.annotationId,
    );
    if (index < 0) next.annotations.push(label);
    else next.annotations[index] = label;
  });
  return assertTemplate(next);
}
export function shareAxes(
  template: FigureTemplate,
  options: {
    dimension: 'x' | 'y';
    panelIds: string[];
    enabled?: boolean;
    unify?: boolean;
  },
): FigureTemplate {
  const next = structuredClone(template),
    ids = new Set(options.panelIds);
  const members = next.panels
    .filter((p) => ids.has(p.panelId))
    .flatMap((p) => {
      const axis = p.axes.find((a) => a.dimension === options.dimension);
      if (axis) delete axis.compatibility;
      return axis ? [{ panelId: p.panelId, axisId: axis.axisId }] : [];
    });
  const axisIds = new Set(members.map((m) => m.axisId));
  next.sharedAxisGroups = (next.sharedAxisGroups ?? [])
    .map((g) => ({
      ...g,
      members: g.members.filter((m) => !axisIds.has(m.axisId)),
    }))
    .filter((g) => g.members.length > 1);
  if (options.enabled !== false) {
    if (members.length < 2) throw new Error('共享轴至少需要两个图层');
    if (options.unify) {
      const first = next.panels
        .find((p) => p.panelId === members[0]!.panelId)!
        .axes.find((a) => a.axisId === members[0]!.axisId)!;
      for (const p of next.panels)
        for (const a of p.axes)
          if (axisIds.has(a.axisId)) {
            a.scale = first.scale;
            a.range = structuredClone(first.range);
            a.reverse = first.reverse;
            if (first.rescale) a.rescale = structuredClone(first.rescale);
            else delete a.rescale;
          }
    }
    next.sharedAxisGroups.push({
      groupId: newIdentifier(next, 'shared-' + options.dimension),
      members,
    });
    if (options.unify) synchronizeSharedAxis(next, members[0]!);
  }
  return assertTemplate(next);
}
