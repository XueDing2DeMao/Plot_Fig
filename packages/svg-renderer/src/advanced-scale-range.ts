import {
  createNumericScale,
  numericScaleCapability,
  type NumericScaleSpec,
} from './advanced-scale.js';
import { resolveAxisRange, type AxisRangeOptions } from './axis-range.js';
export type NumericScaleRangeOptions = Omit<AxisRangeOptions, 'scale'> & {
  spec: NumericScaleSpec;
};
export function resolveNumericScaleRange(
  options: NumericScaleRangeOptions,
): { min: number; max: number } | undefined {
  const cap = numericScaleCapability(options.spec);
  for (const endpoint of [options.min, options.max])
    if (endpoint !== undefined && !cap.accepts(endpoint))
      throw new Error('固定范围端点不在尺度定义域内');
  if (
    !options.spec.symLog &&
    !['linear', 'log10', 'ln', 'log2'].includes(options.spec.kind)
  ) {
    const raw = options.values.filter(
      (v) => cap.accepts(v) && Number.isFinite(cap.forward(v)),
    );
    if (!raw.length && options.min === undefined && options.max === undefined)
      return undefined;
    let rawMin = Infinity,
      rawMax = -Infinity;
    for (const value of raw) {
      rawMin = Math.min(rawMin, value);
      rawMax = Math.max(rawMax, value);
    }
    let low = options.min ?? rawMin,
      high = options.max ?? rawMax;
    if (!Number.isFinite(low)) low = high;
    if (!Number.isFinite(high)) high = low;
    const a = cap.forward(low),
      b = cap.forward(high);
    const decreasing =
      low !== high
        ? a > b
        : cap.inverse(a + Math.max(Math.abs(a) * 0.01, 0.0001)) < low;
    const values = raw.map(cap.forward);
    if (
      low === high &&
      (options.min === undefined || options.max === undefined)
    ) {
      const delta = options.spec.kind.includes('reciprocal')
        ? Math.abs(a) * 0.01
        : 0.5;
      values.push(a - delta, a + delta);
    }
    const result = resolveAxisRange({
      scale: 'linear',
      values,
      ...(options.min === undefined ? {} : { [decreasing ? 'max' : 'min']: a }),
      ...(options.max === undefined ? {} : { [decreasing ? 'min' : 'max']: b }),
      ...(options.padding
        ? {
            padding: decreasing
              ? {
                  ...(options.padding.maxPercent === undefined
                    ? {}
                    : { minPercent: options.padding.maxPercent }),
                  ...(options.padding.minPercent === undefined
                    ? {}
                    : { maxPercent: options.padding.minPercent }),
                }
              : options.padding,
          }
        : {}),
    });
    if (!result) return undefined;
    const min =
      options.min ??
      (result[decreasing ? 'max' : 'min'] === a
        ? low
        : cap.inverse(result[decreasing ? 'max' : 'min']));
    const max =
      options.max ??
      (result[decreasing ? 'min' : 'max'] === b
        ? high
        : cap.inverse(result[decreasing ? 'min' : 'max']));
    createNumericScale(options.spec, min, max);
    return { min, max };
  }
  if (!options.spec.symLog) {
    const result = resolveAxisRange({
      ...options,
      scale: (options.spec.kind === 'log2' ? 'ln' : options.spec.kind) as
        'linear' | 'log10' | 'ln',
    });
    if (result) createNumericScale(options.spec, result.min, result.max);
    return result;
  }
  let rawMin = Infinity,
    rawMax = -Infinity;
  const values: number[] = [];
  for (const value of options.values)
    if (cap.accepts(value)) {
      values.push(cap.forward(value));
      rawMin = Math.min(rawMin, value);
      rawMax = Math.max(rawMax, value);
    }
  const result = resolveAxisRange({
    scale: 'linear',
    values,
    ...(options.min === undefined ? {} : { min: cap.forward(options.min) }),
    ...(options.max === undefined ? {} : { max: cap.forward(options.max) }),
    ...(options.padding ? { padding: options.padding } : {}),
  });
  if (!result) return undefined;
  const min =
    options.min ??
    (rawMin < rawMax && result.min === cap.forward(rawMin)
      ? rawMin
      : cap.inverse(result.min));
  const max =
    options.max ??
    (rawMin < rawMax && result.max === cap.forward(rawMax)
      ? rawMax
      : cap.inverse(result.max));
  createNumericScale(options.spec, min, max);
  return { min, max };
}
