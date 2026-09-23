export type AxisRangeOptions = {
  scale: 'linear' | 'log10' | 'ln';
  values: readonly number[];
  min?: number;
  max?: number;
  padding?: { minPercent?: number; maxPercent?: number };
  nice?: boolean;
};

function niceLinearStep(span: number, targetIntervals = 5): number | undefined {
  const raw = span / targetIntervals;
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  const exponent = Math.floor(Math.log10(raw));
  const magnitude = 10 ** exponent;
  if (!Number.isFinite(magnitude) || magnitude <= 0) return undefined;
  const fraction = raw / magnitude;
  const factor =
    fraction < Math.SQRT2
      ? 1
      : fraction < Math.sqrt(10)
        ? 2
        : fraction < Math.sqrt(50)
          ? 5
          : 10;
  const step = factor * magnitude;
  return Number.isFinite(step) && step > 0 ? step : undefined;
}

function alignToStep(value: number, step: number, lower: boolean): number {
  const units = value / step;
  if (!Number.isFinite(units)) return value;
  const aligned = (lower ? Math.floor(units) : Math.ceil(units)) * step;
  if (!Number.isFinite(aligned)) return value;
  const normalized = Number(aligned.toPrecision(15));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function validateEndpoint(
  value: number,
  name: 'minimum' | 'maximum',
  logarithmic: boolean,
): void {
  if (!Number.isFinite(value))
    throw new Error(`Axis range ${name} must be finite.`);
  if (logarithmic && value <= 0)
    throw new Error(`Logarithmic axis range ${name} must be positive.`);
}

function validatePadding(percent: number): void {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    throw new Error(
      'Axis range padding must be a finite percentage from 0 to 100.',
    );
}

function validateRange(
  min: number,
  max: number,
  transform: (value: number) => number,
  logarithmic: boolean,
): void {
  validateEndpoint(min, 'minimum', logarithmic);
  validateEndpoint(max, 'maximum', logarithmic);
  if (min >= max)
    throw new Error('Axis range minimum must be less than its maximum.');
  if (!(transform(min) < transform(max)))
    throw new Error(
      'Axis range collapses at the representable scale precision.',
    );
}

function percentageOf(value: number, percent: number): number {
  const product = value * percent;
  // 优先乘后除以保留极小百分比；乘积溢出时再缩小被乘数。
  return Number.isFinite(product) ? product / 100 : (value / 100) * percent;
}

function paddedEndpoint(
  min: number,
  max: number,
  percent: number,
  lower: boolean,
): number {
  const span = max - min;
  // 跨越正负极值时先按比例缩放，避免可表示的边距因跨度相减溢出。
  const padding = Number.isFinite(span)
    ? percentageOf(span, percent)
    : percentageOf(max, percent) - percentageOf(min, percent);
  const result = lower ? min - padding : max + padding;
  // 在尺度空间确认移动，不能把对数逆变换自身的误差视为成功加边距。
  if (!(lower ? result < min : result > max))
    throw new Error(
      `Axis ${lower ? 'minimum' : 'maximum'} padding cannot be represented at this precision.`,
    );
  return result;
}

/** 计算数值轴范围；不包含轴翻转，不修改输入，也不依赖图形持久化格式。 */
export function resolveAxisRange(
  options: AxisRangeOptions,
): { min: number; max: number } | undefined {
  const { scale, values } = options;
  const logarithmic = scale !== 'linear';
  const transform =
    scale === 'log10'
      ? Math.log10
      : scale === 'ln'
        ? Math.log
        : (value: number) => value;
  const invert =
    scale === 'log10'
      ? (value: number) => 10 ** value
      : scale === 'ln'
        ? Math.exp
        : (value: number) => value;
  const minPercent = options.padding?.minPercent ?? 0;
  const maxPercent = options.padding?.maxPercent ?? 0;
  const fixedMin = options.min !== undefined;
  const fixedMax = options.max !== undefined;
  validatePadding(minPercent);
  validatePadding(maxPercent);
  if (fixedMin) validateEndpoint(options.min!, 'minimum', logarithmic);
  if (fixedMax) validateEndpoint(options.max!, 'maximum', logarithmic);

  if (fixedMin && fixedMax) {
    validateRange(options.min!, options.max!, transform, logarithmic);
    return { min: options.min!, max: options.max! };
  }

  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value) || (logarithmic && value <= 0)) continue;
    dataMin = Math.min(dataMin, value);
    dataMax = Math.max(dataMax, value);
  }
  if (dataMin === Infinity) return undefined;

  let min = options.min ?? dataMin;
  let max = options.max ?? dataMax;
  if (min > max)
    throw new Error('Axis range minimum must be less than its maximum.');
  if (min === max) {
    const half = Math.max(0.5, Math.abs(min) * 0.01);
    if (!fixedMin) min = logarithmic ? min / 2 : min - half;
    if (!fixedMax) max = logarithmic ? max * 2 : max + half;
  }
  validateRange(min, max, transform, logarithmic);

  const transformedMin = transform(min);
  const transformedMax = transform(max);
  let paddedMin = min;
  let paddedMax = max;
  // 固定端与 0% 边距直接保留原数，避免对数往返带来无意义误差。
  if (!fixedMin && minPercent > 0) {
    paddedMin = invert(
      paddedEndpoint(transformedMin, transformedMax, minPercent, true),
    );
    if (!(paddedMin < min))
      throw new Error(
        'Axis minimum padding cannot be represented at this precision.',
      );
  }
  if (!fixedMax && maxPercent > 0) {
    paddedMax = invert(
      paddedEndpoint(transformedMin, transformedMax, maxPercent, false),
    );
    if (!(paddedMax > max))
      throw new Error(
        'Axis maximum padding cannot be represented at this precision.',
      );
  }
  if (options.nice && scale === 'linear') {
    const step = niceLinearStep(paddedMax - paddedMin);
    if (step !== undefined) {
      if (!fixedMin) paddedMin = alignToStep(paddedMin, step, true);
      if (!fixedMax) paddedMax = alignToStep(paddedMax, step, false);
    }
  }
  validateRange(paddedMin, paddedMax, transform, logarithmic);
  return { min: paddedMin, max: paddedMax };
}
