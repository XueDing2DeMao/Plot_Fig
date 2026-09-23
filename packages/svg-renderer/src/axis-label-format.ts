import { formatNumber } from './geometry.js';
import { compileAxisFormula } from '@plot-fig/figure-schema';

export type AxisLabelFormatOptions = {
  notation?: 'auto' | 'fixed' | 'scientific' | 'engineering';
  precision?: number;
  preciseAuto?: boolean;
  formula?: string;
  prefix?: string;
  suffix?: string;
  divisor?: number;
};

type CompiledLabelFormula = { eval: (value: number) => number };
const formulaCache = new Map<string, CompiledLabelFormula>();

function applyFormula(value: number, expression: string | undefined): number {
  if (expression === undefined) return value;
  let formula = formulaCache.get(expression);
  if (!formula) {
    formula = compileAxisFormula(expression);
    if (formulaCache.size >= 128) formulaCache.clear();
    formulaCache.set(expression, formula);
  }
  const result = formula.eval(value);
  if (!Number.isFinite(result))
    throw new Error('刻度标签公式结果必须为有限数值');
  return result;
}

function affixes(options: AxisLabelFormatOptions) {
  const prefix = options.prefix ?? '',
    suffix = options.suffix ?? '';
  if (Array.from(prefix).length > 1024)
    throw new Error('标签前缀不能超过 1024 个字符');
  if (Array.from(suffix).length > 1024)
    throw new Error('标签后缀不能超过 1024 个字符');
  return { prefix, suffix };
}

export function formatAxisCategoryLabel(
  text: string,
  options: AxisLabelFormatOptions = {},
): string {
  if (options.formula !== undefined)
    throw new Error('分类轴不支持数值刻度标签公式');
  if (
    options.notation === 'engineering' ||
    (options.divisor !== undefined && options.divisor !== 1)
  )
    throw new Error('分类轴不支持工程格式或数值显示除数');
  const { prefix, suffix } = affixes(options);
  return prefix + text + suffix;
}

function engineering(value: number, precision: number): string {
  if (value === 0) return (0).toFixed(precision) + 'e+0';
  const [coefficient, power] = Math.abs(value).toExponential().split('e');
  const exponent = Number(power);
  let engineeringExponent = Math.floor(exponent / 3) * 3;
  const digits = coefficient!.replace('.', '');
  const shift = exponent - engineeringExponent + precision - digits.length + 1;
  let units = BigInt(digits);
  // 在 Number 的规范十进制表示上四舍五入，避免缩放尾数引入额外的二进制误差。
  if (shift >= 0) units *= 10n ** BigInt(shift);
  else {
    const divisor = 10n ** BigInt(-shift);
    units = units / divisor + ((units % divisor) * 2n >= divisor ? 1n : 0n);
  }
  if (units >= 1000n * 10n ** BigInt(precision)) {
    engineeringExponent += 3;
    units = 10n ** BigInt(precision);
  }
  const rounded = String(units).padStart(precision + 1, '0');
  const mantissa = precision
    ? rounded.slice(0, -precision) + '.' + rounded.slice(-precision)
    : rounded;
  return `${value < 0 ? '-' : ''}${mantissa}e${engineeringExponent >= 0 ? '+' : ''}${engineeringExponent}`;
}

// 返回未转义文本；调用方应只在生成 SVG text/tspan 时执行一次 escapeXml。
export function formatAxisLabel(
  value: number,
  options: AxisLabelFormatOptions = {},
): string {
  const precision = options.precision ?? 6;
  if (!Number.isInteger(precision) || precision < 0 || precision > 15)
    throw new Error('标签小数位必须为 0–15 的整数');
  const divisor = options.divisor ?? 1;
  if (!Number.isFinite(divisor) || divisor <= 0)
    throw new Error('标签显示除数必须为有限正数');
  const transformed = applyFormula(value, options.formula);
  const displayed = transformed / divisor;
  if (!Number.isFinite(displayed) || (transformed !== 0 && displayed === 0))
    throw new Error('标签显示值超出浮点范围，请调整显示除数');
  const { prefix, suffix } = affixes(options);
  let text: string;
  if (options.notation === 'fixed') text = displayed.toFixed(precision);
  else if (options.notation === 'scientific')
    text = displayed.toExponential(precision);
  else if (options.notation === 'engineering')
    text = engineering(displayed, precision);
  // 新显示缩放保留有效读数；未缩放的旧自动格式继续使用历史六位小数规则。
  else
    text =
      options.preciseAuto || divisor !== 1
        ? String(displayed)
        : formatNumber(displayed);
  return prefix + text + suffix;
}
