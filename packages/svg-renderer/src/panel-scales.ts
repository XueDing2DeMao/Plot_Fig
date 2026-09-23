import { resolveAxisRange } from './axis-range.js';
import { createScale } from './scales.js';
import { categoricalDimension, type Axis } from '@plot-fig/figure-schema';
import { createScaleFromValues, type PlotScale } from './scales.js';
import type { PreparedPlot, Category } from './charts/prepared.js';
import { finite, extent } from './charts/statistics.js';
import { isAdvancedAxis, axisScaleSpec } from '@plot-fig/figure-schema';
import { resolveNumericScaleRange } from './advanced-scale-range.js';
import { usesIntegerTicks } from './integer-axis.js';

function numericScale(
  axis: Axis & { discreteValues?: number[] },
  values: number[],
): PlotScale | undefined {
  if (axis.range.mode === 'fixed') return createScaleFromValues(axis, values);
  if (isAdvancedAxis(axis)) {
    const range = resolveNumericScaleRange({
      spec: {
        ...axisScaleSpec(axis),
        ...(axis.discreteValues ? { values: axis.discreteValues } : {}),
      },
      values,
      nice: axis.rescale?.nice === true,
      ...(axis.rescale?.margin ? { padding: axis.rescale.margin } : {}),
      ...('min' in axis.range ? { min: axis.range.min } : {}),
      ...('max' in axis.range ? { max: axis.range.max } : {}),
    });
    return range ? createScale(axis, range.min, range.max) : undefined;
  }
  if (axis.rescale && axis.scale !== 'category') {
    const result = resolveAxisRange({
      scale: axis.scale as 'linear' | 'log10' | 'ln',
      values,
      nice: axis.rescale.nice === true,
      ...(axis.rescale.margin ? { padding: axis.rescale.margin } : {}),
      ...('min' in axis.range ? { min: axis.range.min } : {}),
      ...('max' in axis.range ? { max: axis.range.max } : {}),
    });
    return result ? createScale(axis, result.min, result.max) : undefined;
  }
  const clean = values.filter(
    (v) => finite(v) && (axis.scale === 'linear' || v > 0),
  );
  const [min, max] = extent(clean);
  if (min === max && finite(min)) {
    const half = Math.max(0.5, Math.abs(min) * 0.01);
    return createScaleFromValues(
      axis,
      axis.scale === 'linear' ? [min - half, max + half] : [min / 2, max * 2],
    );
  }
  return createScaleFromValues(axis, clean);
}
export function axisRangePlots(
  axis: Axis,
  plots: PreparedPlot[],
): PreparedPlot[] {
  const reference = axis.dimension === 'x' ? 'xAxisId' : 'yAxisId';
  const exact = plots.filter((item) => item.plot[reference] === axis.axisId);
  return exact.length || axis.compatibility?.unboundRange !== 'panel-v1.7'
    ? exact
    : plots;
}

export function prepareAxisScale(
  axis: Axis,
  plots: PreparedPlot[],
  data?: import('@plot-fig/data-binding').DataBindingSet,
): PlotScale | undefined {
  const items = axisRangePlots(axis, plots);
  if (axis.scale !== 'category') {
    const numericAxis =
      axis.scale === 'discrete'
        ? {
            ...axis,
            discreteValues: [...new Set(items[0]?.xValues ?? [])]
              .filter(Number.isFinite)
              .sort((a, b) => a - b),
          }
        : axis;
    let result = numericScale(
      numericAxis,
      items.flatMap((item) =>
        axis.dimension === 'x' ? item.xValues : item.yValues,
      ),
    );
    // 只扩展自动范围端点，保留手动范围和原始数据精度。
    if (result && axis.range.mode !== 'fixed' && usesIntegerTicks(axis)) {
      const min = 'min' in axis.range ? result.min : Math.floor(result.min);
      const max = 'max' in axis.range ? result.max : Math.ceil(result.max);
      result = createScale(numericAxis, min, max);
    }
    if (result && data) {
      result.data = data;
      for (const segment of result.segments ?? []) segment.scale.data = data;
    }
    return result;
  }
  const categories: Category[] = [],
    keys = new Set<string>();
  for (const item of items) {
    if (categoricalDimension(item.plot) !== axis.dimension) continue;
    for (const entry of item.categories)
      if (!keys.has(entry.key)) {
        keys.add(entry.key);
        categories.push(entry);
      }
  }
  if (!categories.length) return undefined;
  const order = axis.advanced?.categoryOrder;
  if (order?.mode === 'ascending' || order?.mode === 'descending')
    categories.sort((a, b) => {
      const result =
        a.key.startsWith('n:') && b.key.startsWith('n:')
          ? Number(a.label) - Number(b.label)
          : a.label < b.label
            ? -1
            : a.label > b.label
              ? 1
              : 0;
      return order.mode === 'descending' ? -result : result;
    });
  else if (order?.mode === 'custom') {
    const keys = order.values ?? [],
      rank = (c: Category) => {
        const index = keys.findIndex((v) => v === c.key || v === c.label);
        return index < 0 ? Infinity : index;
      };
    categories.sort((a, b) => rank(a) - rank(b));
  }
  return {
    min: 0,
    max: categories.length,
    scale: 'category',
    categories,
    ...(data ? { data } : {}),
    map: (value) =>
      axis.reverse
        ? 1 - (value + 0.5) / categories.length
        : (value + 0.5) / categories.length,
  };
}
