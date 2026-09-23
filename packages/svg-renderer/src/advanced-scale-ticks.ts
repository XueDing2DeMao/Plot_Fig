import type { Axis, MajorTickGeneration } from '@plot-fig/figure-schema';
import { logarithmBase, type NumericScale } from './advanced-scale.js';
import { generateMajorTicks, type PlotScale } from './scales.js';
import {
  MAX_AXIS_TICKS,
  planAxisTicks,
  type AxisTickPlan,
  type PlannedTick,
} from './tick-plan.js';
export type NumericTickOptions = {
  major?: MajorTickGeneration;
  minorCount?: number;
  minorVisible?: boolean;
  logPolicy?: 'legacy' | 'logarithmic' | 'origin-log10';
};
function validateOptions(options: NumericTickOptions) {
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    Object.keys(options).some(
      (key) =>
        !['major', 'minorCount', 'minorVisible', 'logPolicy'].includes(key),
    )
  )
    throw new Error('刻度配置字段无效');
  if (
    options.minorCount !== undefined &&
    (!Number.isInteger(options.minorCount) || options.minorCount < 0)
  )
    throw new Error('次刻度数量必须为非负整数');
  if (
    options.minorVisible !== undefined &&
    typeof options.minorVisible !== 'boolean'
  )
    throw new Error('次刻度显隐必须为布尔值');
  if (
    options.logPolicy !== undefined &&
    !['legacy', 'logarithmic', 'origin-log10'].includes(options.logPolicy)
  )
    throw new Error('对数刻度策略无效');
  const g = options.major;
  if (g !== undefined) {
    if (!g || !['auto', 'increment', 'count', 'endpoints'].includes(g.mode))
      throw new Error('主刻度方式无效');
    const keys =
      g.mode === 'increment'
        ? ['mode', 'step', 'anchor']
        : g.mode === 'count'
          ? ['mode', 'count', 'anchor']
          : ['mode'];
    if (Object.keys(g).some((key) => !keys.includes(key)))
      throw new Error('主刻度字段无效');
    if (g.mode === 'increment' && (!Number.isFinite(g.step) || g.step <= 0))
      throw new Error('主刻度增量必须为有限正数');
    if (
      g.mode === 'count' &&
      (!Number.isInteger(g.count) || g.count < 2 || g.count > 1000)
    )
      throw new Error('主刻度数量必须为2–1000的整数');
    if (
      (g.mode === 'increment' || g.mode === 'count') &&
      g.anchor !== undefined &&
      !Number.isFinite(g.anchor)
    )
      throw new Error('主刻度锚点必须为有限数值');
  }
}
function budget(count: number) {
  if (!Number.isFinite(count) || count > MAX_AXIS_TICKS)
    throw new Error(`坐标轴主次刻度总数不能超过 ${MAX_AXIS_TICKS}`);
}
function tickAxis(
  scale: Axis['scale'],
  count: number,
  generation?: MajorTickGeneration,
): Axis {
  return {
    axisId: 'numeric-ticks',
    dimension: 'x',
    position: 'bottom',
    scale,
    visible: true,
    reverse: false,
    range: { mode: 'auto' },
    line: { color: '#000000', widthPt: 1 },
    majorTicks: {
      visible: true,
      lengthPt: 4,
      widthPt: 1,
      ...(generation ? { generation } : {}),
    },
    minorTicks: { visible: true, count, lengthPt: 2, widthPt: 1 },
    tickLabels: {
      visible: true,
      fontFamily: 'sans-serif',
      fontSizePt: 10,
      color: '#000000',
      notation: 'auto',
      precision: 3,
    },
  };
}
function mapped(scale: NumericScale, values: number[]): PlannedTick[] {
  let previous = -Infinity;
  return values.map((value) => {
    const ratio = scale.map(value);
    if (!Number.isFinite(value) || !Number.isFinite(ratio) || value <= previous)
      throw new Error('刻度超出浮点精度，无法表示递增位置');
    previous = value;
    return { value, ratio };
  });
}
function within(scale: NumericScale, value: number) {
  return Number.isFinite(value) && value >= scale.min && value <= scale.max;
}
function automatic(scale: NumericScale): number[] {
  const { spec, forward, inverse } = scale.capability;
  if (!['linear', 'log10', 'ln', 'log2'].includes(spec.kind)) {
    if (spec.kind === 'discrete') {
      const ticks = (spec.values ?? []).filter((v) => within(scale, v));
      budget(ticks.length);
      return ticks.length >= 2 ? ticks : [scale.min, scale.max];
    }
    if (
      spec.kind === 'probability' ||
      spec.kind === 'logit' ||
      spec.kind === 'weibull'
    ) {
      const values = (
        spec.kind === 'weibull'
          ? [
              0.001, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95,
              0.99, 0.999,
            ]
          : [
              0.001, 0.01, 0.1, 1, 2, 5, 10, 20, 30, 50, 70, 80, 90, 95, 98, 99,
              99.9, 99.99, 99.999,
            ]
      ).filter((v) => within(scale, v));
      return values.length >= 2 ? values : [scale.min, scale.max];
    }
    const a = forward(scale.min),
      b = forward(scale.max),
      lo = Math.min(a, b),
      hi = Math.max(a, b);
    let values: number[];
    if (spec.kind === 'probit') {
      budget(Math.floor(hi) - Math.ceil(lo) + 1);
      values = Array.from(
        { length: Math.max(0, Math.floor(hi) - Math.ceil(lo) + 1) },
        (_, i) => inverse(Math.ceil(lo) + i),
      );
      if (values.length < 2) values = generateMajorTicks(lo, hi).map(inverse);
    } else
      values = generateMajorTicks(lo, hi).map((v) =>
        v === a ? scale.min : v === b ? scale.max : inverse(v),
      );
    return values.filter((v) => within(scale, v)).sort((a, b) => a - b);
  }
  if (spec.kind === 'linear') return generateMajorTicks(scale.min, scale.max);
  if (!spec.symLog) {
    const start = Math.ceil(forward(scale.min)),
      end = Math.floor(forward(scale.max));
    budget(end - start + 1);
    const values = Array.from(
      { length: Math.max(0, end - start + 1) },
      (_, i) => inverse(start + i),
    ).filter((v) => within(scale, v));
    return values.length >= 2 ? values : [scale.min, scale.max];
  }
  const { threshold, linearLength } = spec.symLog;
  if (scale.min >= -threshold && scale.max <= threshold)
    return generateMajorTicks(scale.min, scale.max);
  const values: number[] = [];
  const base = logarithmBase(spec.kind);
  if (scale.min <= 0 && scale.max >= 0) values.push(0);
  for (const sign of [-1, 1]) {
    const bound = sign < 0 ? -scale.min : scale.max;
    if (bound < threshold) continue;
    const end = Math.floor(
      Math.abs(forward(sign * bound)) - linearLength + 1e-12,
    );
    budget(values.length + end + 1);
    for (let exponent = 0; exponent <= end; exponent++) {
      const product = threshold * base ** exponent;
      const value =
        Number.isFinite(product) && product > 0
          ? sign * product
          : inverse(sign * (linearLength + exponent));
      if (within(scale, value)) values.push(value);
    }
  }
  values.sort((a, b) => a - b);
  return values.length >= 2 ? values : [scale.min, scale.max];
}
function generated(
  scale: NumericScale,
  generation: MajorTickGeneration | undefined,
): number[] {
  if (!generation || generation.mode === 'auto') return automatic(scale);
  if (generation.mode === 'endpoints') return [scale.min, scale.max];
  const cap = scale.capability,
    low = cap.forward(scale.min),
    high = cap.forward(scale.max);
  const rawAnchor =
    generation.anchor ?? (cap.accepts(0) ? 0 : cap.accepts(1) ? 1 : scale.min);
  if (!cap.accepts(rawAnchor)) throw new Error('主刻度锚点不在尺度定义域内');
  const transformedGeneration = {
    ...generation,
    anchor: cap.forward(rawAnchor),
  };
  const proxy: PlotScale = {
    scale: 'linear',
    min: Math.min(low, high),
    max: Math.max(low, high),
    map: (value) => (value - Math.min(low, high)) / Math.abs(high - low),
  };
  const plan = planAxisTicks(
    tickAxis('linear', 0, transformedGeneration),
    proxy,
  );
  // 保留已有端点，避免变换往返的舍入误差把合法刻度推到绘图区外。
  return plan.major
    .map((t) =>
      t.value === low
        ? scale.min
        : t.value === high
          ? scale.max
          : t.value === transformedGeneration.anchor
            ? rawAnchor
            : cap.inverse(t.value),
    )
    .sort((a, b) => a - b);
}
function isMajor(major: PlannedTick[], value: number): boolean {
  let low = 0,
    high = major.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (major[mid]!.value < value) low = mid + 1;
    else high = mid;
  }
  return [major[low], major[low - 1]].some(
    (t) =>
      t &&
      Math.abs(t.value - value) <=
        Math.max(Math.abs(t.value), Math.abs(value)) * Number.EPSILON * 8,
  );
}
function logarithmicMinor(
  scale: NumericScale,
  major: PlannedTick[],
  count: number,
): PlannedTick[] {
  if (count === 0) return [];
  const cap = scale.capability,
    base = logarithmBase(cap.spec.kind);
  const start = Math.floor(cap.forward(scale.min)),
    end = Math.floor(cap.forward(scale.max));
  const values: number[] = [];
  for (let exponent = start; exponent <= end; exponent++)
    for (let index = 0; index <= count; index++) {
      const coefficient = 1 + (index * (base - 1)) / (count + 1);
      const product = base ** exponent * coefficient;
      const value =
        Number.isFinite(product) && product > 0
          ? product
          : Math.exp(exponent * Math.log(base) + Math.log(coefficient));
      if (within(scale, value) && !isMajor(major, value)) {
        budget(major.length + values.length + 1);
        values.push(value);
      }
    }
  return mapped(scale, values);
}
export function planNumericScaleTicks(
  scale: NumericScale,
  options: NumericTickOptions = {},
): AxisTickPlan {
  validateOptions(options);
  const count = options.minorVisible === false ? 0 : (options.minorCount ?? 0),
    policy = options.logPolicy ?? 'legacy',
    cap = scale.capability;
  if (!Number.isInteger(count) || count < 0)
    throw new Error('次刻度数量必须为非负整数');
  budget(count);
  if (!['legacy', 'logarithmic', 'origin-log10'].includes(policy))
    throw new Error('对数刻度策略无效');
  if (policy !== 'legacy' && (cap.spec.kind === 'linear' || cap.spec.symLog))
    throw new Error('显式对数策略仅适用于普通对数尺度');
  if (policy === 'origin-log10' && cap.spec.kind !== 'log10')
    throw new Error('窄区间策略仅适用于 Log10');
  if (
    policy === 'legacy' &&
    !cap.spec.symLog &&
    ['linear', 'log10', 'ln'].includes(cap.spec.kind)
  ) {
    const legacy: PlotScale = {
      scale: cap.spec.kind,
      min: scale.min,
      max: scale.max,
      map: scale.map,
    };
    return planAxisTicks(tickAxis(cap.spec.kind, count, options.major), legacy);
  }
  const narrow =
    policy === 'origin-log10' &&
    cap.spec.kind === 'log10' &&
    scale.max / scale.min <= 10 * (1 + Number.EPSILON * 8);
  if (narrow) {
    const proxy: PlotScale = {
      scale: 'linear',
      min: scale.min,
      max: scale.max,
      map: (v) => (v - scale.min) / (scale.max - scale.min),
    };
    const raw = planAxisTicks(tickAxis('linear', count, options.major), proxy);
    return {
      major: mapped(
        scale,
        raw.major.map((t) => t.value),
      ),
      minor: mapped(
        scale,
        raw.minor.map((t) => t.value),
      ),
    };
  }
  const major = mapped(scale, generated(scale, options.major));
  budget(major.length);
  if (policy !== 'legacy')
    return { major, minor: logarithmicMinor(scale, major, count) };
  budget(major.length + Math.max(0, major.length - 1) * count);
  const values: number[] = [];
  for (let i = 1; i < major.length; i++)
    for (let j = 1; j <= count; j++) {
      const fraction = j / (count + 1),
        start = cap.forward(major[i - 1]!.value),
        end = cap.forward(major[i]!.value);
      const value = cap.inverse(start * (1 - fraction) + end * fraction);
      if (!(value > major[i - 1]!.value && value < major[i]!.value))
        throw new Error('次刻度间隔超出浮点精度');
      values.push(value);
    }
  return { major, minor: mapped(scale, values) };
}
