import {
  validateFormulaPair,
  createNumericScale,
  axisScaleSpec,
  type FigureTemplate,
  type Axis,
} from '@plot-fig/figure-schema';
import type { PlotScale } from './scales.js';
import { planAxisTicks } from './tick-plan.js';
export function resolveLinkedScales(
  template: FigureTemplate,
  scales: Map<string, PlotScale>,
): void {
  const axes = new Map(
      template.panels.flatMap((p) => p.axes.map((a) => [a.axisId, a] as const)),
    ),
    visiting = new Set<string>(),
    done = new Set<string>();
  const resolve = (axis: Axis): void => {
    if (done.has(axis.axisId)) return;
    if (visiting.has(axis.axisId)) throw new Error('坐标轴公式链接存在循环');
    const link = axis.advanced?.link;
    if (!link) {
      done.add(axis.axisId);
      return;
    }
    visiting.add(axis.axisId);
    const sourceAxis = axes.get(link.axisId);
    if (!sourceAxis) throw new Error('公式链接源轴不存在');
    resolve(sourceAxis);
    const parent = scales.get(sourceAxis.axisId);
    if (!parent || parent.scale === 'category')
      throw new Error('公式链接源轴尚无数值范围');
    const parentNumeric =
      parent.numeric ??
      createNumericScale(
        axisScaleSpec(sourceAxis),
        parent.min,
        parent.max,
        sourceAxis.reverse,
      );
    const pair = link.formula,
      f = validateFormulaPair(pair);
    if (parent.min < pair.min || parent.max > pair.max)
      throw new Error('源轴范围超出链接公式定义域');
    const ends = [f.forward(parent.min), f.forward(parent.max)],
      min = Math.min(...ends),
      max = Math.max(...ends);
    const map = (value: number) => {
      const source = f.inverse(value);
      if (source < pair.min || source > pair.max) return NaN;
      const ratio = parent.map(source);
      return axis.reverse ? 1 - ratio : ratio;
    };
    const invert = (ratio: number) =>
      f.forward(parentNumeric.invert(axis.reverse ? 1 - ratio : ratio));
    const numeric = {
      ...createNumericScale({ kind: 'linear' }, min, max, axis.reverse),
      map,
      invert,
    };
    const result: PlotScale = {
      scale: 'linear',
      min,
      max,
      map,
      numeric,
      ...(parent.data ? { data: parent.data } : {}),
    };
    if (parent.segments) {
      result.segments = parent.segments
        .map((segment) => {
          const min = Math.min(f.forward(segment.min), f.forward(segment.max)),
            max = Math.max(f.forward(segment.min), f.forward(segment.max));
          const a = segment.scale.map(f.inverse(min)),
            b = segment.scale.map(f.inverse(max)),
            local = (v: number) =>
              (segment.scale.map(f.inverse(v)) - a) / (b - a);
          const inv = (r: number) =>
            f.forward(segment.scale.numeric!.invert(a + r * (b - a)));
          const scale: PlotScale = {
            scale: 'linear',
            min,
            max,
            map: local,
            numeric: {
              ...createNumericScale({ kind: 'linear' }, min, max),
              map: local,
              invert: inv,
            },
            ...(parent.data ? { data: parent.data } : {}),
          };
          return { min, max, from: map(min), to: map(max), scale };
        })
        .sort((a, b) => a.min - b.min);
      result.segmentTicks = planAxisTicks;
    }
    scales.set(axis.axisId, result);
    visiting.delete(axis.axisId);
    done.add(axis.axisId);
  };
  for (const axis of axes.values()) resolve(axis);
}
