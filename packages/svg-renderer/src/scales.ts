import type { FigureTemplate } from '@plot-fig/figure-schema';

export type LinearScale = {
  min: number;
  max: number;
  map: (value: number) => number;
};

export function createLinearScale(
  axis: FigureTemplate['panels'][number]['axes'][number],
  values: number[],
): LinearScale | undefined {
  const finite = values.filter(Number.isFinite);
  const range =
    axis.range.mode === 'fixed'
      ? { min: axis.range.min, max: axis.range.max }
      : { min: Math.min(...finite), max: Math.max(...finite) };
  if (
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max) ||
    range.min === range.max
  )
    return undefined;
  return {
    ...range,
    map: (value) => {
      const ratio = (value - range.min) / (range.max - range.min);
      return axis.reverse ? 1 - ratio : ratio;
    },
  };
}
