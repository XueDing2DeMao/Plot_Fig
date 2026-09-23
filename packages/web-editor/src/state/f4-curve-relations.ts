import type { DataBindingSet } from '@plot-fig/data-binding';
import type { Panel, PlotSlot } from '@plot-fig/figure-schema';
import {
  materializeCurveOffsets,
  resolveCurveGroups,
} from '@plot-fig/svg-renderer';

/** 复制或移出组时，保留曲线当前外观和已求值的偏移。 */
export function detachedCurve(
  panel: Panel,
  plotId: string,
  data?: DataBindingSet,
): PlotSlot {
  const plot = structuredClone(
    resolveCurveGroups(panel).plotSlots.find((p) => p.plotSlotId === plotId)!,
  );
  if (plot.kind === 'xy' || plot.kind === 'area') {
    const transform = materializeCurveOffsets(panel, plotId, data);
    if (transform) plot.transform = transform;
    else delete plot.transform;
    if (
      plot.transform?.fill?.target === 'next' &&
      !plot.transform.fill.targetPlotId
    ) {
      const target = nextCurve(panel, plot);
      if (target) plot.transform.fill.targetPlotId = target.plotSlotId;
    }
  }
  if (plot.kind === 'xy')
    for (const rule of Object.values(plot.dropLines ?? {}))
      if (rule?.target.mode === 'next-curve' && !rule.target.plotSlotId) {
        const target = nextCurve(panel, plot);
        if (target) rule.target.plotSlotId = target.plotSlotId;
      }
  return plot;
}

function nextCurve(panel: Panel, plot: PlotSlot) {
  return panel.plotSlots
    .slice(
      panel.plotSlots.findIndex((p) => p.plotSlotId === plot.plotSlotId) + 1,
    )
    .find(
      (p) =>
        p.visible !== false &&
        (p.kind === 'xy' || p.kind === 'area') &&
        p.xAxisId === plot.xAxisId &&
        p.yAxisId === plot.yAxisId,
    );
}

export function clearCurveTargets(plot: PlotSlot, removedId?: string): void {
  if (
    (plot.kind === 'xy' || plot.kind === 'area') &&
    plot.transform?.fill?.target === 'next' &&
    (!removedId || plot.transform.fill.targetPlotId === removedId)
  ) {
    delete plot.transform.fill;
    if (!Object.keys(plot.transform).length) delete plot.transform;
  }
  if (plot.kind === 'xy' && plot.dropLines) {
    for (const dimension of ['horizontal', 'vertical'] as const) {
      const target = plot.dropLines[dimension]?.target;
      if (
        target?.mode === 'next-curve' &&
        (!removedId || target.plotSlotId === removedId)
      )
        delete plot.dropLines[dimension];
    }
    if (!Object.keys(plot.dropLines).length) delete plot.dropLines;
  }
}

/** 在删除前解析隐式“下一条”，防止删除后无意改指向其他曲线。 */
export function removeCurveRelations(panel: Panel, removedId: string): void {
  for (const plot of panel.plotSlots) {
    const next = nextCurve(panel, plot);
    if (
      (plot.kind === 'xy' || plot.kind === 'area') &&
      plot.transform?.fill?.target === 'next' &&
      !plot.transform.fill.targetPlotId &&
      next?.plotSlotId === removedId
    ) {
      delete plot.transform.fill;
      if (!Object.keys(plot.transform).length) delete plot.transform;
    }
    if (plot.kind === 'xy' && plot.dropLines)
      for (const direction of ['horizontal', 'vertical'] as const) {
        const target = plot.dropLines[direction]?.target;
        if (
          target?.mode === 'next-curve' &&
          !target.plotSlotId &&
          next?.plotSlotId === removedId
        )
          delete plot.dropLines[direction];
      }
    clearCurveTargets(plot, removedId);
  }
  if (panel.groups) {
    const previous = new Map(panel.groups.map((g) => [g.groupId, g]));
    panel.groups = panel.groups
      .map((g) => ({
        ...g,
        members: g.members.filter((id) => id !== removedId),
      }))
      .filter((g) => g.members.length);
    const remaining = new Set(panel.groups.map((g) => g.groupId));
    for (const group of panel.groups) {
      let parent = group.parentId;
      while (parent && !remaining.has(parent))
        parent = previous.get(parent)?.parentId;
      if (parent) group.parentId = parent;
      else delete group.parentId;
    }
    if (!panel.groups.length) delete panel.groups;
  }
  if (panel.stack) {
    panel.stack.members = panel.stack.members.filter((id) => id !== removedId);
    if (panel.stack.members.length < 2) delete panel.stack;
  }
}

export function remapCurveRelations(
  panel: Panel,
  names: Map<string, string>,
): void {
  for (const group of panel.groups ?? [])
    group.members = group.members.map((id) => names.get(id)!);
  if (panel.stack)
    panel.stack.members = panel.stack.members.map((id) => names.get(id)!);
  for (const plot of panel.plotSlots) {
    if (
      (plot.kind === 'xy' || plot.kind === 'area') &&
      plot.transform?.fill?.targetPlotId
    )
      plot.transform.fill.targetPlotId = names.get(
        plot.transform.fill.targetPlotId,
      )!;
    if (plot.kind === 'xy')
      for (const rule of Object.values(plot.dropLines ?? {})) {
        if (rule?.target.mode === 'next-curve' && rule.target.plotSlotId)
          rule.target.plotSlotId = names.get(rule.target.plotSlotId)!;
      }
  }
}
