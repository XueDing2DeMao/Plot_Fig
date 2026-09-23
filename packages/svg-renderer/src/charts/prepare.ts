import {
  categoricalDimension,
  type PlotSlot,
  type Axis,
} from '@plot-fig/figure-schema';
import { prepareXyData } from '../xy-data-view.js';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { errorRange } from '../error-values.js';
import {
  finite,
  histogram,
  boxSummary,
  densityCurve,
  sampleSummary,
} from './statistics.js';
import { prepareGrid } from './grid.js';
import { triangulate } from './irregular-grid.js';
import {
  boundColumn,
  category,
  rowLocation,
  type PreparedPlot,
  type DataPoint,
} from './prepared.js';

function assertMonotonic(points: DataPoint[]) {
  if (points.length < 2) return;
  const direction = Math.sign(points[1]!.x - points[0]!.x);
  if (
    direction === 0 ||
    points.some(
      (p, i) => i > 0 && Math.sign(p.x - points[i - 1]!.x) !== direction,
    )
  )
    throw new Error('Area 每个连续段的 X 必须严格单调');
}
function preparePairs(
  result: PreparedPlot,
  data: DataBindingSet,
  axes?: readonly Axis[],
) {
  const plot = result.plot;
  if (plot.kind !== 'xy' && plot.kind !== 'area') return;
  if (plot.kind === 'xy') {
    const rows = prepareXyData(plot, data, axes);
    result.xyRows = rows;
    result.segments = rows.segments;
    result.skipped = rows.invalidCount;
    for (const row of rows.calculationRows) {
      result.xValues.push(row.x);
      result.yValues.push(row.y);
      if (plot.errorBarStyle?.visible) {
        result.xValues.push(
          ...(errorRange(plot, data, {
            prefix: 'x',
            index: row.sourceIndex,
            base: row.x,
          }) ?? []),
        );
        result.yValues.push(
          ...(errorRange(plot, data, {
            prefix: 'y',
            index: row.sourceIndex,
            base: row.y,
          }) ?? []),
        );
      }
    }
    return;
  }
  const x = boundColumn(data, plot.bindings.x),
    y = boundColumn(data, plot.bindings.y);
  let segment: DataPoint[] = [];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const xv = x[i],
      yv = y[i];
    if (!finite(xv) || !finite(yv)) {
      result.skipped++;
      if (segment.length) result.segments.push(segment);
      segment = [];
      continue;
    }
    segment.push({ x: xv, y: yv });
    result.xValues.push(xv);
    result.yValues.push(yv);
  }
  if (segment.length) result.segments.push(segment);
  if (plot.kind === 'area') {
    result.yValues.push(plot.baseline);
    for (const points of result.segments) assertMonotonic(points);
  }
}
function prepareBar(result: PreparedPlot, data: DataBindingSet) {
  const plot = result.plot;
  if (plot.kind !== 'bar') return;
  const cats = boundColumn(data, plot.bindings.category),
    values = boundColumn(data, plot.bindings.value),
    seen = new Set<string>();
  for (let i = 0; i < Math.max(cats.length, values.length); i++) {
    const item = category(cats[i]);
    let value = values[i];
    if (!finite(value)) {
      if (plot.options?.missing === 'zero') value = 0;
      else
        throw new Error(
          `${rowLocation(data, plot.bindings.value, i)}：${item.label} 的值缺失或无效`,
        );
    }
    if (seen.has(item.key))
      throw new Error(
        `${rowLocation(data, plot.bindings.category, i)}：重复类别 ${item.label}`,
      );
    seen.add(item.key);
    const baseline = plot.options?.baseline ?? 0,
      rawBounds = plot.errorBarStyle?.visible
        ? errorRange(plot, data, { prefix: 'value', index: i, base: value })
        : undefined,
      bounds = rawBounds
        ? ([rawBounds[0] + baseline, rawBounds[1] + baseline] as [
            number,
            number,
          ])
        : undefined;
    if (
      plot.errorBarStyle?.visible &&
      !bounds &&
      Object.keys(plot.bindings).some((k) => k.startsWith('valueError'))
    )
      (result.errorWarnings ??= []).push(
        `${rowLocation(data, plot.bindings.value, i)}：无效值误差已跳过`,
      );
    result.categories.push(item);
    result.bars.push({
      category: item.key,
      low: 0,
      high: 0,
      start: baseline,
      end: value + baseline,
      ...(bounds ? { error: bounds } : {}),
    });
  }
}
function optionalGroup(
  plot: Extract<PlotSlot, { kind: 'box' }>,
  data: DataBindingSet,
) {
  const id = plot.bindings.group;
  return id && data.bindings.some((b) => b.dataSlotId === id)
    ? boundColumn(data, id)
    : undefined;
}
function optionalSplit(
  plot: Extract<PlotSlot, { kind: 'box' }>,
  data: DataBindingSet,
) {
  const id = plot.bindings.split;
  return id && data.bindings.some((b) => b.dataSlotId === id)
    ? boundColumn(data, id)
    : undefined;
}
function prepareBox(result: PreparedPlot, data: DataBindingSet) {
  const plot = result.plot;
  if (plot.kind !== 'box') return;
  const values = boundColumn(data, plot.bindings.values);
  const groups = optionalGroup(plot, data),
    splits = optionalSplit(plot, data),
    splitMode =
      plot.distribution?.visible && plot.distribution.side === 'split',
    items = new Map<string, number[]>(),
    splitItems = new Map<
      string,
      Map<string, { label: string; values: number[] }>
    >(),
    splitOrder: string[] = [];
  if (splitMode && !splits)
    throw new Error('分裂分布需要绑定一个恰含两个层级的分裂分组列');
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (
      !finite(value) ||
      (groups && (groups[i] === null || groups[i] === undefined))
    ) {
      result.skipped++;
      continue;
    }
    const item = groups
      ? category(groups[i])
      : { key: 'p:' + plot.plotSlotId, label: plot.legendEntry.text };
    if (!items.has(item.key)) {
      items.set(item.key, []);
      result.categories.push(item);
    }
    items.get(item.key)!.push(value);
    if (splitMode) {
      const split = category(splits![i]);
      if (!splitOrder.includes(split.key)) splitOrder.push(split.key);
      if (!splitItems.has(item.key)) splitItems.set(item.key, new Map());
      const levels = splitItems.get(item.key)!;
      if (!levels.has(split.key))
        levels.set(split.key, { label: split.label, values: [] });
      levels.get(split.key)!.values.push(value);
    }
  }
  if (splitMode && splitOrder.length !== 2)
    throw new Error(
      `分裂分布要求全局恰含两个层级，当前为${splitOrder.length}个`,
    );
  result.boxes = [...items].map(([category, values]) => ({
    ...boxSummary(values, {
      quantileMethod: plot.quantileMethod,
      factor: plot.whiskerFactor,
      ...(plot.whiskerRange ? { whisker: plot.whiskerRange } : {}),
      ...(plot.boxRange ? { boxRange: plot.boxRange } : {}),
      ...(plot.percentileLow !== undefined ? { low: plot.percentileLow } : {}),
      ...(plot.percentileHigh !== undefined
        ? { high: plot.percentileHigh }
        : {}),
    }),
    category,
    samples: values,
  }));
  const distribution = plot.distribution;
  const distributionMark = (
    category: string,
    values: number[],
    details: { side?: 'positive' | 'negative'; split?: string } = {},
  ) => {
    const points = densityCurve(values, distribution!),
      factor = distribution!.normalize === 'count' ? values.length : 1;
    return {
      category,
      ...details,
      points: points.map((point) => ({
        x: point.x,
        y: point.y * factor,
      })),
    };
  };
  if (distribution?.visible) {
    if (splitMode)
      result.distributions = [...items].flatMap(([category]) => {
        const categoryLevels = splitItems.get(category),
          levels = splitOrder.flatMap((key) => {
            const level = categoryLevels?.get(key);
            return level ? [level] : [];
          });
        if (levels.length !== 2)
          throw new Error(
            `分裂分布要求每个箱线类别恰含两个层级，${category} 当前为${levels.length}个`,
          );
        return levels.map((level, index) =>
          distributionMark(category, level.values, {
            side: index === 0 ? 'negative' : 'positive',
            split: level.label,
          }),
        );
      });
    else
      result.distributions = [...items].map(([category, values]) =>
        distributionMark(category, values),
      );
  }
}
function fillDomains(result: PreparedPlot) {
  const dimension = categoricalDimension(result.plot);
  if (dimension) {
    const values = [
      ...result.bars.flatMap((b) => [b.start, b.end, ...(b.error ?? [])]),
      ...result.boxes.flatMap((b) => [b.min, b.max]),
    ];
    if (dimension === 'x') result.yValues = values;
    else result.xValues = values;
    const support =
      result.distributions?.flatMap((entry) =>
        entry.points.map((point) => point.x),
      ) ?? [];
    if (dimension === 'x') result.yValues.push(...support);
    else result.xValues.push(...support);
  }
}
function prepareGridPlot(result: PreparedPlot, data: DataBindingSet) {
  const plot = result.plot;
  if (plot.kind === 'heatmap' || plot.kind === 'contour') {
    const columns = {
      x: boundColumn(data, plot.bindings.x),
      y: boundColumn(data, plot.bindings.y),
      z: boundColumn(data, plot.bindings.z),
    };
    const irregular =
      (plot.kind === 'heatmap' && plot.heatmap?.dataRegion === 'xyz') ||
      (plot.kind === 'contour' && plot.contour?.dataRegion === 'xyz');
    if (irregular) {
      const points: Array<{ x: number; y: number; z: number }> = [];
      let skipped = 0;
      for (
        let i = 0;
        i < Math.max(columns.x.length, columns.y.length, columns.z.length);
        i++
      ) {
        const x = columns.x[i],
          y = columns.y[i],
          z = columns.z[i];
        if (!finite(x) || !finite(y) || !finite(z)) {
          skipped++;
          continue;
        }
        points.push({ x, y, z });
      }
      result.irregular = { points, triangles: triangulate(points), skipped };
      result.skipped = skipped;
      result.xValues = points.map((point) => point.x);
      result.yValues = points.map((point) => point.y);
      return;
    }
    const grid = prepareGrid(
      {
        x: columns.x,
        y: columns.y,
        z: columns.z,
      },
      plot.kind === 'contour',
    );
    result.grid = grid;
    result.skipped = grid.skipped;
    result.xValues = [grid.x[0]! - grid.dx / 2, grid.x.at(-1)! + grid.dx / 2];
    result.yValues = [grid.y[0]! - grid.dy / 2, grid.y.at(-1)! + grid.dy / 2];
  }
}
export function preparePlot(
  plot: PlotSlot,
  data: DataBindingSet,
  axes?: readonly Axis[],
): PreparedPlot {
  const invalid = data.diagnostics.find(
    (d) =>
      d.code === 'TABLE_BINDING_INVALID' &&
      d.sourcePath === `/plotSlots/${plot.plotSlotId}`,
  );
  if (invalid) throw new Error(invalid.message);
  const result: PreparedPlot = {
    plot,
    xValues: [],
    yValues: [],
    categories: [],
    bars: [],
    boxes: [],
    segments: [],
    skipped: 0,
    bandIndex: 0,
    bandCount: 1,
  };
  preparePairs(result, data, axes);
  prepareBar(result, data);
  prepareBox(result, data);
  if (plot.kind === 'histogram') {
    const source = boundColumn(data, plot.bindings.values),
      summary = histogram(source, plot);
    result.bars = summary.bins.map((b) => ({
      low: b.low,
      high: b.high,
      start: 0,
      end: b.value,
    }));
    result.skipped = summary.skipped + summary.excluded;
    result.xValues = result.bars.flatMap((b) => [b.low, b.high]);
    result.yValues = [0, ...result.bars.map((b) => b.end)];
    if (plot.showStatistics) {
      const values = source.filter(finite),
        stats = sampleSummary(values);
      result.statistics = {
        count: values.length,
        mean: stats.mean,
        sd: stats.sd,
        min: stats.min,
        max: stats.max,
      };
    }
    if (plot.distribution?.visible) {
      const values = source.filter(finite),
        points = densityCurve(values, plot.distribution, [
          result.bars[0]!.low,
          result.bars.at(-1)!.high,
        ]);
      (result.distributions ??= []).push({
        points: points.map((point) => {
          const bin =
              result.bars.find(
                (bar, index) =>
                  point.x >= bar.low &&
                  (point.x < bar.high ||
                    (index === result.bars.length - 1 && point.x <= bar.high)),
              ) ?? result.bars.at(-1)!,
            width = bin.high - bin.low,
            factor =
              plot.distribution!.normalize === 'count'
                ? summary.included * width
                : plot.distribution!.normalize === 'probability'
                  ? width
                  : 1;
          return { x: point.x, y: point.y * factor };
        }),
      });
      result.yValues.push(
        ...result.distributions[0]!.points.map((point) => point.y),
      );
    }
  }
  prepareGridPlot(result, data);
  fillDomains(result);
  if (!result.xValues.length && !result.yValues.length)
    throw new Error('没有可绘制的有效数据');
  return result;
}
export function arrangeBands(plots: PreparedPlot[]) {
  const failures: Array<{ item: PreparedPlot; cause: unknown }> = [];
  const groups = new Map<string, PreparedPlot[]>();
  for (const item of plots) {
    if (!categoricalDimension(item.plot)) continue;
    const key = JSON.stringify([
      item.plot.xAxisId,
      item.plot.yAxisId,
      categoricalDimension(item.plot),
    ]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  for (const items of groups.values()) failures.push(...arrangeGroup(items));
  return failures;
}
function stackBars(item: PreparedPlot, totals: Map<string, number>) {
  const pending = new Map(totals);
  const bars = item.bars.map((bar) => {
    const baseline =
      item.plot.kind === 'bar' ? (item.plot.options?.baseline ?? 0) : 0;
    const value = bar.end - baseline;
    const key = JSON.stringify([
      item.plot.kind === 'bar' ? item.plot.stackGroup : '',
      bar.category,
      value >= 0,
    ]);
    const start = pending.get(key) ?? baseline,
      end = start + value;
    if (!finite(end)) throw new Error('堆叠累计值超出有限数值范围');
    pending.set(key, end);
    const shift = end - bar.end;
    return {
      ...bar,
      start,
      end,
      ...(bar.error
        ? {
            error: [bar.error[0] + shift, bar.error[1] + shift] as [
              number,
              number,
            ],
          }
        : {}),
    };
  });
  item.bars = bars;
  return pending;
}
function arrangeGroup(items: PreparedPlot[]) {
  const keyFor = (item: PreparedPlot) =>
    item.plot.kind === 'bar' && item.plot.layout === 'stacked'
      ? 'stack:' + item.plot.stackGroup
      : 'plot:' + item.plot.plotSlotId;
  const failures: Array<{ item: PreparedPlot; cause: unknown }> = [];
  const barCategories = new Map<string, { key: string; label: string }>();
  for (const item of items)
    if (item.plot.kind === 'bar')
      for (const category of item.categories)
        if (!barCategories.has(category.key))
          barCategories.set(category.key, category);
  for (const item of items) {
    if (item.plot.kind !== 'bar' || item.plot.options?.missing !== 'zero')
      continue;
    const present = new Set(item.bars.map((bar) => bar.category)),
      baseline = item.plot.options.baseline;
    for (const category of barCategories.values()) {
      if (present.has(category.key)) continue;
      item.categories.push(category);
      item.bars.push({
        category: category.key,
        low: 0,
        high: 0,
        start: baseline,
        end: baseline,
      });
    }
  }
  const percentage = items.filter(
    (item) =>
      item.plot.kind === 'bar' &&
      item.plot.layout === 'stacked' &&
      item.plot.options?.percentage,
  );
  const percentageTotals = new Map<string, number>();
  for (const item of percentage)
    for (const bar of item.bars) {
      const baseline =
          item.plot.kind === 'bar' ? (item.plot.options?.baseline ?? 0) : 0,
        value = bar.end - baseline,
        key = JSON.stringify([
          item.plot.kind === 'bar' ? item.plot.stackGroup : '',
          bar.category,
          value >= 0,
        ]);
      percentageTotals.set(
        key,
        (percentageTotals.get(key) ?? 0) + Math.abs(value),
      );
    }
  for (const item of percentage) {
    const baseline =
      item.plot.kind === 'bar' ? (item.plot.options?.baseline ?? 0) : 0;
    item.bars = item.bars.map((bar) => {
      const value = bar.end - baseline,
        key = JSON.stringify([
          item.plot.kind === 'bar' ? item.plot.stackGroup : '',
          bar.category,
          value >= 0,
        ]),
        total = percentageTotals.get(key) ?? 0;
      const end = baseline + (total ? (value / total) * 100 : 0),
        factor = total ? 100 / total : 0;
      return {
        ...bar,
        end,
        ...(bar.error
          ? {
              error: [
                end + (bar.error[0] - (baseline + value)) * factor,
                end + (bar.error[1] - (baseline + value)) * factor,
              ] as [number, number],
            }
          : {}),
      };
    });
  }
  let totals = new Map<string, number>();
  for (const item of items) {
    try {
      if (item.plot.kind === 'bar' && item.plot.layout === 'stacked')
        totals = stackBars(item, totals);
      fillDomains(item);
    } catch (cause) {
      failures.push({ item, cause });
    }
  }
  const valid = items.filter((item) => !failures.some((f) => f.item === item));
  const bands = [...new Set(valid.map(keyFor))];
  for (const item of valid) {
    item.bandIndex = bands.indexOf(keyFor(item));
    item.bandCount = bands.length;
  }
  return failures;
}
