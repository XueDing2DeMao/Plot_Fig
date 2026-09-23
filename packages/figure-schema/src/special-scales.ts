import { validateFormulaPair, type FormulaPair } from './restricted-formula.js';
export type SpecialScaleKind =
  | 'probability'
  | 'probit'
  | 'reciprocal'
  | 'offset-reciprocal'
  | 'logit'
  | 'weibull'
  | 'discrete'
  | 'custom';
export type SpecialScaleOptions = {
  offset?: number;
  formula?: FormulaPair;
  values?: number[];
};
export const SPECIAL_SCALE_KINDS: readonly SpecialScaleKind[] = [
  'probability',
  'probit',
  'reciprocal',
  'offset-reciprocal',
  'logit',
  'weibull',
  'discrete',
  'custom',
];
function normalCdf(x: number): number {
  if (x === 0) return 0.5;
  const z = Math.abs(x);
  let tail: number;
  if (z < 5) {
    let term = z,
      sum = z;
    for (let k = 1; k < 200; k++) {
      term *= (z * z) / (2 * k + 1);
      const next = sum + term;
      if (next === sum) break;
      sum = next;
    }
    tail = 0.5 - (sum * Math.exp((-z * z) / 2)) / Math.sqrt(2 * Math.PI);
  } else {
    let denominator = 0;
    for (let k = 100; k >= 1; k--) denominator = k / (z + denominator);
    tail = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI) / (z + denominator);
  }
  return x < 0 ? tail : 1 - tail;
}
function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) return NaN;
  if (p === 0.5) return 0;
  // 用较小尾概率求解，避免上尾连续相减造成精度丢失。
  const q = p > 0.5 ? 1 - p : p;
  let lo = -39,
    hi = 0;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < q) lo = mid;
    else hi = mid;
  }
  return ((p > 0.5 ? -1 : 1) * (lo + hi)) / 2;
}
function discrete(values: number[]) {
  const sorted = [...new Set(values.filter(Number.isFinite))].sort(
    (a, b) => a - b,
  );
  if (sorted.length < 2 || sorted.length > 100000)
    throw new Error('Discrete需要2–100000个不同的有限数值');
  const forward = (x: number) => {
    let lo = 0,
      hi = sorted.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid]! <= x) lo = mid;
      else hi = mid;
    }
    return lo + (x - sorted[lo]!) / (sorted[hi]! - sorted[lo]!);
  };
  const inverse = (x: number) => {
    const i = Math.max(0, Math.min(sorted.length - 2, Math.floor(x)));
    return sorted[i]! + (x - i) * (sorted[i + 1]! - sorted[i]!);
  };
  return { forward, inverse };
}
export function specialScaleFunctions(
  kind: SpecialScaleKind,
  options: SpecialScaleOptions,
) {
  const offset = options.offset ?? 273.14;
  if (!Number.isFinite(offset)) throw new Error('倒数偏移必须有限');
  let accepts: (x: number) => boolean,
    forward: (x: number) => number,
    inverse: (x: number) => number;
  if (kind === 'probability' || kind === 'probit') {
    accepts = (x) => x > 0 && x < 100;
    forward = (x) => normalQuantile(x / 100) + (kind === 'probit' ? 5 : 0);
    inverse = (x) => 100 * normalCdf(x - (kind === 'probit' ? 5 : 0));
  } else if (kind === 'logit') {
    accepts = (x) => x > 0 && x < 100;
    forward = (x) => Math.log(x) - Math.log(100 - x);
    inverse = (x) =>
      x >= 0
        ? 100 / (1 + Math.exp(-x))
        : (100 * Math.exp(x)) / (1 + Math.exp(x));
  } else if (kind === 'weibull') {
    accepts = (x) => x > 0 && x < 1;
    forward = (x) => Math.log(-Math.log1p(-x));
    inverse = (x) => -Math.expm1(-Math.exp(x));
  } else if (kind === 'reciprocal' || kind === 'offset-reciprocal') {
    const shift = kind === 'reciprocal' ? 0 : offset;
    accepts = (x) => x !== -shift;
    forward = (x) => 1 / (x + shift);
    inverse = (x) => 1 / x - shift;
  } else if (kind === 'discrete') {
    const f = discrete(options.values ?? [0, 1]);
    accepts = () => true;
    forward = f.forward;
    inverse = f.inverse;
  } else {
    if (!options.formula) throw new Error('请填写公式和定义域');
    const f = validateFormulaPair(options.formula);
    accepts = (x) => x >= options.formula!.min && x <= options.formula!.max;
    forward = f.forward;
    inverse = f.inverse;
  }
  return {
    accepts: (x: number) => Number.isFinite(x) && accepts(x),
    forward,
    inverse,
  };
}
