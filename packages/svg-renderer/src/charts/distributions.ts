import { quantile, sampleSummary } from './box-statistics.js';

export type DistributionOptions = {
  kind:
    | 'normal'
    | 'lognormal'
    | 'weibull'
    | 'exponential'
    | 'gamma'
    | 'laplace'
    | 'lorentz'
    | 'kde'
    | 'poisson'
    | 'binomial';
  parameters?: Record<string, number>;
  samples?: number;
  extendPercent?: number;
  bandwidth?: { method: 'scott' | 'silverman' | 'custom'; value?: number };
};

export function logGamma(z: number): number {
  const c = [
    676.5203681218851, -1259.139216722403, 771.3234287776531,
    -176.6150291621406, 12.50734327868691, -0.13857109526572012,
    9.984369578019572e-6, 1.505632735149312e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  z--;
  let x = 0.9999999999998099;
  c.forEach((value, index) => (x += value / (z + index + 1)));
  const t = z + c.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}

function positive(value: number, name: string) {
  if (!(value > 0) || !Number.isFinite(value))
    throw new Error(`${name}必须是有限正数`);
  return value;
}

function required(
  parameters: Record<string, number>,
  key: string,
  name: string,
) {
  const value = parameters[key];
  if (!Number.isFinite(value)) throw new Error(`${name}必须显式填写有限数值`);
  return value!;
}

export function densityFunction(input: number[], options: DistributionOptions) {
  const summary = sampleSummary(input),
    parameters = options.parameters ?? {},
    normalizer = 1 / Math.sqrt(2 * Math.PI);
  let bandwidth = 0;
  let pdf: (x: number) => number;
  switch (options.kind) {
    case 'normal': {
      const location = required(parameters, 'mu', '位置 μ'),
        sd = positive(required(parameters, 'sigma', '标准差 σ'), '标准差');
      pdf = (x) =>
        (normalizer / sd) * Math.exp(-0.5 * ((x - location) / sd) ** 2);
      break;
    }
    case 'lognormal': {
      const mu = required(parameters, 'mu', '对数位置 μ'),
        sd = positive(
          required(parameters, 'sigma', '对数标准差 σ'),
          '对数标准差',
        );
      pdf = (x) =>
        x <= 0
          ? 0
          : (normalizer / (x * sd)) *
            Math.exp(-0.5 * ((Math.log(x) - mu) / sd) ** 2);
      break;
    }
    case 'weibull': {
      const k = positive(required(parameters, 'shape', '形状 k'), '形状'),
        lambda = positive(required(parameters, 'scale', '尺度 λ'), '尺度');
      pdf = (x) =>
        x <= 0
          ? 0
          : (k / lambda) *
            (x / lambda) ** (k - 1) *
            Math.exp(-((x / lambda) ** k));
      break;
    }
    case 'exponential': {
      const mean = positive(required(parameters, 'scale', '均值/尺度'), '均值');
      pdf = (x) => (x < 0 ? 0 : Math.exp(-x / mean) / mean);
      break;
    }
    case 'gamma': {
      const a = positive(required(parameters, 'shape', '形状 α'), '形状'),
        b = positive(required(parameters, 'scale', '尺度 β'), '尺度');
      pdf = (x) =>
        x <= 0
          ? 0
          : Math.exp(
              (a - 1) * Math.log(x) - x / b - logGamma(a) - a * Math.log(b),
            );
      break;
    }
    case 'laplace': {
      const location = required(parameters, 'mu', '位置 μ'),
        b = positive(required(parameters, 'scale', '尺度 b'), '尺度');
      pdf = (x) => Math.exp(-Math.abs(x - location) / b) / (2 * b);
      break;
    }
    case 'lorentz': {
      const location = required(parameters, 'mu', '位置 x₀'),
        gamma = positive(required(parameters, 'scale', '尺度 γ'), '尺度');
      pdf = (x) => 1 / (Math.PI * gamma * (1 + ((x - location) / gamma) ** 2));
      break;
    }
    case 'poisson': {
      const lambda = positive(required(parameters, 'lambda', '期望 λ'), 'λ');
      pdf = (x) =>
        x < 0 || !Number.isInteger(x)
          ? 0
          : Math.exp(x * Math.log(lambda) - lambda - logGamma(x + 1));
      break;
    }
    case 'binomial': {
      const trials = required(parameters, 'trials', '试验次数 n'),
        probability = required(parameters, 'p', '成功概率 p');
      if (!Number.isInteger(trials) || trials < 1 || trials > 10_000)
        throw new Error('二项分布试验次数必须是1–10000的整数');
      if (!(probability >= 0 && probability <= 1))
        throw new Error('二项分布概率必须在0–1之间');
      pdf = (x) => {
        if (x < 0 || x > trials || !Number.isInteger(x)) return 0;
        if (probability === 0) return x === 0 ? 1 : 0;
        if (probability === 1) return x === trials ? 1 : 0;
        return Math.exp(
          logGamma(trials + 1) -
            logGamma(x + 1) -
            logGamma(trials - x + 1) +
            x * Math.log(probability) +
            (trials - x) * Math.log1p(-probability),
        );
      };
      break;
    }
    case 'kde': {
      const method = options.bandwidth?.method ?? 'scott',
        robust = Math.min(
          summary.sd,
          (quantile(summary.values, 0.75) - quantile(summary.values, 0.25)) /
            1.349,
        );
      bandwidth = positive(
        method === 'custom'
          ? (options.bandwidth?.value ?? NaN)
          : (method === 'scott' ? 0.9 : 1.059) *
              (robust > 0 ? robust : summary.sd) *
              input.length ** -0.2,
        'KDE带宽（常量样本请选择自定义带宽）',
      );
      const h = bandwidth;
      pdf = (x) =>
        (input.reduce(
          (sum, value) => sum + Math.exp(-0.5 * ((x - value) / h) ** 2),
          0,
        ) *
          normalizer) /
        (input.length * h);
      break;
    }
  }
  return { pdf, bandwidth, summary };
}

export function densityCurve(
  input: number[],
  options: DistributionOptions,
  range?: [number, number],
) {
  const { pdf, bandwidth, summary } = densityFunction(input, options),
    discrete = options.kind === 'poisson' || options.kind === 'binomial',
    parameters = options.parameters ?? {},
    extendFactor = (options.extendPercent ?? 300) / 100;
  let support: [number, number];
  switch (options.kind) {
    case 'normal':
    case 'laplace':
    case 'lorentz': {
      const location = parameters.mu!,
        scale =
          options.kind === 'normal' ? parameters.sigma! : parameters.scale!,
        tail = extendFactor * scale;
      support = [
        Math.min(summary.min, location) - tail,
        Math.max(summary.max, location) + tail,
      ];
      break;
    }
    case 'lognormal':
      support = [
        0,
        Math.max(
          summary.max,
          Math.exp(parameters.mu! + extendFactor * parameters.sigma!),
        ),
      ];
      break;
    case 'weibull':
      support = [
        0,
        Math.max(
          summary.max,
          parameters.scale! * Math.max(1, 1 + extendFactor),
        ),
      ];
      break;
    case 'exponential':
      support = [
        0,
        Math.max(
          summary.max,
          parameters.scale! * Math.max(1, 1 + extendFactor),
        ),
      ];
      break;
    case 'gamma':
      support = [
        0,
        Math.max(
          summary.max,
          parameters.shape! * parameters.scale! +
            extendFactor * parameters.scale!,
        ),
      ];
      break;
    case 'poisson':
      support = [
        0,
        Math.ceil(
          Math.max(
            summary.max,
            parameters.lambda! + extendFactor * Math.sqrt(parameters.lambda!),
          ),
        ),
      ];
      break;
    case 'binomial':
      support = [0, parameters.trials!];
      break;
    case 'kde': {
      const tail = extendFactor * bandwidth;
      support = [summary.min - tail, summary.max + tail];
      break;
    }
  }
  let low = range?.[0] ?? support[0],
    high = range?.[1] ?? support[1];
  if (low === high) {
    const half = bandwidth || summary.sd || Math.max(1, Math.abs(low) * 0.01);
    low -= half;
    high += half;
  }
  const count = discrete
    ? Math.floor(high) - Math.ceil(low) + 1
    : (options.samples ?? 256);
  if (!Number.isFinite(low) || !Number.isFinite(high) || !(high > low))
    throw new Error('分布支持范围无效');
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    count > 2000 ||
    (options.kind === 'kde' && count * input.length > 5_000_000)
  )
    throw new Error('分布采样超过计算预算');
  return Array.from({ length: count }, (_, index) => {
    const x = discrete
        ? Math.ceil(low) + index
        : low * (1 - index / (count - 1)) + high * (index / (count - 1)),
      y = pdf(x);
    if (!Number.isFinite(y) || y < 0) throw new Error('分布密度超出有限范围');
    return { x, y };
  });
}
