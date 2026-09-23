import type {
  Axis,
  AxisAdvanced,
  MajorTickGeneration,
} from '@plot-fig/figure-schema';
import type { PlotScale } from './scales.js';
import type { AxisTickPlan, PlannedTick } from './tick-plan.js';
import { axisSourceColumn, advancedAxisLabel } from './axis-advanced-labels.js';
const LIMIT = 10000;
export function calendarTicks(
  min: number,
  max: number,
  calendar: NonNullable<AxisAdvanced['calendar']>,
): number[] {
  if (
    !Number.isFinite(new Date(min).getTime()) ||
    !Number.isFinite(new Date(max).getTime())
  )
    throw new Error('日历范围无效');
  const { unit, step } = calendar;
  if (!Number.isInteger(step) || step < 1)
    throw new Error('日历增量必须为正整数');
  const anchor =
      calendar.anchor ?? (unit === 'week' ? Date.UTC(1970, 0, 5) : 0),
    origin = new Date(anchor);
  if (!Number.isFinite(origin.getTime())) throw new Error('日历锚点无效');
  const durations: Partial<Record<typeof unit, number>> = {
    second: 1000,
    minute: 60000,
    hour: 3600000,
    day: 86400000,
    week: 604800000,
  };
  const duration = durations[unit];
  let at: (index: number) => number, start: number;
  if (duration) {
    const gap = duration * step;
    start = Math.ceil((min - anchor) / gap);
    at = (i) => anchor + i * gap;
  } else {
    const months = step * (unit === 'year' ? 12 : unit === 'quarter' ? 3 : 1),
      date = new Date(min);
    start =
      Math.floor(
        ((date.getUTCFullYear() - origin.getUTCFullYear()) * 12 +
          date.getUTCMonth() -
          origin.getUTCMonth()) /
          months,
      ) - 1;
    at = (i) => {
      const d = new Date(anchor);
      d.setUTCDate(1);
      d.setUTCMonth(origin.getUTCMonth() + i * months);
      const next = new Date(d);
      next.setUTCMonth(next.getUTCMonth() + 1, 0);
      d.setUTCDate(Math.min(origin.getUTCDate(), next.getUTCDate()));
      return d.getTime();
    };
  }
  const values: number[] = [];
  let previous = -Infinity;
  for (let i = start; i < start + LIMIT + 8; i++) {
    const value = at(i);
    if (!Number.isFinite(value) || value <= previous)
      throw new Error('日历刻度无法继续递增');
    previous = value;
    if (value > max) return values;
    if (value >= min) {
      if (values.length >= LIMIT) throw new Error('日历刻度超过10000条');
      values.push(value);
    }
  }
  throw new Error('日历刻度超过计算预算');
}
export function extendedTickPlan(
  axis: Axis,
  scale: PlotScale,
  generation: MajorTickGeneration | undefined,
  fallback: () => AxisTickPlan,
): AxisTickPlan {
  const advanced = axis.advanced;
  let plan: AxisTickPlan;
  const positions = (
    source: NonNullable<NonNullable<AxisAdvanced['ticks']>['major']>,
  ) =>
    source.mode === 'values'
      ? source.values
      : (axisSourceColumn(scale.data, source.dataSlotId)?.values ?? []).filter(
          (v): v is number => typeof v === 'number' && Number.isFinite(v),
        );
  const mapped = (values: number[]) => {
    if (values.length > 100000) throw new Error('自定义刻度数据超过100000项');
    const clean = [...new Set(values)]
      .sort((a, b) => a - b)
      .filter(
        (v) =>
          v >= scale.min && v <= scale.max && Number.isFinite(scale.map(v)),
      );
    if (clean.length > LIMIT) throw new Error('坐标轴刻度超过10000条');
    return clean.map((value) => ({ value, ratio: scale.map(value) }));
  };
  if (scale.segments) {
    const major: PlannedTick[] = [],
      minor: PlannedTick[] = [];
    for (const segment of scale.segments) {
      const { breaks, labels, specialTicks, labelTable, ...rest } =
        advanced ?? {};
      const child: Axis = {
        ...axis,
        scale: segment.scale.scale,
        reverse: false,
        advanced: rest,
        majorTicks: {
          ...axis.majorTicks,
          ...(segment.settings?.majorStep
            ? {
                generation: {
                  mode: 'increment',
                  step: segment.settings.majorStep,
                },
              }
            : {}),
        },
        minorTicks: {
          ...axis.minorTicks,
          ...(segment.settings?.minorCount === undefined
            ? {}
            : { count: segment.settings.minorCount }),
        },
      };
      const part = scale.segmentTicks!(child, segment.scale);
      for (const [source, target] of [
        [part.major, major],
        [part.minor, minor],
      ] as const)
        for (const tick of source) {
          target.push({
            ...tick,
            ratio: segment.from + (segment.to - segment.from) * tick.ratio,
            ...(segment.settings ? { labelStyle: segment.settings } : {}),
          });
        }
    }
    plan = {
      major: major.sort((a, b) => a.value - b.value),
      minor: minor.sort((a, b) => a.value - b.value),
    };
  } else if (advanced?.calendar || advanced?.ticks?.major) {
    const major = mapped(
      advanced.calendar
        ? calendarTicks(scale.min, scale.max, advanced.calendar)
        : positions(advanced.ticks!.major!),
    );
    const minor: PlannedTick[] = [];
    if (axis.minorTicks.visible) {
      if (
        major.length + Math.max(0, major.length - 1) * axis.minorTicks.count >
        LIMIT
      )
        throw new Error('坐标轴刻度超过10000条');
      for (let i = 1; i < major.length; i++)
        for (let j = 1; j <= axis.minorTicks.count; j++) {
          const t = j / (axis.minorTicks.count + 1),
            ratio = major[i - 1]!.ratio * (1 - t) + major[i]!.ratio * t;
          const value = scale.numeric
            ? scale.numeric.invert(ratio)
            : major[i - 1]!.value * (1 - t) + major[i]!.value * t;
          if (Number.isFinite(value)) minor.push({ value, ratio });
        }
    }
    plan = { major, minor };
  } else plan = fallback();
  if (advanced?.link && !advanced.ticks?.minor && scale.numeric)
    plan.minor = plan.minor.map((t) => ({
      ...t,
      value: scale.numeric!.invert(t.ratio),
    }));
  if (advanced?.ticks?.minor)
    plan = { ...plan, minor: mapped(positions(advanced.ticks.minor)) };
  const majors = new Map(plan.major.map((t) => [t.value, t]));
  for (const special of advanced?.specialTicks ?? []) {
    const value =
      special.at === 'min'
        ? scale.min
        : special.at === 'max'
          ? scale.max
          : special.value!;
    if (special.hide) {
      majors.delete(value);
      continue;
    }
    if (
      value < scale.min ||
      value > scale.max ||
      !Number.isFinite(scale.map(value))
    )
      continue;
    majors.set(value, {
      value,
      ratio: scale.map(value),
      special,
      ...(special.label === undefined ? {} : { label: special.label }),
    });
  }
  plan.major = [...majors.values()]
    .sort((a, b) => a.value - b.value)
    .map((tick, index) => {
      const label =
        tick.label ?? advancedAxisLabel(axis, scale, tick.value, index);
      return { ...tick, ...(label === undefined ? {} : { label }) };
    });
  plan.minor = plan.minor.filter((t) => !majors.has(t.value));
  if (plan.major.length + plan.minor.length > LIMIT)
    throw new Error('坐标轴刻度超过10000条');
  return plan;
}
