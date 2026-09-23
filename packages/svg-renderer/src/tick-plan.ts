import type { Axis, MajorTickGeneration } from '@plot-fig/figure-schema';
import { generateMajorTicks, type PlotScale } from './scales.js';
import { decimalTickGrid } from './tick-decimal.js';
import { usesIntegerTicks } from './integer-axis.js';

export type PlannedTick = {
  value: number;
  ratio: number;
  label?: string;
  special?: NonNullable<NonNullable<Axis['advanced']>['specialTicks']>[number];
  labelStyle?: {
    notation?: Axis['tickLabels']['notation'];
    precision?: number;
  };
};
export type AxisTickPlan = { major: PlannedTick[]; minor: PlannedTick[] };
export type { MajorTickGeneration } from '@plot-fig/figure-schema';
export const MAX_AXIS_TICKS = 10_000;

function checkBudget(count: number): void {
  if (!Number.isFinite(count) || count > MAX_AXIS_TICKS)
    throw new Error(
      `坐标轴刻度总数不能超过 ${MAX_AXIS_TICKS}，请增大间隔或减少刻度数量`,
    );
}

function automaticValues(scale: PlotScale): number[] {
  if (scale.categories) {
    checkBudget(scale.categories.length);
    return scale.categories.map((_, index) => index);
  }
  if (scale.scale === 'linear')
    return generateMajorTicks(scale.min, scale.max, 6);
  const transform = scale.scale === 'log10' ? Math.log10 : Math.log;
  const inverse =
    scale.scale === 'log10' ? (value: number) => 10 ** value : Math.exp;
  const low = Math.ceil(transform(scale.min));
  const high = Math.floor(transform(scale.max));
  const count = Math.max(0, high - low + 1);
  checkBudget(count);
  if (count < 2) return [scale.min, scale.max];
  return Array.from({ length: count }, (_, index) => inverse(low + index));
}

function countStep(min: number, max: number, count: number): number {
  if (!Number.isInteger(count) || count < 2 || count > 1000)
    throw new Error('主刻度目标数量必须是 2–1000 的整数');
  const raw = max / (count - 1) - min / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  if (!Number.isFinite(raw) || raw <= 0 || magnitude === 0)
    throw new Error('主刻度间隔超出浮点精度范围，请调整坐标范围或目标数量');
  const fraction = raw / magnitude;
  return (
    (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude
  );
}

function gridIndex(value: number, anchor: number, step: number): number {
  const delta = value - anchor;
  const index = Number.isFinite(delta)
    ? delta / step
    : value / step - anchor / step;
  if (!Number.isFinite(index) || Math.abs(index) > Number.MAX_SAFE_INTEGER)
    throw new Error(
      '主刻度格点索引超出安全整数范围，请增大间隔或将锚点移近坐标范围',
    );
  return index;
}

function transformedBounds(
  min: number,
  max: number,
  anchor: number,
  step: number,
): { first: number; last: number } {
  const low = gridIndex(min, anchor, step),
    high = gridIndex(max, anchor, step);
  const tolerance = Math.min(
    1e-7,
    Number.EPSILON * Math.max(1, Math.abs(low), Math.abs(high)) * 4,
  );
  const first = Math.ceil(low - tolerance),
    last = Math.floor(high + tolerance);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last))
    throw new Error('主刻度边界索引超出安全整数范围');
  return { first, last };
}

function gridValues(
  scale: PlotScale,
  generation: Extract<MajorTickGeneration, { mode: 'increment' | 'count' }>,
): number[] {
  const logarithmic = scale.scale === 'log10' || scale.scale === 'ln';
  const transform =
    scale.scale === 'log10'
      ? Math.log10
      : scale.scale === 'ln'
        ? Math.log
        : (value: number) => value;
  const inverse =
    scale.scale === 'log10'
      ? (value: number) => 10 ** value
      : scale.scale === 'ln'
        ? Math.exp
        : (value: number) => value;
  const min = transform(scale.min),
    max = transform(scale.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max)
    throw new Error('主刻度需要有限且递增的坐标范围');
  const dataAnchor = generation.anchor ?? (logarithmic ? 1 : 0);
  if (!Number.isFinite(dataAnchor) || (logarithmic && dataAnchor <= 0))
    throw new Error(
      logarithmic ? '对数主刻度锚点必须是有限正数' : '主刻度锚点必须是有限数值',
    );
  const anchor = transform(dataAnchor);
  const step =
    generation.mode === 'increment'
      ? generation.step
      : countStep(min, max, generation.count);
  if (!Number.isFinite(step) || step <= 0)
    throw new Error('主刻度间隔必须是有限正数');
  const grid = decimalTickGrid(anchor, step);
  const { first, last } = logarithmic
    ? transformedBounds(min, max, anchor, step)
    : grid.bounds(min, max);
  const count = Math.max(0, last - first + 1);
  checkBudget(count);
  const values: number[] = [];
  const boundaryTolerance =
    Number.EPSILON * Math.max(Math.abs(min), Math.abs(max)) * 4;
  for (let index = 0; index < count; index += 1) {
    const gridIndex = first + index;
    const isAnchor = gridIndex === 0;
    if (isAnchor && (dataAnchor < scale.min || dataAnchor > scale.max))
      continue;
    let transformed = grid.value(gridIndex);
    if (!Number.isFinite(transformed))
      throw new Error('主刻度格点超出有限数值范围');
    if (
      !isAnchor &&
      logarithmic &&
      Math.abs(transformed - min) <= boundaryTolerance
    )
      transformed = min;
    else if (
      !isAnchor &&
      logarithmic &&
      Math.abs(transformed - max) <= boundaryTolerance
    )
      transformed = max;
    if (transformed < min || transformed > max) continue;
    const value = isAnchor
      ? dataAnchor
      : transformed === min
        ? scale.min
        : transformed === max
          ? scale.max
          : inverse(transformed);
    if (
      !Number.isFinite(value) ||
      (logarithmic && value <= 0) ||
      (values.length > 0 && value <= values.at(-1)!)
    )
      throw new Error('主刻度间隔过小或超出浮点精度，无法生成递增刻度');
    values.push(Object.is(value, -0) ? 0 : value);
  }
  return values;
}

function majorValues(
  scale: PlotScale,
  generation?: MajorTickGeneration,
): number[] {
  if (!generation || generation.mode === 'auto') return automaticValues(scale);
  if (scale.scale === 'category' || scale.categories)
    throw new Error('分类轴仅支持自动主刻度');
  if (generation.mode === 'endpoints') return [scale.min, scale.max];
  return gridValues(scale, generation);
}

function integerValues(scale: PlotScale): number[] {
  const span = scale.max - scale.min;
  const step = Math.max(
    1,
    Math.ceil(
      Number.isFinite(span)
        ? countStep(0, span, 6)
        : countStep(scale.min, scale.max, 6),
    ),
  );
  if (
    Math.max(Math.abs(scale.min), Math.abs(scale.max)) / step >
    Number.MAX_SAFE_INTEGER
  ) {
    // 大基数的相邻浮点值已是整数，避免零点格网索引溢出。
    return [...new Set(generateMajorTicks(scale.min, scale.max, 6))];
  }
  return gridValues(scale, { mode: 'increment', step });
}

function minorValue(
  scale: PlotScale,
  start: number,
  end: number,
  fraction: number,
): number {
  if (scale.scale === 'log10')
    return (
      10 ** (Math.log10(start) * (1 - fraction) + Math.log10(end) * fraction)
    );
  if (scale.scale === 'ln')
    return Math.exp(
      Math.log(start) * (1 - fraction) + Math.log(end) * fraction,
    );
  return start * (1 - fraction) + end * fraction;
}

function minorTicks(
  axis: Axis,
  scale: PlotScale,
  major: PlannedTick[],
  strict: boolean,
): PlannedTick[] {
  if (
    !axis.minorTicks.visible ||
    axis.minorTicks.count <= 0 ||
    major.length < 2
  )
    return [];
  const count = axis.minorTicks.count;
  if (!Number.isInteger(count)) throw new Error('次刻度数量必须是有限整数');
  checkBudget(major.length + (major.length - 1) * count);
  const minor: PlannedTick[] = [];
  for (let index = 0; index < major.length - 1; index += 1) {
    const start = major[index]!,
      end = major[index + 1]!;
    for (let tick = 1; tick <= count; tick += 1) {
      const fraction = tick / (count + 1);
      const value = minorValue(scale, start.value, end.value, fraction);
      // 保留旧版先映射两端、再插值的浮点运算顺序。
      const ratio = start.ratio + (end.ratio - start.ratio) * fraction;
      if (
        strict &&
        (!Number.isFinite(value) ||
          !Number.isFinite(ratio) ||
          value <= start.value ||
          value >= end.value ||
          (minor.length > 0 && value <= minor.at(-1)!.value))
      )
        throw new Error('次刻度间隔超出浮点精度，无法表示主刻度之间的递增数值');
      minor.push({
        value,
        ratio,
      });
    }
  }
  return minor;
}

export function planAxisTicks(
  axis: Axis,
  scale: PlotScale,
  generation: MajorTickGeneration | undefined = axis.majorTicks.generation,
): AxisTickPlan {
  if (axis.advanced || scale.segments) {
    const { advanced, ...plain } = axis;
    return extendedTickPlan(axis, scale, generation, () =>
      plainAxisTicks(
        plain,
        scale,
        generation,
        usesIntegerTicks(axis, generation),
      ),
    );
  }
  return plainAxisTicks(
    axis,
    scale,
    generation,
    usesIntegerTicks(axis, generation),
  );
}

function plainAxisTicks(
  axis: Axis,
  scale: PlotScale,
  generation: MajorTickGeneration | undefined,
  integer: boolean,
): AxisTickPlan {
  if (isAdvancedAxis(axis))
    return planNumericScaleTicks(
      scale.numeric ??
        createNumericScale(
          axisScaleSpec(axis),
          scale.min,
          scale.max,
          axis.reverse,
        ),
      {
        ...(generation ? { major: generation } : {}),
        minorCount: axis.minorTicks.count,
        minorVisible: axis.minorTicks.visible,
        logPolicy: axis.logTicks?.mode ?? 'legacy',
      },
    );
  const values =
    integer && !scale.categories
      ? integerValues(scale)
      : majorValues(scale, generation);
  const major = values.map((value) => ({
    value,
    ratio: scale.map(value),
  }));
  checkBudget(major.length);
  return {
    major,
    minor: minorTicks(
      axis,
      scale,
      major,
      generation !== undefined && generation.mode !== 'auto',
    ),
  };
}
import {
  isAdvancedAxis,
  axisScaleSpec,
  createNumericScale,
} from '@plot-fig/figure-schema';
import { planNumericScaleTicks } from './advanced-scale-ticks.js';
import { extendedTickPlan } from './axis-advanced-ticks.js';
