import {
  categoricalDimension,
  type Axis,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';
import { assertTemplate, panelForPlot } from './publication-utils.js';
import { validatePlotTargetDomain } from './plot-target-domain.js';
import { bindWorkspace } from '@plot-fig/data-binding';
import {
  detachedCurve,
  clearCurveTargets,
  removeCurveRelations,
} from './f4-curve-relations.js';

export function compatiblePlotAxes(
  plot: PlotSlot,
  axes: Axis[],
  dimension: 'x' | 'y',
) {
  const category = categoricalDimension(plot);
  return axes.filter(
    (axis) =>
      axis.dimension === dimension &&
      (axis.scale === 'category') === (category === dimension) &&
      (plot.kind !== 'xy' ||
        plot.lineConnection !== 'spline' ||
        axis.scale === 'linear') &&
      (plot.kind === 'xy' ||
        plot.kind === 'box' ||
        category === dimension ||
        axis.scale === 'linear'),
  );
}
export function movePlotToPanel(
  model: WorkspaceEditor,
  plotSlotId: string,
  target: { panelId: string; xAxisId: string; yAxisId: string },
): WorkspaceEditor {
  const next = structuredClone(model);
  const source = panelForPlot(next.template, plotSlotId);
  const panel = next.template.panels.find((p) => p.panelId === target.panelId);
  if (!panel || panel === source) throw new Error('请选择其他目标图层');
  const index = source.plotSlots.findIndex((p) => p.plotSlotId === plotSlotId);
  const plot = detachedCurve(
    source,
    plotSlotId,
    bindWorkspace(model.template, model.workspace),
  );
  for (const dimension of ['x', 'y'] as const) {
    const id = dimension === 'x' ? target.xAxisId : target.yAxisId;
    const axis = compatiblePlotAxes(plot, panel.axes, dimension).find(
      (axis) => axis.axisId === id,
    );
    if (!axis)
      throw new Error(
        `目标 ${dimension.toUpperCase()} 轴与曲线类型不兼容，请选择合适的坐标轴`,
      );
    delete axis.compatibility;
  }
  validatePlotTargetDomain(next, plot, {
    x: panel.axes.find((axis) => axis.axisId === target.xAxisId)!,
    y: panel.axes.find((axis) => axis.axisId === target.yAxisId)!,
  });
  removeCurveRelations(source, plotSlotId);
  source.plotSlots.splice(index, 1);
  clearCurveTargets(plot);
  plot.xAxisId = target.xAxisId;
  plot.yAxisId = target.yAxisId;
  panel.plotSlots.push(plot);
  for (const annotation of next.template.annotations)
    if (
      annotation.kind === 'legend' &&
      annotation.coordinateSpace !== 'page' &&
      annotation.panelId === source.panelId &&
      annotation.layout?.plotSlotIds
    )
      annotation.layout.plotSlotIds = annotation.layout.plotSlotIds.filter(
        (id) => id !== plotSlotId,
      );
  next.activePanelId = panel.panelId;
  assertTemplate(next.template);
  return next;
}
