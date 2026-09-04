import type { FigureTemplate } from '@plot-fig/figure-schema';

type Axis = FigureTemplate['panels'][number]['axes'][number];
type AxisLike = Pick<Axis, 'scale' | 'reverse'>;

export type LinearScale = {
  min: number;
  max: number;
  map: (value: number) => number;
};

export type PlotScale = LinearScale & {
  scale: Axis['scale'];
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
      const ratio =
        (transformed - transformedMin) / (transformedMax - transformedMin);
      return axis.reverse ? 1 - ratio : ratio;
    },
  };
}

export function createScaleFromValues(
  axis: Axis,
  values: number[],
): PlotScale | undefined {
  const finite = values.filter((value) => Number.isFinite(value));
  const usable =
    axis.scale === 'linear' ? finite : finite.filter((value) => value > 0);
  const range =
    axis.range.mode === 'fixed'
      ? { min: axis.range.min, max: axis.range.max }
      : { min: Math.min(...usable), max: Math.max(...usable) };
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
  const target = Math.max(2, Math.floor(count));
  const step = niceStep((max - min) / (target - 1));
  const start = Math.ceil(min / step - 1e-12) * step;
  const ticks: number[] = [min];
  for (let value = start; value < max - step * 1e-9; value += step) {
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
