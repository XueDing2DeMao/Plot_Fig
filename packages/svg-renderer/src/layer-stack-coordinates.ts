import {
  axisScaleSpec,
  numericScaleCapability,
  type LayerStack,
  type Panel,
} from '@plot-fig/figure-schema';
import type { PreparedPlot } from './charts/prepared.js';

type Input = Pick<PreparedPlot, 'plot' | 'xValues' | 'yValues'>;
export type LayerCoordinateMap = {
  mapX: (value: number) => number;
  mapY: (value: number) => number;
};
const identity = (value: number) => value;
const finite = (value: number) => {
  if (!Number.isFinite(value))
    throw new Error('堆叠偏移超出有限坐标范围，请调整间距或倍率');
  return value;
};

export function layerStackUnits(
  stack: LayerStack,
  ids: string[],
  grouped: boolean,
): string[][] {
  if (!grouped) return ids.map((id) => [id]);
  const owners = new Map(
    stack.subgroups.flatMap((g) =>
      g.members.map((id) => [id, g.groupId] as const),
    ),
  );
  const units = new Map<string, string[]>();
  for (const id of ids) {
    const key = owners.has(id) ? `group:${owners.get(id)}` : `plot:${id}`;
    const unit = units.get(key) ?? [];
    unit.push(id);
    units.set(key, unit);
  }
  return [...units.values()];
}

/** 只变换显示坐标；调用者保留原行和原始数据供标签及误差使用。 */
export function layerStackCoordinateMaps(
  panel: Panel,
  inputs: Input[],
): Map<string, LayerCoordinateMap> {
  const stack = panel.layerStack;
  const result = new Map<string, LayerCoordinateMap>();
  if (!stack) return result;
  const byId = new Map(
    inputs
      .filter((p) => p.plot.visible !== false)
      .map((p) => [p.plot.plotSlotId, p]),
  );
  const ids = stack.members.filter((id) => byId.has(id));
  const values = new Map(stack.individual.values.map((v) => [v.plotSlotId, v]));
  const units = layerStackUnits(
    stack,
    ids,
    stack.betweenSubgroups &&
      (stack.mode === 'constant' || stack.mode === 'auto'),
  );
  let offset = 0;
  let previousSpan = 0;
  for (const [index, unit] of units.entries()) {
    const first = byId.get(unit[0]!)!;
    const dimension =
      first.plot.kind === 'bar' && first.plot.orientation === 'horizontal'
        ? 'x'
        : 'y';
    const axis = panel.axes.find(
      (a) =>
        a.axisId ===
        (dimension === 'x' ? first.plot.xAxisId : first.plot.yAxisId),
    );
    const capability =
      stack.mode === 'auto' && stack.auto.preserveScale && axis
        ? numericScaleCapability(axisScaleSpec(axis))
        : undefined;
    if (stack.mode === 'constant') {
      const constants = stack.constant.values;
      if (stack.constant.absolute)
        offset = constants[index % constants.length]!;
      else if (index)
        offset = finite(offset + constants[(index - 1) % constants.length]!);
    }
    if (stack.mode === 'auto') {
      let min = Infinity,
        max = -Infinity;
      for (const id of unit) {
        const item = byId.get(id)!;
        for (const v of dimension === 'x' ? item.xValues : item.yValues) {
          const value = capability ? capability.forward(v) : v;
          if (!Number.isFinite(value))
            throw new Error(
              '保持非线性比例要求所有曲线坐标位于该尺度的有效范围内',
            );
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
      const span = min <= max ? finite(max - min) : 0;
      if (index)
        offset = finite(
          offset + previousSpan + Math.max(previousSpan, span) * stack.auto.gap,
        );
      previousSpan = span;
    }
    const amount = offset;
    for (const id of unit) {
      let mapX = identity,
        mapY = identity;
      if (stack.mode === 'individual') {
        const v = values.get(id);
        if (v && stack.individual.x)
          mapX = (value) => finite(value * v.xMultiplier + v.xOffset);
        if (v && stack.individual.y)
          mapY = (value) => finite(value * v.yMultiplier + v.yOffset);
      } else if (stack.mode === 'constant' || stack.mode === 'auto') {
        const map = capability
          ? (value: number) =>
              finite(capability.inverse(capability.forward(value) + amount))
          : (value: number) => finite(value + amount);
        if (dimension === 'x') mapX = map;
        else mapY = map;
      }
      result.set(id, { mapX, mapY });
    }
  }
  return result;
}
