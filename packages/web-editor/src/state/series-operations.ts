import {
  plotBindingEntries,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { createEmptySeries } from './empty-series.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { detachedCurve, removeCurveRelations } from './f4-curve-relations.js';

type Panel = FigureTemplate['panels'][number];
type Plot = Panel['plotSlots'][number];
type DataSlot = FigureTemplate['dataSlots'][number];
type Overrides = Record<string, string>;
export type SeriesMoveDirection = 'up' | 'down';
export type SeriesMutation = {
  template: FigureTemplate;
  overrides: Overrides;
  selectedPlotSlotId: string;
};
export type SeriesOperationResult =
  { ok: true; value: SeriesMutation } | { ok: false; message: string };

function failure(message: string): SeriesOperationResult {
  return { ok: false, message };
}

export function templateIdentifiers(template: FigureTemplate): Set<string> {
  const ids = new Set([template.templateId]);
  for (const panel of template.panels) {
    ids.add(panel.panelId);
    for (const axis of panel.axes) ids.add(axis.axisId);
    for (const plot of panel.plotSlots) ids.add(plot.plotSlotId);
  }
  for (const slot of template.dataSlots) ids.add(slot.dataSlotId);
  for (const annotation of template.annotations)
    ids.add(annotation.annotationId);
  for (const group of template.sharedAxisGroups ?? []) ids.add(group.groupId);
  return ids;
}

function nextSeriesNumber(template: FigureTemplate): number {
  const ids = templateIdentifiers(template);
  let number = 1;
  while (
    ids.has('series-' + number) ||
    [...ids].some((id) => id.startsWith('series-' + number + '-'))
  )
    number += 1;
  return number;
}

function sourceSlot(
  template: FigureTemplate,
  slotId: string,
): DataSlot | undefined {
  return template.dataSlots.find((slot) => slot.dataSlotId === slotId);
}

function copyOverride(
  next: Overrides,
  overrides: Overrides,
  sourceId: string,
  targetId: string,
): void {
  const columnId = overrides[sourceId];
  if (columnId) next[targetId] = columnId;
}

function applyPaletteColor(
  template: FigureTemplate,
  plot: Plot,
  index: number,
): void {
  const color = template.theme.palette[index % template.theme.palette.length]!;
  if ('fillStyle' in plot) plot.fillStyle.color = color;
  if ('lineStyle' in plot && plot.lineStyle) plot.lineStyle.color = color;
  if (plot.kind === 'xy' && plot.markerStyle) {
    plot.markerStyle.fill = color;
    plot.markerStyle.stroke = color;
  }
  if (plot.kind === 'xy' && plot.errorBarStyle)
    plot.errorBarStyle.color = color;
}

function copiedSeries(
  template: FigureTemplate,
  overrides: Overrides,
  source: Plot,
  recolor: boolean,
  data?: DataBindingSet,
): SeriesMutation | undefined {
  const entries = plotBindingEntries(source);
  if (entries.some((entry) => !sourceSlot(template, entry.slotId)))
    return undefined;
  const plotSlotId = 'series-' + nextSeriesNumber(template);
  const next = structuredClone(template);
  const sourcePanel = template.panels.find((p) =>
    p.plotSlots.some((p) => p.plotSlotId === source.plotSlotId),
  )!;
  const plot = detachedCurve(sourcePanel, source.plotSlotId, data);
  plot.plotSlotId = plotSlotId;
  if (recolor || source.legendEntry.source !== 'manual')
    plot.legendEntry.text = 'Series ' + plotSlotId.split('-')[1];
  if (recolor) plot.legendEntry.source = 'auto';
  const nextOverrides = { ...overrides };
  const bindings: Record<string, string> = {};
  for (const { role, slotId } of entries) {
    const id = plotSlotId + '-' + role;
    bindings[role] = id;
    next.dataSlots.push({
      ...structuredClone(sourceSlot(template, slotId)!),
      dataSlotId: id,
    });
    copyOverride(nextOverrides, overrides, slotId, id);
  }
  plot.bindings = bindings as Plot['bindings'];
  const target = next.panels.find((p) =>
    p.plotSlots.some((item) => item.plotSlotId === source.plotSlotId),
  )!;
  if (recolor) applyPaletteColor(next, plot, target.plotSlots.length);
  target.plotSlots.push(plot);
  return {
    template: next,
    overrides: nextOverrides,
    selectedPlotSlotId: plotSlotId,
  };
}

function firstPanel(template: FigureTemplate, id?: string): Panel | undefined {
  return id
    ? template.panels.find(
        (p) =>
          p.panelId === id ||
          p.plotSlots.some((plot) => plot.plotSlotId === id),
      )
    : template.panels[0];
}

function findPlot(panel: Panel, plotSlotId: string): Plot | undefined {
  return panel.plotSlots.find((plot) => plot.plotSlotId === plotSlotId);
}

export function addSeries(
  template: FigureTemplate,
  overrides: Overrides,
  plotSlotId?: string,
  data?: DataBindingSet,
): SeriesOperationResult {
  const panel = firstPanel(template, plotSlotId);
  const source = panel?.plotSlots.at(-1);
  if (!source) {
    if (!panel) return failure('找不到图层');
    try {
      return {
        ok: true,
        value: createEmptySeries(template, {
          panelId: panel.panelId,
          number: nextSeriesNumber(template),
          overrides,
        }),
      };
    } catch (cause) {
      return failure(cause instanceof Error ? cause.message : '无法新增曲线');
    }
  }
  const value = copiedSeries(template, overrides, source, true, data);
  return value ? { ok: true, value } : failure('曲线的数据槽引用无效');
}

export function duplicateSeries(
  template: FigureTemplate,
  overrides: Overrides,
  plotSlotId: string,
  data?: DataBindingSet,
): SeriesOperationResult {
  const panel = firstPanel(template, plotSlotId);
  const source = panel && findPlot(panel, plotSlotId);
  if (!source) return failure(`未找到曲线 ${plotSlotId}`);
  const value = copiedSeries(template, overrides, source, false, data);
  return value ? { ok: true, value } : failure('曲线的数据槽引用无效');
}

function referencedSlotIds(plots: Plot[]): Set<string> {
  const result = new Set<string>();
  for (const plot of plots)
    for (const slotId of Object.values(plot.bindings))
      if (slotId) result.add(slotId);
  return result;
}

export function removeSeries(
  template: FigureTemplate,
  overrides: Overrides,
  plotSlotId: string,
  allowEmptyLayer = false,
): SeriesOperationResult {
  const panel = firstPanel(template, plotSlotId);
  if (!panel || (panel.plotSlots.length <= 1 && !allowEmptyLayer))
    return failure('图层至少需要保留一条曲线');
  const index = panel.plotSlots.findIndex(
    (plot) => plot.plotSlotId === plotSlotId,
  );
  if (index < 0) return failure('找不到要删除的曲线');
  const next = structuredClone(template);
  const nextPanel = next.panels.find((p) => p.panelId === panel.panelId)!;
  removeCurveRelations(nextPanel, plotSlotId);
  const [removed] = nextPanel.plotSlots.splice(index, 1);
  for (const annotation of next.annotations) {
    if (annotation.kind === 'legend' && annotation.layout?.plotSlotIds)
      annotation.layout.plotSlotIds = annotation.layout.plotSlotIds.filter(
        (id) => id !== plotSlotId,
      );
  }
  const referenced = referencedSlotIds(next.panels.flatMap((p) => p.plotSlots));
  const removable = new Set(
    Object.values(removed!.bindings).filter(
      (slotId): slotId is string => Boolean(slotId) && !referenced.has(slotId),
    ),
  );
  next.dataSlots = next.dataSlots.filter(
    (slot) => !removable.has(slot.dataSlotId),
  );
  const nextOverrides = { ...overrides };
  for (const slotId of removable) delete nextOverrides[slotId];
  const selected =
    nextPanel.plotSlots[Math.min(index, nextPanel.plotSlots.length - 1)]!;
  return {
    ok: true,
    value: {
      template: next,
      overrides: nextOverrides,
      selectedPlotSlotId: selected?.plotSlotId ?? '',
    },
  };
}

export function moveSeries(
  template: FigureTemplate,
  overrides: Overrides,
  plotSlotId: string,
  direction: SeriesMoveDirection,
): SeriesOperationResult {
  const panel = firstPanel(template, plotSlotId);
  const index =
    panel?.plotSlots.findIndex((plot) => plot.plotSlotId === plotSlotId) ?? -1;
  if (!panel || index < 0) return failure('找不到要移动的曲线');
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0) return failure('曲线已经位于最前面');
  if (target >= panel.plotSlots.length) return failure('曲线已经位于最后面');
  const next = structuredClone(template);
  const plots = next.panels.find((p) => p.panelId === panel.panelId)!.plotSlots;
  [plots[index], plots[target]] = [plots[target]!, plots[index]!];
  return {
    ok: true,
    value: {
      template: next,
      overrides: { ...overrides },
      selectedPlotSlotId: plotSlotId,
    },
  };
}
