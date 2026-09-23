import {
  plotBindingEntries,
  validateFigureTemplate,
  type Axis,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { preparePanel } from './panel.js';
import { axisRangePlots, prepareAxisScale } from './panel-scales.js';
import { axisScaleSpec, sameAxisScale } from '@plot-fig/figure-schema';
import { resolveNumericScaleRange } from './advanced-scale-range.js';
import { usesIntegerTicks } from './integer-axis.js';
import {
  validateFixedAxisTicks,
  axisTickDiagnostic,
} from './fixed-axis-ticks.js';
import type { PreparedPlot } from './charts/prepared.js';
import type { RenderDiagnostic } from './types.js';

type Input = {
  before: FigureTemplate;
  candidate: FigureTemplate;
  beforeData: DataBindingSet;
  data: DataBindingSet;
  reason: 'change' | 'initialize' | 'fit';
  axisIds?: readonly string[];
};
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);
function prepared(template: FigureTemplate, data: DataBindingSet) {
  return new Map(
    template.panels.map((panel) => [
      panel.panelId,
      preparePanel(panel, data, []),
    ]),
  );
}
function groupPlots(
  template: FigureTemplate,
  axis: Axis,
  panels: Map<string, PreparedPlot[]>,
) {
  const group = template.sharedAxisGroups?.find((g) =>
    g.members.some((m) => m.axisId === axis.axisId),
  );
  const field = axis.dimension === 'x' ? 'xAxisId' : 'yAxisId';
  if (group)
    return group.members.flatMap((ref) =>
      (panels.get(ref.panelId) ?? [])
        .filter((p) => p.plot[field] === ref.axisId)
        .map((p) => ({ ...p, plot: { ...p.plot, [field]: axis.axisId } })),
    );
  const panel = template.panels.find((p) =>
    p.axes.some((a) => a.axisId === axis.axisId),
  );
  const all = panels.get(panel?.panelId ?? '') ?? [];
  return axisRangePlots(axis, all);
}
function values(axis: Axis, plots: PreparedPlot[]) {
  return plots.flatMap((p) => (axis.dimension === 'x' ? p.xValues : p.yValues));
}
function domainSnapshot(
  axis: Axis,
  plots: PreparedPlot[],
  data: DataBindingSet,
) {
  return [...plots]
    .sort((a, b) => a.plot.plotSlotId.localeCompare(b.plot.plotSlotId))
    .map((p) => ({
      id: p.plot.plotSlotId,
      values: axis.dimension === 'x' ? p.xValues : p.yValues,
      bindings: plotBindingEntries(p.plot)
        .filter((ref) => {
          // 另一维的缺失/筛除通过 PreparedPlot 值域检测；等值换列不重算此维。
          if (p.plot.kind === 'histogram' || p.plot.kind === 'box')
            return ref.role === 'values';
          if (p.plot.kind === 'bar') return ref.role.startsWith('value');
          return (
            ref.role === axis.dimension ||
            ref.role.startsWith(axis.dimension + 'Error')
          );
        })
        .map((ref) => {
          const bound = data.bindings.find((b) => b.dataSlotId === ref.slotId);
          return [ref.role, ref.slotId, bound?.columnId, bound?.status];
        })
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    }));
}
function fit(axis: Axis, plots: PreparedPlot[]) {
  if (axis.scale === 'category') return undefined;
  const mode = axis.rescale?.mode;
  const range = resolveNumericScaleRange({
    spec: {
      ...axisScaleSpec(axis),
      ...(axis.scale === 'discrete'
        ? {
            values: [...new Set(plots[0]?.xValues ?? [])].sort((a, b) => a - b),
          }
        : {}),
    },
    values: values(axis, plots),
    nice: axis.rescale?.nice === true,
    ...(mode?.startsWith('fixed-min-') && 'min' in axis.range
      ? { min: axis.range.min }
      : {}),
    ...(mode?.startsWith('fixed-max-') && 'max' in axis.range
      ? { max: axis.range.max }
      : {}),
    ...(axis.rescale?.margin ? { padding: axis.rescale.margin } : {}),
  });
  if (range && usesIntegerTicks(axis)) {
    return {
      min: mode?.startsWith('fixed-min-') ? range.min : Math.floor(range.min),
      max: mode?.startsWith('fixed-max-') ? range.max : Math.ceil(range.max),
    };
  }
  return range;
}

/** 在明确的编辑事件中计算窗口。纯渲染、导出和坐标查询不写入模板。 */
export function rescaleFigureRanges(input: Input): {
  template: FigureTemplate;
  diagnostics: RenderDiagnostic[];
} {
  const template = structuredClone(input.candidate);
  const diagnostics: RenderDiagnostic[] = [];
  const visibility = (value: FigureTemplate) =>
    value.panels.map((p) => [
      p.panelId,
      p.visible !== false,
      p.plotSlots.map((plot) => [plot.plotSlotId, plot.visible !== false]),
    ]);
  const visibilityChanged = !same(
    visibility(input.before),
    visibility(template),
  );
  if (
    !visibilityChanged &&
    !template.panels.some((p) => p.axes.some((a) => a.rescale))
  )
    return { template, diagnostics };
  const beforePanels = prepared(input.before, input.beforeData);
  const nextPanels = prepared(template, input.data);
  const oldAxes = new Map(
    input.before.panels.flatMap((p) =>
      p.axes.map((a) => [a.axisId, a] as const),
    ),
  );
  // 最后一条曲线隐藏前捕获尚未持久化的自动窗口，恢复显示后仍遵循 Auto。
  if (visibilityChanged)
    for (const panel of template.panels)
      for (const axis of panel.axes) {
        const old = oldAxes.get(axis.axisId);
        if (
          !old ||
          axis.scale === 'category' ||
          axis.range.mode === 'fixed' ||
          !same(axis.range, old.range)
        )
          continue;
        const oldPlots = groupPlots(input.before, old, beforePanels);
        if (!oldPlots.length || groupPlots(template, axis, nextPanels).length)
          continue;
        const previous = prepareAxisScale(old, oldPlots);
        if (previous) {
          axis.range = { mode: 'fixed', min: previous.min, max: previous.max };
          axis.rescale ??= { mode: 'auto' };
        }
      }
  const visited = new Set<string>();
  for (const panel of template.panels)
    for (const axis of panel.axes) {
      if (
        !axis.rescale ||
        axis.advanced?.link ||
        axis.advanced?.breaks ||
        axis.scale === 'category' ||
        visited.has(axis.axisId)
      )
        continue;
      const group = template.sharedAxisGroups?.find((g) =>
        g.members.some((m) => m.axisId === axis.axisId),
      );
      const ids = group?.members.map((m) => m.axisId) ?? [axis.axisId];
      ids.forEach((id) => visited.add(id));
      if (input.axisIds && !ids.some((id) => input.axisIds!.includes(id)))
        continue;
      const old = oldAxes.get(axis.axisId);
      const plots = groupPlots(template, axis, nextPanels);
      const oldPlots = old ? groupPlots(input.before, old, beforePanels) : [];
      const mode = axis.rescale.mode;
      const oldMode =
        old?.rescale?.mode ?? (old?.range.mode === 'fixed' ? 'normal' : 'auto');
      const changedMode = mode !== oldMode;
      const changedRange = !same(old?.range, axis.range);
      const marginChanged = !same(old?.rescale?.margin, axis.rescale.margin);
      const automatic = mode === 'auto' || mode.endsWith('-auto');
      const changedData =
        !old ||
        !same(
          domainSnapshot(old, oldPlots, input.beforeData),
          domainSnapshot(axis, plots, input.data),
        ) ||
        !sameAxisScale(old, axis);
      try {
        // Normal 待解析文件及首次边距编辑：先恢复事件发生前的可见窗口。
        if (
          !changedRange &&
          axis.range.mode !== 'fixed' &&
          old &&
          ((!automatic && input.reason === 'change') ||
            (changedMode && mode.startsWith('fixed-')) ||
            (marginChanged && !changedMode))
        ) {
          const previous = prepareAxisScale(old, oldPlots);
          if (previous)
            axis.range = {
              mode: 'fixed',
              min: previous.min,
              max: previous.max,
            };
        }
        const shouldFit =
          mode !== 'fixed' &&
          (input.reason === 'fit' ||
            (changedMode && automatic) ||
            (automatic &&
              (input.reason === 'initialize' ||
                (!changedRange && changedData))));
        if (shouldFit) {
          const resolved = fit(axis, plots);
          if (resolved) axis.range = { mode: 'fixed', ...resolved };
          else
            diagnostics.push({
              ...axisTickDiagnostic(
                panel.panelId,
                axis.axisId,
                '没有可用于重缩放的数据，已保留当前范围',
              ),
              severity: 'warning',
            });
        }
        for (const memberPanel of template.panels)
          for (const member of memberPanel.axes)
            if (ids.includes(member.axisId))
              member.range = structuredClone(axis.range);
      } catch (cause) {
        diagnostics.push(
          axisTickDiagnostic(
            panel.panelId,
            axis.axisId,
            `范围无法重缩放：${cause instanceof Error ? cause.message : String(cause)}`,
          ),
        );
      }
    }
  const validation = validateFigureTemplate(template);
  const errors = validation.ok
    ? validateFixedAxisTicks(template)
    : validation.issues.map((issue) => ({
        code: 'RENDER_TEMPLATE_INVALID' as const,
        severity: 'error' as const,
        sourcePath: issue.path,
        message: issue.message,
      }));
  if (errors.length) {
    // 数据动作保留新数据和此前窗口；属性调用方依据诊断阻止无效草稿提交。
    diagnostics.push(...errors);
    return { template: structuredClone(input.candidate), diagnostics };
  }
  return { template, diagnostics };
}
