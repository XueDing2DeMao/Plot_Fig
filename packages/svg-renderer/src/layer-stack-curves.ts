import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  validateLayerStackRelations,
  type LayerStack,
  type Panel,
  type PanelStack,
} from '@plot-fig/figure-schema';
import type { PreparedPlot } from './charts/prepared.js';
import { preparePlot } from './charts/prepare.js';
import {
  mapPrepared,
  materializeCurveOffsets,
  prepareCurveTransforms,
} from './curve-transforms.js';
import {
  layerStackCoordinateMaps,
  layerStackUnits,
} from './layer-stack-coordinates.js';

export function prepareLayerStackTransforms(
  panel: Panel,
  input: PreparedPlot[],
  data: DataBindingSet,
) {
  const stack = panel.layerStack;
  if (!stack) return prepareCurveTransforms(panel, input, data);
  validateLayerStackRelations(panel);
  if (
    !panel.plotSlots.some(
      (p) =>
        stack.members.includes(p.plotSlotId) &&
        (p.kind === 'xy' || p.kind === 'area'),
    )
  )
    return prepareCurveTransforms(panel, input, data);
  const members = new Set(stack.members);
  const maps = layerStackCoordinateMaps(panel, input);
  const normalized = input.map((item) => {
    if (
      !members.has(item.plot.plotSlotId) ||
      (item.plot.kind !== 'xy' && item.plot.kind !== 'area')
    )
      return item;
    const plot = structuredClone(item.plot);
    if (plot.transform) {
      delete plot.transform.offsetX;
      delete plot.transform.offsetY;
      if (!Object.keys(plot.transform).length) delete plot.transform;
    }
    const mapping = maps.get(plot.plotSlotId);
    if (!mapping) return { ...item, plot };
    const { mapX, mapY } = mapping;
    if (
      stack.relativeAdditionalLine &&
      ['constant', 'auto', 'individual'].includes(stack.mode)
    ) {
      if (plot.transform?.fill?.target === 'baseline')
        plot.transform.fill.baseline = mapY(plot.transform.fill.baseline ?? 0);
      if (plot.kind === 'area') plot.baseline = mapY(plot.baseline);
      if (plot.kind === 'xy') {
        for (const direction of ['horizontal', 'vertical'] as const) {
          const target = plot.dropLines?.[direction]?.target;
          if (target?.mode === 'value')
            target.value = (direction === 'horizontal' ? mapX : mapY)(
              target.value,
            );
        }
      }
    }
    // 未参与绘图或计算的原始行保留原值，不能因其超出非线性定义域而拒绝有效选区。
    const activeRows = item.xyRows
      ? new Set<object>([
          ...item.xyRows.selectedRows,
          ...item.xyRows.calculationRows,
        ])
      : undefined;
    const next = mapPrepared({ ...item, plot }, (row) =>
      activeRows && !activeRows.has(row)
        ? row
        : { ...row, x: mapX(row.x), y: mapY(row.y) },
    );
    // 包含误差端点的范围也必须经过相同变换。
    next.xValues = item.xValues.map(mapX);
    next.yValues =
      plot.kind === 'area'
        ? [
            ...next.segments.flatMap((segment) => segment.map((p) => p.y)),
            plot.baseline,
          ]
        : item.yValues.map(mapY);
    return next;
  });
  const nextPanel = {
    ...panel,
    plotSlots: panel.plotSlots.map(
      (p) =>
        normalized.find((i) => i.plot.plotSlotId === p.plotSlotId)?.plot ?? p,
    ),
  };
  const stacks: PanelStack[] = [];
  if (panel.stack) {
    const remaining = panel.stack.members.filter((id) => !members.has(id));
    if (remaining.length >= 2)
      stacks.push({ ...panel.stack, members: remaining });
  }
  delete nextPanel.stack;
  if (stack.mode === 'cumulative') {
    const ids = stack.members.filter((id) =>
      normalized.some(
        (item) =>
          item.plot.plotSlotId === id &&
          item.plot.visible !== false &&
          (item.plot.kind === 'xy' || item.plot.kind === 'area'),
      ),
    );
    const groups = stack.withinSubgroup
      ? layerStackUnits(stack, ids, true)
      : [ids];
    for (const group of groups)
      if (group.length)
        stacks.push({
          mode: stack.normalizePercent ? 'percent' : 'normal',
          members: group,
          labels: stack.totalLabels,
        });
  }
  const result = prepareCurveTransforms(
    nextPanel,
    normalized,
    data,
    {},
    stacks,
  );
  for (const item of input) {
    const id = item.plot.plotSlotId;
    const mapping = maps.get(id);
    if (!mapping || (item.plot.kind !== 'xy' && item.plot.kind !== 'area'))
      continue;
    const after = result.errorTransforms.get(id);
    if (item.xyRows) result.sourceRows.set(id, item.xyRows);
    result.errorTransforms.set(id, (row) => {
      const mappedRow = {
        ...row,
        x: mapping.mapX(row.x),
        y: mapping.mapY(row.y),
      };
      const target = after?.(mappedRow);
      if (after && !target) return undefined;
      return {
        xOffset: mappedRow.x - row.x + (target?.xOffset ?? 0),
        yOffset: mappedRow.y - row.y + (target?.yOffset ?? 0),
        yScale: target?.yScale ?? 1,
        mapX: (value) =>
          target?.mapX
            ? target.mapX(mapping.mapX(value))
            : mapping.mapX(value) + (target?.xOffset ?? 0),
        mapY: (value) =>
          target ? target.mapY(mapping.mapY(value)) : mapping.mapY(value),
      };
    });
  }
  return result;
}

export function materializeLayerStackOffsets(
  panel: Panel,
  data?: DataBindingSet,
): LayerStack['individual']['values'] {
  const stack = panel.layerStack;
  if (!stack)
    return panel.plotSlots.flatMap((plot) => {
      if (plot.kind !== 'xy' && plot.kind !== 'area') return [];
      const setting = materializeCurveOffsets(panel, plot.plotSlotId, data);
      const value = (axis: 'offsetX' | 'offsetY') =>
        setting?.[axis]?.mode === 'constant' ? setting[axis].value : 0;
      return [
        {
          plotSlotId: plot.plotSlotId,
          xOffset: value('offsetX'),
          yOffset: value('offsetY'),
          xMultiplier: 1,
          yMultiplier: 1,
        },
      ];
    });
  if (stack.mode === 'individual')
    return structuredClone(stack.individual.values);
  if (stack.mode === 'auto' && !data)
    throw new Error('转换自动偏移需要已绑定的原始数据');
  const input = panel.plotSlots
    .filter((p) => stack.members.includes(p.plotSlotId) && p.visible !== false)
    .map((plot) =>
      data
        ? preparePlot(plot, data, panel.axes)
        : { plot, xValues: [0, 1], yValues: [0, 1] },
    );
  const maps = layerStackCoordinateMaps(panel, input);
  return input.map((item) => {
    const mapping = maps.get(item.plot.plotSlotId)!;
    const fit = (values: number[], map: (value: number) => number) => {
      const a = values[0] ?? 0;
      const b = values.find((v) => v !== a) ?? a + 1;
      const multiplier = (map(b) - map(a)) / (b - a);
      const offset = map(a) - multiplier * a;
      if (
        !Number.isFinite(multiplier) ||
        !Number.isFinite(offset) ||
        values.some(
          (v) =>
            Math.abs(map(v) - (v * multiplier + offset)) >
            1e-8 * Math.max(1, Math.abs(map(v))),
        )
      )
        throw new Error(
          '当前非线性偏移不能用单一倍率和常量表示，请先关闭保持非线性比例',
        );
      return { multiplier, offset };
    };
    const x = fit(item.xValues, mapping.mapX),
      y = fit(item.yValues, mapping.mapY);
    return {
      plotSlotId: item.plot.plotSlotId,
      xOffset: x.offset,
      yOffset: y.offset,
      xMultiplier: x.multiplier,
      yMultiplier: y.multiplier,
    };
  });
}
