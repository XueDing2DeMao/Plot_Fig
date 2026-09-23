export type QuantileMethod = 'type7' | 'type1' | 'type2' | 'linear';

export function quantile(
  sorted: number[],
  p: number,
  method: QuantileMethod = 'type7',
): number {
  if (!sorted.length || p < 0 || p > 1)
    throw new Error('分位数需要非空样本及0–1的概率');
  if (p === 0) return sorted[0]!;
  if (p === 1) return sorted.at(-1)!;
  const at = (i: number) =>
    sorted[Math.max(0, Math.min(sorted.length - 1, i))]!;
  if (method === 'type1') return at(Math.ceil(p * sorted.length) - 1);
  if (method === 'type2') {
    const h = p * sorted.length;
    return Number.isInteger(h) ? (at(h - 1) + at(h)) / 2 : at(Math.ceil(h) - 1);
  }
  const h = (sorted.length - 1) * p,
    i = Math.floor(h),
    f = h - i;
  return at(i) * (1 - f) + at(i + 1) * f;
}

/** Inverse standard-normal CDF using Peter J. Acklam's rational approximation. */
export function normalQuantile(probability: number): number {
  if (!(probability > 0 && probability < 1))
    throw new Error('正态分位概率必须在0–1之间');
  const a = [
      -39.69683028665376, 220.9460984245205, -275.9285104469687,
      138.357751867269, -30.66479806614716, 2.506628277459239,
    ],
    b = [
      -54.47609879822406, 161.5858368580409, -155.6989798598866,
      66.80131188771972, -13.28068155288572,
    ],
    c = [
      -0.007784894002430293, -0.3223964580411365, -2.400758277161838,
      -2.549732539343734, 4.374664141464968, 2.938163982698783,
    ],
    d = [
      0.007784695709041462, 0.3224671290700398, 2.445134137142996,
      3.754408661907416,
    ],
    low = 0.02425,
    high = 1 - low;
  if (probability < low) {
    const q = Math.sqrt(-2 * Math.log(probability));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) *
        q +
        c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (probability > high) {
    const q = Math.sqrt(-2 * Math.log(1 - probability));
    return -(
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) *
        q +
        c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  const q = probability - 0.5,
    r = q * q;
  return (
    (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) *
      r +
      a[5]!) *
    q /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) *
      r +
      1)
  );
}

export function sampleSummary(input: number[]) {
  if (!input.length || input.some((v) => !Number.isFinite(v)))
    throw new Error('统计样本必须是非空有限数值');
  const values = [...input].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value / values.length, 0);
  const sd =
    values.length > 1
      ? Math.sqrt(
          values.reduce(
            (sum, value) => sum + (value - mean) ** 2 / (values.length - 1),
            0,
          ),
        )
      : 0;
  if (!Number.isFinite(mean) || !Number.isFinite(sd))
    throw new Error('样本统计超出有限数值范围');
  return {
    values,
    count: values.length,
    mean,
    sd,
    se: sd / Math.sqrt(values.length),
    min: values[0]!,
    max: values.at(-1)!,
  };
}

export type BoxStatisticsOptions = {
  quantileMethod?: QuantileMethod;
  whisker?: 'outlier' | 'min-max' | 'percentile' | 'sd' | 'se' | 'none';
  boxRange?: 'iqr' | 'min-max' | 'percentile' | 'sd' | 'se';
  low?: number;
  high?: number;
  factor?: number;
  extremeFactor?: number;
};

export function boxSummary(
  input: number[],
  options: BoxStatisticsOptions = {},
) {
  const summary = sampleSummary(input),
    { values } = summary,
    q = (p: number) => quantile(values, p, options.quantileMethod),
    q1 = q(0.25),
    median = q(0.5),
    q3 = q(0.75),
    iqr = q3 - q1,
    factor = options.factor ?? 1.5,
    extremeFactor = options.extremeFactor ?? 3,
    lowP = options.low ?? 5,
    highP = options.high ?? 95;
  if (!(factor > 0) || extremeFactor < factor)
    throw new Error('箱线图倍数无效');
  if (!(lowP >= 0 && highP <= 100 && lowP < highP))
    throw new Error('百分位下限必须小于上限');
  const range = (
    mode: string | undefined,
    fallback: [number, number],
  ): [number, number] => {
    if (mode === 'min-max') return [summary.min, summary.max];
    if (mode === 'percentile') return [q(lowP / 100), q(highP / 100)];
    if (mode === 'sd' || mode === 'se') {
      const delta = factor * summary[mode];
      return [summary.mean - delta, summary.mean + delta];
    }
    return fallback;
  };
  const inside = values.filter(
    (value) => value >= q1 - factor * iqr && value <= q3 + factor * iqr,
  );
  const [low, high] = range(options.whisker, [
    inside[0] ?? q1,
    inside.at(-1) ?? q3,
  ]);
  const [boxLow, boxHigh] = range(options.boxRange, [q1, q3]);
  const outliers = values.filter((value) => value < low || value > high);
  const extremes = outliers.filter(
    (value) =>
      value < q1 - extremeFactor * iqr || value > q3 + extremeFactor * iqr,
  );
  return {
    ...summary,
    q1,
    median,
    q3,
    low,
    high,
    boxLow,
    boxHigh,
    outliers,
    extremes,
    notchLow: median - (1.58 * iqr) / Math.sqrt(values.length),
    notchHigh: median + (1.58 * iqr) / Math.sqrt(values.length),
  };
}
