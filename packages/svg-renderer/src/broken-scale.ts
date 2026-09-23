import type { AxisLike, PlotScale } from './scales.js';
import { planAxisTicks } from './tick-plan.js';
export function createBrokenScale(
  axis: AxisLike,
  min: number,
  max: number,
  create: (axis: AxisLike, min: number, max: number) => PlotScale | undefined,
): PlotScale {
  const config = axis.advanced!.breaks!,
    { breaks, ...rest } = axis.advanced!;
  if (config.intervals.length > 8) throw new Error('最多支持8个断区');
  let previous = min,
    totalGap = 0;
  for (const interval of config.intervals) {
    if (!(
      previous < interval.from &&
      interval.from < interval.to &&
      interval.to < max
    ))
      throw new Error('断区必须有序且严格位于固定范围内');
    previous = interval.to;
    totalGap += (interval.gapPercent ?? 3) / 100;
  }
  if (totalGap >= 0.5) throw new Error('断区间隙合计必须小于50%');
  const ranges = [min, ...config.intervals.map((i) => i.to)].map(
    (start, i) => ({
      min: start,
      max: config.intervals[i]?.from ?? max,
      settings: config.intervals[i - 1]?.after,
    }),
  );
  const children = ranges.map((range) => {
    const child: AxisLike = { ...axis, reverse: false, advanced: rest };
    if (range.settings?.scale) {
      child.scale = range.settings.scale;
      delete child.scaleOptions;
      delete child.symLog;
      delete child.logTicks;
    }
    const scale = create(child, range.min, range.max);
    if (!scale) throw new Error('断后区段无法建立有效尺度');
    return scale;
  });
  const weights =
    config.weights ??
    children.map((s) =>
      Math.abs(
        s.numeric!.capability.forward(s.max) -
          s.numeric!.capability.forward(s.min),
      ),
    );
  if (
    weights.length !== children.length ||
    weights.some((v) => !Number.isFinite(v) || v <= 0)
  )
    throw new Error('请为每个保留区段设置正权重');
  const total = weights.reduce((a, b) => a + b, 0);
  let position = 0;
  const segments = ranges.map((range, i) => {
    const from = position,
      to =
        i === ranges.length - 1
          ? 1
          : position + ((1 - totalGap) * weights[i]!) / total;
    position = to + (config.intervals[i]?.gapPercent ?? 3) / 100;
    return {
      ...range,
      scale: children[i]!,
      from: axis.reverse ? 1 - from : from,
      to: axis.reverse ? 1 - to : to,
    };
  });
  const locateValue = (v: number) =>
    segments.find((s) => v >= s.min && v <= s.max) ??
    (v < min ? segments[0] : v > max ? segments.at(-1) : undefined);
  const map = (value: number) => {
    const s = locateValue(value);
    return s ? s.from + (s.to - s.from) * s.scale.map(value) : NaN;
  };
  const invert = (ratio: number) => {
    const s =
      segments.find(
        (s) =>
          ratio >= Math.min(s.from, s.to) && ratio <= Math.max(s.from, s.to),
      ) ??
      (ratio < 0
        ? axis.reverse
          ? segments.at(-1)
          : segments[0]
        : ratio > 1
          ? axis.reverse
            ? segments[0]
            : segments.at(-1)
          : undefined);
    return s
      ? s.scale.numeric!.invert((ratio - s.from) / (s.to - s.from))
      : NaN;
  };
  const base = create({ ...axis, advanced: rest }, min, max);
  if (!base?.numeric) throw new Error('断轴需要数值尺度');
  return {
    ...base,
    min,
    max,
    map,
    numeric: { ...base.numeric, map, invert },
    segments,
    segmentTicks: planAxisTicks,
  };
}
