import type { HistogramBins } from '@plot-fig/figure-schema';
import type { DataValue } from '@plot-fig/data-binding';
export { densityCurve } from './distributions.js';
export {
  boxSummary,
  quantile,
  normalQuantile,
  sampleSummary,
} from './box-statistics.js';

export const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
export function extent(values: number[]): [number, number] {
  let min = Infinity,
    max = -Infinity;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return [min, max];
}
export function binEdges(values: number[], bins: HistogramBins): number[] {
  if (bins.mode === 'edges') return bins.edges;
  const scale = bins.scale ?? 'linear';
  if (scale !== 'linear' && values.some((v) => v <= 0))
    throw new Error('对数分箱要求所有有效样本大于零');
  const transform =
    scale === 'log10'
      ? Math.log10
      : scale === 'log2'
        ? Math.log2
        : scale === 'ln'
          ? Math.log
          : (v: number) => v;
  const inverse =
    scale === 'log10'
      ? (v: number) => 10 ** v
      : scale === 'log2'
        ? (v: number) => 2 ** v
        : scale === 'ln'
          ? Math.exp
          : (v: number) => v;
  const [valueMin, valueMax] = extent(values);
  let min = transform(valueMin),
    max = transform(valueMax);
  if (bins.mode === 'width') {
    if (bins.start !== undefined) min = transform(bins.start);
    if (bins.end !== undefined) max = transform(bins.end);
    if (!finite(min) || !finite(max) || min > max)
      throw new Error('分箱起止范围无效');
    const count = Math.max(1, Math.ceil((max - min) / bins.width));
    if (count > 1000) throw new Error('分箱数量超过1000');
    return Array.from({ length: count + 1 }, (_, i) =>
      inverse(
        i === count && bins.end !== undefined ? max : min + i * bins.width,
      ),
    );
  }
  if (min === max) {
    const half = Math.max(0.5, Math.abs(min) * 0.01);
    return [inverse(min - half), inverse(max + half)];
  }
  const count =
    bins.mode === 'count'
      ? bins.count
      : Math.min(200, Math.max(1, Math.ceil(Math.sqrt(values.length))));
  return Array.from({ length: count + 1 }, (_, i) =>
    i === 0
      ? valueMin
      : i === count
        ? valueMax
        : inverse(min * (1 - i / count) + max * (i / count)),
  );
}
function binIndex(
  value: number,
  edges: number[],
  boundary: 'left' | 'right',
): number {
  if (value < edges[0]! || value > edges.at(-1)!) return -1;
  if (value === edges.at(-1)) return edges.length - 2;
  let low = 0,
    high = edges.length - 1;
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (value < edges[mid]!) high = mid;
    else low = mid;
  }
  return boundary === 'right' && low > 0 && value === edges[low]
    ? low - 1
    : low;
}
export type HistogramOptions = {
  bins: HistogramBins;
  normalization: 'count' | 'probability' | 'density';
  boundary?: 'left' | 'right';
};
export function histogram(input: DataValue[], options: HistogramOptions) {
  const values = input.filter(finite);
  if (!values.length) throw new Error('样本列没有有效数值');
  const edges = binEdges(values, options.bins);
  if (edges.some((v, i) => !finite(v) || (i > 0 && v <= edges[i - 1]!)))
    throw new Error('分箱边界必须为严格递增的有限数值');
  const bins = edges
    .slice(1)
    .map((high, i) => ({ low: edges[i]!, high, count: 0, value: 0 }));
  let excluded = 0;
  for (const value of values) {
    const i = binIndex(value, edges, options.boundary ?? 'left');
    if (i < 0) excluded++;
    else bins[i]!.count++;
  }
  const included = values.length - excluded;
  if (!included) throw new Error('分箱范围内没有样本');
  for (const bin of bins) {
    bin.value =
      options.normalization === 'count' ? bin.count : bin.count / included;
    if (options.normalization === 'density') bin.value /= bin.high - bin.low;
    if (!finite(bin.value)) throw new Error('分箱数值超出可表示范围');
  }
  return { bins, excluded, skipped: input.length - values.length, included };
}
