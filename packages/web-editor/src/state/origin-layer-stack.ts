import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  createLayerStack,
  type LayerStack,
  type Panel,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import {
  materializeCurveOffsets,
  materializeLayerStackOffsets,
} from '@plot-fig/svg-renderer';
import { layerOffsetSettings } from './layer-stack.js';

export const layerStackCurves = (panel: Panel) =>
  panel.plotSlots.filter(
    (plot): plot is Extract<PlotSlot, { kind: 'xy' | 'area' | 'bar' }> =>
      plot.kind === 'xy' || plot.kind === 'area' || plot.kind === 'bar',
  );

export function readLayerStack(
  panel: Panel,
  data?: DataBindingSet,
  materializeLegacy = true,
): LayerStack {
  if (panel.layerStack) return structuredClone(panel.layerStack);
  const plots = layerStackCurves(panel);
  const buckets = new Map<string, string[]>();
  for (const plot of plots) {
    const key = `${plot.xAxisId}/${plot.yAxisId}/${plot.kind === 'bar' ? plot.orientation : 'curve'}`;
    const members = buckets.get(key) ?? [];
    members.push(plot.plotSlotId);
    buckets.set(key, members);
  }
  const members =
    panel.stack?.members ??
    [...buckets.values()].sort((a, b) => b.length - a.length)[0] ??
    [];
  const stack = createLayerStack([...members]);
  const selectedPlots = plots.filter((plot) =>
    members.includes(plot.plotSlotId),
  );
  const legacyBarsStacked =
    selectedPlots.length > 0 &&
    selectedPlots.every(
      (plot) => plot.kind === 'bar' && plot.layout === 'stacked',
    );
  const legacy = layerOffsetSettings({
    ...panel,
    plotSlots: selectedPlots,
  });
  stack.mode = panel.stack || legacyBarsStacked ? 'cumulative' : legacy.mode;
  stack.constant.values = [legacy.value];
  stack.auto.gap = legacy.gap / 100;
  stack.individual.x = legacy.x;
  stack.individual.y = legacy.y;
  const first = plots.find((plot) => members.includes(plot.plotSlotId));
  if (first?.kind === 'bar') {
    stack.individual.x = first.orientation === 'horizontal';
    stack.individual.y = first.orientation === 'vertical';
  }
  if (legacy.mode === 'individual' && materializeLegacy) {
    stack.individual.values = members.map((plotSlotId) => {
      const transform = materializeCurveOffsets(panel, plotSlotId, data);
      return {
        plotSlotId,
        xOffset:
          transform?.offsetX?.mode === 'constant' ? transform.offsetX.value : 0,
        yOffset:
          transform?.offsetY?.mode === 'constant' ? transform.offsetY.value : 0,
        xMultiplier: 1,
        yMultiplier: 1,
      };
    });
  }
  stack.normalizePercent =
    panel.stack?.mode === 'percent' ||
    (legacyBarsStacked &&
      selectedPlots.every(
        (plot) => plot.kind === 'bar' && plot.options?.percentage,
      ));
  if (panel.stack?.labels)
    stack.totalLabels = structuredClone(panel.stack.labels);
  const occupied = new Set<string>();
  for (const group of legacyBarsStacked ? [] : (panel.groups ?? [])) {
    const ids = group.members.filter((id) => members.includes(id));
    if (ids.length) {
      stack.subgroups.push({ groupId: group.groupId, members: ids });
      ids.forEach((id) => occupied.add(id));
    }
  }
  const barGroups = new Map<string, string[]>();
  for (const plot of plots) {
    if (
      plot.kind !== 'bar' ||
      !members.includes(plot.plotSlotId) ||
      occupied.has(plot.plotSlotId)
    )
      continue;
    const key = plot.stackGroup ?? 'default';
    const ids = barGroups.get(key) ?? [];
    ids.push(plot.plotSlotId);
    barGroups.set(key, ids);
  }
  for (const ids of barGroups.values()) {
    let index = 1;
    while (
      stack.subgroups.some(
        (group) => group.groupId === `stack-subgroup-${index}`,
      )
    )
      index++;
    stack.subgroups.push({ groupId: `stack-subgroup-${index}`, members: ids });
  }
  stack.withinSubgroup = legacyBarsStacked && barGroups.size > 1;
  return stack;
}

/** 只有用户修改堆叠页才写入新协议；清除受控成员的旧偏移，保留填充与非成员。 */
export function applyLayerStack(panel: Panel, stack: LayerStack): Panel {
  const next = structuredClone(panel);
  next.layerStack = structuredClone(stack);
  const controlled = new Set([
    ...(panel.layerStack?.members ?? []),
    ...stack.members,
  ]);
  for (const plot of next.plotSlots) {
    if (
      !controlled.has(plot.plotSlotId) ||
      (plot.kind !== 'xy' && plot.kind !== 'area')
    )
      continue;
    if (!plot.transform) continue;
    delete plot.transform.offsetX;
    delete plot.transform.offsetY;
    if (!Object.keys(plot.transform).length) delete plot.transform;
  }
  if (next.stack) {
    next.stack.members = next.stack.members.filter((id) => !controlled.has(id));
    if (next.stack.members.length < 2) delete next.stack;
  }
  return next;
}

export function changeLayerStackMode(
  panel: Panel,
  mode: LayerStack['mode'],
  data?: DataBindingSet,
): Panel {
  const stack = readLayerStack(panel, data, mode === 'individual');
  if (mode === 'individual' && stack.mode !== 'individual') {
    stack.individual.values = panel.layerStack
      ? materializeLayerStackOffsets(panel, data)
      : stack.members.map((plotSlotId) => {
          const transform = materializeCurveOffsets(panel, plotSlotId, data);
          return {
            plotSlotId,
            xOffset:
              transform?.offsetX?.mode === 'constant'
                ? transform.offsetX.value
                : 0,
            yOffset:
              transform?.offsetY?.mode === 'constant'
                ? transform.offsetY.value
                : 0,
            xMultiplier: 1,
            yMultiplier: 1,
          };
        });
    if (panel.layerStack && stack.mode !== 'none') {
      const first = panel.plotSlots.find((plot) =>
        stack.members.includes(plot.plotSlotId),
      );
      stack.individual.x =
        first?.kind === 'bar' && first.orientation === 'horizontal';
      stack.individual.y = !stack.individual.x;
    }
  }
  stack.mode = mode;
  // 未完成输入切换模式后不遗留 NaN；有效的非当前模式设置仍保留。
  if (
    !stack.constant.values.length ||
    stack.constant.values.some((value) => !Number.isFinite(value))
  )
    stack.constant.values = [1];
  if (!Number.isFinite(stack.auto.gap) || stack.auto.gap < 0)
    stack.auto.gap = 0.08;
  for (const value of stack.individual.values) {
    for (const key of [
      'xOffset',
      'yOffset',
      'xMultiplier',
      'yMultiplier',
    ] as const)
      if (!Number.isFinite(value[key]))
        value[key] = key.endsWith('Multiplier') ? 1 : 0;
  }
  return applyLayerStack(panel, stack);
}

export function remapLayerStack(
  stack: LayerStack,
  names: ReadonlyMap<string, string | undefined>,
): LayerStack {
  const mapped = (id: string) => {
    const next = names.get(id);
    if (!next) throw new Error('目标图层曲线数量不足，无法对应堆叠成员');
    return next;
  };
  return {
    ...structuredClone(stack),
    members: stack.members.map(mapped),
    subgroups: stack.subgroups.map((group) => ({
      ...group,
      members: group.members.map(mapped),
    })),
    individual: {
      ...stack.individual,
      values: stack.individual.values.map((value) => ({
        ...value,
        plotSlotId: mapped(value.plotSlotId),
      })),
    },
  };
}

/** 类型转换完成后清理不再支持的配置；XY 与面积之间保留相同成员的设置。 */
export function reconcileLayerStackAfterChartChange(panel: Panel): void {
  const byId = new Map(panel.plotSlots.map((plot) => [plot.plotSlotId, plot]));
  if (
    panel.stack?.members.some((id) => {
      const plot = byId.get(id);
      return !plot || (plot.kind !== 'xy' && plot.kind !== 'area');
    })
  )
    delete panel.stack;
  const stack = panel.layerStack;
  if (!stack) return;
  const members = stack.members.map((id) => byId.get(id));
  const first = members[0];
  if (
    members.some(
      (plot) =>
        !plot ||
        !['xy', 'area', 'bar'].includes(plot.kind) ||
        (first &&
          ((first.kind === 'bar') !== (plot.kind === 'bar') ||
            first.xAxisId !== plot.xAxisId ||
            first.yAxisId !== plot.yAxisId ||
            (first.kind === 'bar' &&
              plot.kind === 'bar' &&
              first.orientation !== plot.orientation))),
    )
  ) {
    delete panel.layerStack;
    return;
  }
  if (stack.mode === 'incremental' && first?.kind !== 'bar')
    stack.mode = 'none';
}
