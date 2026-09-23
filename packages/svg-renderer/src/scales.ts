import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  axisScaleSpec,
  isAdvancedAxis,
  isPositiveLogAxis,
  createNumericScale,
  type NumericScale,
} from '@plot-fig/figure-schema';

type Axis = FigureTemplate['panels'][number]['axes'][number];
export type AxisLike = Pick<
  Axis,
  'scale' | 'reverse' | 'symLog' | 'logTicks' | 'scaleOptions' | 'advanced'
> & { discreteValues?: number[] };
import { createBrokenScale } from './broken-scale.js';

export type LinearScale = {
  min: number;
  max: number;
  map: (value: number) => number;
};

export type PlotScale = LinearScale & {
  scale: Axis['scale'];
  categories?: Array<{ key: string; label: string }>;
  numeric?: NumericScale;
  data?: import('@plot-fig/data-binding').DataBindingSet;
  segments?: Array<{
    min: number;
    max: number;
    from: number;
    to: number;
    scale: PlotScale;
    settings?: NonNullable<
      NonNullable<Axis['advanced']>['breaks']
    >['intervals'][number]['after'];
  }>;
  segmentTicks?: (
    axis: Axis,
    scale: PlotScale,
  ) => import('./tick-plan.js').AxisTickPlan;
};

function transformFor(scale: Axis['scale']): (value: number) => number {
  if (scale === 'log10') return Math.log10;
  if (scale === 'ln') return Math.log;
  return (value) => value;
}

export function createScale(
  axis: AxisLike,
  min: number,
  max: number,
): PlotScale | undefined {
  if (axis.advanced?.breaks)
    return createBrokenScale(axis, min, max, createScale);
  if (isAdvancedAxis(axis)) {
    try {
      const numeric = createNumericScale(
        {
          ...axisScaleSpec(axis),
          ...(axis.discreteValues ? { values: axis.discreteValues } : {}),
        },
        min,
        max,
        axis.reverse,
      );
      return { min, max, scale: axis.scale, map: numeric.map, numeric };
    } catch {
      return undefined;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max)
    return undefined;
  if (axis.scale !== 'linear' && (min <= 0 || max <= 0)) return undefined;
  const transform = transformFor(axis.scale);
  const transformedMin = transform(min);
  const transformedMax = transform(max);
  if (
    !Number.isFinite(transformedMin) ||
    !Number.isFinite(transformedMax) ||
    transformedMin >= transformedMax
  )
    return undefined;
  return {
    min,
    max,
    scale: axis.scale,
    map: (value) => {
      const transformed = transform(value);
      const span = transformedMax - transformedMin;
      const ratio = Number.isFinite(span)
        ? (transformed - transformedMin) / span
        : (transformed / 2 - transformedMin / 2) /
          (transformedMax / 2 - transformedMin / 2);
      return axis.reverse ? 1 - ratio : ratio;
    },
  };
}

export function createScaleFromValues(
  axis: Axis,
  values: number[],
): PlotScale | undefined {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value) || (isPositiveLogAxis(axis) && value <= 0))
      continue;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const range =
    axis.range.mode === 'fixed'
      ? { min: axis.range.min, max: axis.range.max }
      : { min, max };
  return createScale(axis, range.min, range.max);
}

function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

export function generateMajorTicks(
  min: number,
  max: number,
  count = 6,
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return [];
  const target = Math.min(100, Math.max(2, Math.floor(count)));
  const rawStep = max / (target - 1) - min / (target - 1);
  const step = niceStep(rawStep);
  const start = Math.ceil(min / step - 1e-12) * step;
  const ticks: number[] = [min];
  for (let i = 0; i <= target; i++) {
    const value = start + i * step;
    if (value >= max - step * 1e-9 || !Number.isFinite(value)) break;
    if (value > min + step * 1e-9) ticks.push(value);
  }
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks.map((value) => (Object.is(value, -0) ? 0 : value));
}

export function createLinearScale(
  axis: Axis,
  values: number[],
): LinearScale | undefined {
  return createScaleFromValues({ ...axis, scale: 'linear' }, values);
}
