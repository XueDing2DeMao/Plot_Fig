import { categoricalDimension, type Panel } from '@plot-fig/figure-schema';
import type { BarMark, PreparedPlot } from './charts/prepared.js';
import { layerStackCoordinateMaps } from './layer-stack-coordinates.js';

const finite = (value: number) => {
  if (!Number.isFinite(value)) throw new Error('柱条堆叠数值超出有限范围');
  return value;
};
type Entry = { item: PreparedPlot; bar: BarMark; value: number };

/** 输入为未执行旧柱条累计的原始标记；各成员保留原行顺序供标签与误差使用。 */
export function arrangeLayerStackBars(
  panel: Panel,
  plots: PreparedPlot[],
): void {
  const stack = panel.layerStack;
  if (!stack) return;
  const byId = new Map(plots.map((p) => [p.plot.plotSlotId, p]));
  const members = stack.members.flatMap((id) => {
    const item = byId.get(id);
    return item?.plot.kind === 'bar' && item.plot.visible !== false
      ? [item]
      : [];
  });
  if (!members.length) return;
  const active = new Set(members);
  const subgroup = new Map(
    stack.subgroups.flatMap((g) =>
      g.members.map((id) => [id, g.groupId] as const),
    ),
  );
  const unit = (item: PreparedPlot) =>
    subgroup.has(item.plot.plotSlotId)
      ? `group:${subgroup.get(item.plot.plotSlotId)}`
      : `plot:${item.plot.plotSlotId}`;
  const accumulating =
    stack.mode === 'cumulative' || stack.mode === 'incremental';
  const key = (item: PreparedPlot) => {
    if (active.has(item)) {
      if (stack.mode === 'none') return `plot:${item.plot.plotSlotId}`;
      return accumulating && stack.withinSubgroup
        ? `layer:${unit(item)}`
        : 'layer:all';
    }
    return item.plot.kind === 'bar' && item.plot.layout === 'stacked'
      ? `legacy:${item.plot.stackGroup ?? ''}`
      : `plot:${item.plot.plotSlotId}`;
  };
  const first = members[0]!;
  const siblings = plots.filter(
    (p) =>
      p.plot.visible !== false &&
      p.plot.xAxisId === first.plot.xAxisId &&
      p.plot.yAxisId === first.plot.yAxisId &&
      categoricalDimension(p.plot) === categoricalDimension(first.plot),
  );
  const bands = [...new Set(siblings.map(key))];
  for (const item of siblings) {
    item.bandIndex = bands.indexOf(key(item));
    item.bandCount = bands.length;
  }
  const maps = layerStackCoordinateMaps(panel, members);
  const categories = new Map<string, Entry[]>();
  for (const item of members) {
    item.layerStackBarsManaged = true;
    delete item.layerStackBarMarks;
    delete item.layerStackBarTotals;
    delete item.layerStackBarConnectors;
    for (const bar of item.bars) {
      delete bar.bandIndex;
      delete bar.bandCount;
      delete bar.bandSlice;
      const category = bar.category!;
      const entry = { item, bar, value: finite(bar.end - bar.start) };
      const entries = categories.get(category) ?? [];
      entries.push(entry);
      categories.set(category, entries);
    }
  }
  const host = plots.findLast((p) => active.has(p))!;
  const draw: NonNullable<PreparedPlot['layerStackBarMarks']> = [];
  const pushMark = ({ item, bar }: Entry) =>
    draw.push({
      item: {
        plot: item.plot,
        bandIndex: item.bandIndex,
        bandCount: item.bandCount,
        bars: item.bars,
      },
      bar,
    });
  for (const entries of categories.values()) {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
      const id =
        accumulating && stack.withinSubgroup ? unit(entry.item) : 'all';
      const group = groups.get(id) ?? [];
      group.push(entry);
      groups.set(id, group);
    }
    for (const original of groups.values()) {
      const ordered = [...original];
      if (stack.mode === 'cumulative' && stack.sort !== 'none')
        ordered.sort((a, b) =>
          stack.sort === 'ascending' ? a.value - b.value : b.value - a.value,
        );
      const positiveSize = Math.max(0, ...ordered.map((e) => e.value));
      const negativeSize = Math.max(0, ...ordered.map((e) => -e.value));
      const normalizedTotal = (positive: boolean, size: number) =>
        size
          ? ordered.reduce(
              (sum, e) =>
                e.value >= 0 === positive
                  ? sum + Math.abs(e.value / size)
                  : sum,
              0,
            )
          : 0;
      const positiveTotal = normalizedTotal(true, positiveSize),
        negativeTotal = normalizedTotal(false, negativeSize);
      const bases = new Map<boolean, number>();
      const extremes = new Map<boolean, Entry>();
      for (const entry of ordered) {
        const { item, bar, value } = entry;
        if (accumulating) {
          const positive = value >= 0;
          const size = positive ? positiveSize : negativeSize;
          const total = positive ? positiveTotal : negativeTotal;
          const normalize = (v: number) =>
            stack.normalizePercent
              ? size && total
                ? finite((v / size / total) * 100)
                : 0
              : v;
          const start =
            stack.mode === 'cumulative'
              ? (bases.get(positive) ??
                (stack.normalizePercent ? 0 : bar.start))
              : stack.normalizePercent
                ? 0
                : bar.start;
          const oldEnd = bar.end;
          const end = finite(start + normalize(value));
          if (bar.error) {
            const error = bar.error
              .map((v) =>
                finite(
                  end +
                    (stack.normalizePercent
                      ? normalize(v) - normalize(oldEnd)
                      : v - oldEnd),
                ),
              )
              .sort((a, b) => a - b);
            bar.error = [error[0]!, error[1]!];
          }
          bar.start = start;
          bar.end = end;
          bases.set(positive, end);
          extremes.set(positive, entry);
        } else {
          const transform = maps.get(item.plot.plotSlotId);
          const map =
            item.plot.kind === 'bar' && item.plot.orientation === 'horizontal'
              ? transform?.mapX
              : transform?.mapY;
          if (map) {
            bar.start = finite(map(bar.start));
            bar.end = finite(map(bar.end));
            if (bar.error) {
              const error = bar.error
                .map((v) => finite(map(v)))
                .sort((a, b) => a - b);
              bar.error = [error[0]!, error[1]!];
            }
          }
        }
      }
      if (stack.mode === 'incremental') {
        if (stack.showOverlapped) {
          const ties = new Map<number, Entry[]>();
          for (const entry of ordered) {
            const same = ties.get(entry.value) ?? [];
            same.push(entry);
            ties.set(entry.value, same);
          }
          for (const same of ties.values())
            if (same.length > 1)
              same.forEach(({ bar }, index) => {
                bar.bandSlice = { index, count: same.length };
              });
        }
        // 每个类别分别将长柱放在短柱后方，避免跨类别大小次序不同导致遮挡。
        ordered.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      }
      ordered.forEach(pushMark);
      if (stack.mode === 'cumulative' && stack.totalLabels.visible) {
        for (const [positive, entry] of extremes) {
          if (!(positive ? positiveTotal : negativeTotal)) continue;
          const rawTotal = ordered.reduce(
            (sum, e) => (e.value >= 0 === positive ? sum + e.value : sum),
            0,
          );
          const value = stack.normalizePercent
            ? positive
              ? 100
              : -100
            : finite(rawTotal);
          if (!value) continue;
          (entry.item.layerStackBarTotals ??= []).push({
            bar: entry.bar,
            value,
            text:
              stack.totalLabels.format === 'scientific'
                ? value.toExponential(3)
                : String(Number(value.toFixed(6))),
            color: stack.totalLabels.color,
            fontSizePt: stack.totalLabels.fontSizePt,
          });
        }
      }
    }
  }
  host.layerStackBarMarks = draw;
  for (const item of members) {
    const values = item.bars.flatMap((bar) => [
      bar.start,
      bar.end,
      ...(bar.error ?? []),
    ]);
    if (item.plot.kind === 'bar' && item.plot.orientation === 'horizontal')
      item.xValues = values;
    else item.yValues = values;
    if (
      stack.mode === 'cumulative' &&
      stack.connectLines &&
      !stack.withinSubgroup
    ) {
      item.layerStackBarConnectors = [];
      const byCategory = new Map(item.bars.map((bar) => [bar.category, bar]));
      const order = [...categories.keys()];
      for (let i = 1; i < order.length; i++) {
        const from = byCategory.get(order[i - 1]!),
          to = byCategory.get(order[i]!);
        if (from && to) item.layerStackBarConnectors.push({ from, to });
      }
    }
  }
}
