import { formatNumber as n } from './geometry.js';
import { lineDash } from './plot-style.js';
import type { LineStyle } from '@plot-fig/figure-schema';

export type LineAppearance = Pick<
  LineStyle,
  'dash' | 'cap' | 'join' | 'miterLimit' | 'opacity' | 'customDash'
>;

export function hasLineAppearance(style: LineAppearance): boolean {
  return [
    style.cap,
    style.join,
    style.miterLimit,
    style.opacity,
    style.customDash,
  ].some((value) => value !== undefined);
}

function bounded(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${label}必须是 ${min}–${max} 范围内的有限数值`);
}

function validatePattern(lengths: number[]) {
  if (
    !Array.isArray(lengths) ||
    lengths.length < 2 ||
    lengths.length > 16 ||
    lengths.length % 2
  )
    throw new Error('自定义虚线需填写 2–16 个数，按线段、间隔成对排列');
  for (const value of lengths) bounded(value, 0.1, 1000, '虚线线段和间隔 (pt)');
}

/** 空白表示恢复预设；输入中的不完整数字、空项不能静默丢弃。 */
export function parseCustomDash(text: string): number[] | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const groups = trimmed.replaceAll('，', ',').split(',');
  if (groups.some((group) => !group.trim()))
    throw new Error('虚线序列中有未完成的数值');
  const tokens = groups.flatMap((group) => group.trim().split(/\s+/));
  if (
    tokens.some(
      (token) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(token),
    )
  )
    throw new Error('请填写完整的虚线数值，可用逗号或空格分隔');
  const values = tokens.map(Number);
  validatePattern(values);
  return values;
}

/** 仅返回描边属性，不会把线透明度施加到符号、误差棒、填充或整个图层。 */
export function lineAppearanceAttributes(style: LineAppearance): string {
  let attributes = '';
  if (!['solid', 'dashed', 'dotted', 'dash-dot'].includes(style.dash))
    throw new Error('无效的预设线型');
  if (style.customDash !== undefined) {
    validatePattern(style.customDash.lengthsPt);
    attributes = ` stroke-dasharray="${style.customDash.lengthsPt.map(n).join(' ')}"`;
    if (style.customDash.offsetPt !== undefined) {
      bounded(style.customDash.offsetPt, -10000, 10000, '虚线偏移 (pt)');
      attributes += ` stroke-dashoffset="${n(style.customDash.offsetPt)}"`;
    }
  } else attributes = lineDash(style.dash);
  if (style.cap !== undefined) {
    if (!['butt', 'round', 'square'].includes(style.cap))
      throw new Error('无效的线端形状');
    attributes += ` stroke-linecap="${style.cap}"`;
  }
  if (style.join !== undefined) {
    if (!['miter', 'round', 'bevel'].includes(style.join))
      throw new Error('无效的拐角形状');
    attributes += ` stroke-linejoin="${style.join}"`;
  }
  if (style.miterLimit !== undefined) {
    bounded(style.miterLimit, 1, 100, '尖角限制');
    attributes += ` stroke-miterlimit="${n(style.miterLimit)}"`;
  }
  if (style.opacity !== undefined) {
    bounded(style.opacity, 0, 1, '线条不透明度');
    attributes += ` stroke-opacity="${n(style.opacity)}"`;
  }
  return attributes;
}
