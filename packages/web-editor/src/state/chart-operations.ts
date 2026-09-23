import {
  categoricalDimension,
  plotRoles,
  plotBindingEntries,
  validateFigureTemplate,
  type PlotSlot,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import {
  chartDefaults,
  chartChoice,
  type ChartChoice,
} from './chart-defaults.js';
import { templateIdentifiers } from './series-operations.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  normalizeCategoryAxis,
  resetCategoryCrossings,
} from './axis-category-settings.js';

const alternatives: Record<string, string[]> = {
  values: ['y', 'value'],
  value: ['y', 'values'],
  category: ['x'],
  x: ['category'],
  y: ['value', 'values'],
};
function allocateBindings(
  model: WorkspaceEditor,
  source: PlotSlot,
  target: PlotSlot,
) {
  const bindings: Record<string, string> = {};
  const sourceEntries = plotBindingEntries(source);
  const ids = templateIdentifiers(model.template);
  for (const spec of plotRoles(target.kind)) {
    const matched = sourceEntries.find((e) => e.role === spec.role);
    if (matched) {
      bindings[spec.role] = matched.slotId;
      continue;
    }
    const base = target.plotSlotId + '-' + spec.role;
    let id = base,
      suffix = 1;
    while (ids.has(id)) id = base + '-' + suffix++;
    ids.add(id);
    bindings[spec.role] = id;
    model.template.dataSlots.push({
      dataSlotId: id,
      name: spec.label,
      role: spec.role,
      valueType: ['category', 'group', 'split'].includes(spec.role)
        ? 'category'
        : 'number',
      required: spec.required,
    });
    const alternative = sourceEntries.find((e) =>
      alternatives[spec.role]?.includes(e.role),
    );
    const ref = alternative && model.workspace.slotBindings[alternative.slotId];
    if (ref) model.workspace.slotBindings[id] = { ...ref };
  }
  target.bindings = bindings as PlotSlot['bindings'];
}
export function alignChartAxes(
  template: FigureTemplate,
  plot: PlotSlot,
  allPlots = false,
) {
  const panel = template.panels.find((p) =>
    p.plotSlots.some((item) => item.plotSlotId === plot.plotSlotId),
  )!;
  const category = categoricalDimension(plot);
  if (panel.plotSlots.length === 1 || allPlots)
    for (const axis of panel.axes) {
      const scale = axis.dimension === category ? 'category' : 'linear';
      if (axis.scale !== scale) {
        axis.scale = scale;
        delete axis.symLog;
        delete axis.logTicks;
        delete axis.scaleOptions;
        if (axis.advanced) {
          delete axis.advanced.breaks;
          delete axis.advanced.link;
          delete axis.advanced.categoryOrder;
        }
        axis.range = { mode: 'auto' };
        delete axis.rescale;
      }
      normalizeCategoryAxis(axis);
    }
  if (panel.plotSlots.length === 1 || allPlots) resetCategoryCrossings(panel);
}
function clearOrphans(model: WorkspaceEditor, old: PlotSlot) {
  const used = new Set(
    model.template.panels.flatMap((p) =>
      p.plotSlots.flatMap((p) => plotBindingEntries(p).map((e) => e.slotId)),
    ),
  );
  const removed = new Set(
    plotBindingEntries(old)
      .map((e) => e.slotId)
      .filter((id) => !used.has(id)),
  );
  model.template.dataSlots = model.template.dataSlots.filter(
    (s) => !removed.has(s.dataSlotId),
  );
  for (const id of removed) delete model.workspace.slotBindings[id];
}
function switchBarLayout(
  panel: FigureTemplate['panels'][number],
  source: PlotSlot,
  choice: 'bar' | 'stacked-bar',
) {
  for (const plot of panel.plotSlots)
    if (
      plot.kind === 'bar' &&
      plot.xAxisId === source.xAxisId &&
      plot.yAxisId === source.yAxisId
    ) {
      plot.layout = choice === 'bar' ? 'grouped' : 'stacked';
      if (choice === 'stacked-bar')
        plot.stackGroup = plot.stackGroup ?? 'stack-1';
      else delete plot.stackGroup;
    }
}
function convertChartType(
  next: WorkspaceEditor,
  id: string,
  choice: ChartChoice,
) {
  const panel = next.template.panels.find((p) =>
    p.plotSlots.some((p) => p.plotSlotId === id),
  );
  const index = panel?.plotSlots.findIndex((p) => p.plotSlotId === id) ?? -1;
  if (!panel || index < 0) throw new Error('找不到图表');
  const source = panel.plotSlots[index]!;
  if (chartChoice(source) === choice) return;
  if (source.kind === 'bar' && (choice === 'bar' || choice === 'stacked-bar')) {
    switchBarLayout(panel, source, choice);
  } else {
    const target = chartDefaults(choice, source);
    allocateBindings(next, source, target);
    panel.plotSlots[index] = target;
    alignChartAxes(next.template, target);
    clearOrphans(next, source);
  }
}
function validateChartChange(next: WorkspaceEditor): WorkspaceEditor {
  const result = validateFigureTemplate(next.template);
  if (!result.ok)
    throw new Error(
      '当前类型与共享坐标轴不兼容；请在单系列图层切换类型，或选择兼容图表',
    );
  return next;
}

export function changeChartType(
  model: WorkspaceEditor,
  id: string,
  choice: ChartChoice,
): WorkspaceEditor {
  const next = structuredClone(model);
  convertChartType(next, id, choice);
  return validateChartChange(next);
}

// 所有组一起转换，完成坐标轴调整后再验证，避免中间混合图型状态被拒绝。
export function changeAllChartTypes(
  model: WorkspaceEditor,
  choice: ChartChoice,
  panelId?: string,
): WorkspaceEditor {
  const next = structuredClone(model);
  for (const panel of next.template.panels) {
    if (panelId && panel.panelId !== panelId) continue;
    const changed = panel.plotSlots.some(
      (plot) => chartChoice(plot) !== choice,
    );
    for (const plot of [...panel.plotSlots])
      convertChartType(next, plot.plotSlotId, choice);
    if (changed && panel.plotSlots[0])
      alignChartAxes(next.template, panel.plotSlots[0], true);
  }
  return validateChartChange(next);
}
