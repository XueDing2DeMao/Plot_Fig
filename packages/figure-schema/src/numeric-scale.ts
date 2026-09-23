import {
  SPECIAL_SCALE_KINDS,
  specialScaleFunctions,
  type SpecialScaleKind,
  type SpecialScaleOptions,
} from './special-scales.js';
export type NumericScaleKind =
  'linear' | 'log10' | 'ln' | 'log2' | SpecialScaleKind;
export type NumericScaleSpec = {
  kind: NumericScaleKind;
  symLog?: { threshold: number; linearLength: number };
} & SpecialScaleOptions;
export type NumericScaleCapability = {
  spec: NumericScaleSpec;
  canReverse: true;
  /** 数学映射可分段；不表示当前图型已接入断轴。 */
  canSegment: true;
  accepts: (value: number) => boolean;
  forward: (value: number) => number;
  inverse: (value: number) => number;
};
export type NumericScale = {
  capability: NumericScaleCapability;
  min: number;
  max: number;
  reverse: boolean;
  map: (value: number) => number;
  invert: (ratio: number) => number;
};
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function validateNumericScaleSpec(
  value: unknown,
): asserts value is NumericScaleSpec {
  if (
    !record(value) ||
    typeof value.kind !== 'string' ||
    !['linear', 'log10', 'ln', 'log2', ...SPECIAL_SCALE_KINDS].includes(
      value.kind,
    ) ||
    Object.keys(value).some(
      (key) => !['kind', 'symLog', 'offset', 'formula', 'values'].includes(key),
    )
  )
    throw new Error('尺度配置无效：请选择线性、Log10、Ln 或 Log2');
  if (value.symLog !== undefined) {
    const sym = value.symLog;
    if (
      !['log10', 'ln', 'log2'].includes(value.kind as string) ||
      !record(sym) ||
      Object.keys(sym).some(
        (key) => !['threshold', 'linearLength'].includes(key),
      ) ||
      typeof sym.threshold !== 'number' ||
      !Number.isFinite(sym.threshold) ||
      sym.threshold <= 0 ||
      typeof sym.linearLength !== 'number' ||
      !Number.isFinite(sym.linearLength) ||
      sym.linearLength <= 0 ||
      sym.linearLength > 100
    )
      throw new Error(
        'SymLog 仅适用于对数尺度；阈值必须为有限正数，线性段长度必须在 (0,100] 内',
      );
  }
}
export function logarithmBase(kind: NumericScaleKind): number {
  return kind === 'log10' ? 10 : kind === 'log2' ? 2 : Math.E;
}
export function numericScaleCapability(
  value: NumericScaleSpec,
): NumericScaleCapability {
  validateNumericScaleSpec(value);
  const spec = structuredClone(value),
    sym = spec.symLog;
  if (SPECIAL_SCALE_KINDS.includes(spec.kind as SpecialScaleKind)) {
    const f = specialScaleFunctions(spec.kind as SpecialScaleKind, spec);
    return {
      spec,
      canReverse: true,
      canSegment: true,
      accepts: f.accepts,
      forward: (x) => (f.accepts(x) ? f.forward(x) : NaN),
      inverse: (x) => {
        const v = f.inverse(x);
        return Number.isFinite(x) && f.accepts(v) ? v : NaN;
      },
    };
  }
  const log =
    spec.kind === 'log10'
      ? Math.log10
      : spec.kind === 'log2'
        ? Math.log2
        : Math.log;
  const power =
    spec.kind === 'log10'
      ? (x: number) => 10 ** x
      : spec.kind === 'log2'
        ? (x: number) => 2 ** x
        : Math.exp;
  const logBase = Math.log(logarithmBase(spec.kind));
  const accepts = (x: number) =>
    Number.isFinite(x) &&
    (spec.kind === 'linear' || sym !== undefined || x > 0);
  const forward = (x: number) => {
    if (!accepts(x)) return NaN;
    if (spec.kind === 'linear') return x;
    if (!sym) return log(x);
    const a = Math.abs(x),
      sign = Math.sign(x);
    if (a <= sym.threshold)
      return sign * (a / sym.threshold) * sym.linearLength;
    const ratioMinusOne = (a - sym.threshold) / sym.threshold;
    const logarithm = Number.isFinite(ratioMinusOne)
      ? Math.log1p(ratioMinusOne)
      : Math.log(a) - Math.log(sym.threshold);
    return sign * (sym.linearLength + logarithm / logBase);
  };
  const inverse = (x: number) => {
    if (!Number.isFinite(x)) return NaN;
    if (spec.kind === 'linear') return x;
    let result: number;
    if (!sym) result = power(x);
    else {
      const a = Math.abs(x),
        sign = Math.sign(x);
      result =
        a <= sym.linearLength
          ? sign * (a / sym.linearLength) * sym.threshold
          : sign *
            Math.exp(
              Math.log(sym.threshold) + (a - sym.linearLength) * logBase,
            );
    }
    return accepts(result) ? result : NaN;
  };
  return {
    spec,
    canReverse: true,
    canSegment: true,
    accepts,
    forward,
    inverse,
  };
}
export function createNumericScale(
  spec: NumericScaleSpec,
  min: number,
  max: number,
  reverse = false,
): NumericScale {
  const capability = numericScaleCapability(spec);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max)
    throw new Error('尺度范围必须是有限且递增的数值');
  if (!capability.accepts(min) || !capability.accepts(max))
    throw new Error('尺度范围不在有效定义域内，对数尺度要求正数');
  const low = capability.forward(min),
    high = capability.forward(max);
  const pole =
    spec.kind === 'reciprocal'
      ? 0
      : spec.kind === 'offset-reciprocal'
        ? -(spec.offset ?? 273.14)
        : undefined;
  if (pole !== undefined && min <= pole && max >= pole)
    throw new Error('倒数范围不能跨越极点');
  if (!Number.isFinite(low) || !Number.isFinite(high) || low === high)
    throw new Error('尺度范围超出可表示精度或变换后塌缩');
  const map = (value: number) => {
    if (!capability.accepts(value)) return NaN;
    if (value === min) return reverse ? 1 : 0;
    if (value === max) return reverse ? 0 : 1;
    const t = capability.forward(value),
      span = high - low;
    const ratio = Number.isFinite(span)
      ? (t - low) / span
      : (t / 2 - low / 2) / (high / 2 - low / 2);
    return reverse ? 1 - ratio : ratio;
  };
  const invert = (position: number) => {
    if (!Number.isFinite(position)) return NaN;
    const ratio = reverse ? 1 - position : position;
    if (ratio === 0) return min;
    if (ratio === 1) return max;
    const t = low * (1 - ratio) + high * ratio;
    return capability.inverse(t);
  };
  return { capability, min, max, reverse, map, invert };
}
