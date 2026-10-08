import type { LineStyle } from '@plot-fig/figure-schema';
import type {
  OriginFormatTree,
  OriginNativeReport,
  OriginNativeSnapshot,
} from '../src/templates/origin-native-contract.js';

export type MapContext = {
  snapshot: OriginNativeSnapshot;
  report: OriginNativeReport;
};
export function node(value: unknown): OriginFormatTree {
  if (Array.isArray(value))
    return Object.assign({}, ...value.map(node)) as OriginFormatTree;
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as OriginFormatTree)
    : {};
}
export function leaf(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
export function num(value: unknown, fallback = 0): number {
  const text = leaf(value).trim(),
    result = text === '' ? NaN : Number(text);
  return Number.isFinite(result) && result !== -1.23456789e-300
    ? result
    : fallback;
}
export function yes(value: unknown, fallback = false): boolean {
  return num(value, fallback ? 1 : 0) !== 0;
}
export function warn(c: MapContext, path: string, message: string) {
  if (
    c.report.warnings.length < 500 &&
    !c.report.warnings.some(
      (item) => item.path === path && item.message === message,
    )
  )
    c.report.warnings.push({ path, message });
}
export function color(
  c: MapContext,
  value: unknown,
  path: string,
  fallback = '#000000',
): string {
  const key = leaf(value);
  if (!key || key === '-9') return fallback;
  if (key === '-4') return 'none';
  if (/^#[0-9a-f]{6}$/i.test(key)) return key;
  const mapped = c.snapshot.colors[key];
  if (mapped && /^#[0-9a-f]{6}$/i.test(mapped)) return mapped;
  if (key === '0') return '#000000';
  warn(c, path, `颜色代码 ${key} 未能读取，使用默认颜色`);
  return fallback;
}
export function font(c: MapContext, value: unknown, path: string): string {
  const key = leaf(value, '0'),
    family = c.snapshot.fonts[key];
  if (family?.trim()) return family;
  warn(c, path, `字体代码 ${key} 未能读取，使用 Arial`);
  return 'Arial';
}
export function dash(
  c: MapContext,
  value: unknown,
  path: string,
): LineStyle['dash'] {
  const code = num(value),
    mapped = (['solid', 'dashed', 'dotted', 'dash-dot'] as const)[code];
  if (mapped) return mapped;
  warn(c, path, `线型代码 ${leaf(value)} 暂不支持，使用实线`);
  return 'solid';
}
export function plainText(
  c: MapContext,
  value: unknown,
  path: string,
  fallback: string,
): string {
  const text = leaf(value, fallback);
  if (/%\(|\$\(|\\[A-Za-z]\(|[<>]/.test(text)) {
    warn(c, path, 'Origin 动态替换或富文本未执行，使用静态名称');
    return fallback;
  }
  return text.slice(0, 16384);
}
export function opacity(value: unknown): number {
  return Math.max(0, Math.min(1, 1 - num(value) / 100));
}
export function positive(value: unknown, fallback: number): number {
  const result = num(value, fallback);
  return result > 0 ? result : fallback;
}

export function checkedSnapshot(input: unknown): OriginNativeSnapshot {
  if (Array.isArray(input)) throw new Error('Origin 原生读取结果格式无效');
  const root = node(input) as Record<string, unknown>;
  if (
    root.formatVersion !== 1 ||
    typeof root.originVersion !== 'string' ||
    !Array.isArray(root.layers) ||
    !root.layers.length ||
    root.layers.length > 128
  )
    throw new Error('Origin 原生读取结果格式无效');
  let count = 0;
  function check(value: unknown, depth = 0): void {
    if (++count > 250000 || depth > 40)
      throw new Error('Origin 模板结构超过读取上限');
    if (
      value === null ||
      ['string', 'number', 'boolean'].includes(typeof value)
    )
      return;
    if (Array.isArray(value)) {
      value.forEach((entry) => check(entry, depth + 1));
      return;
    }
    if (typeof value !== 'object') throw new Error('Origin 模板结构无效');
    for (const [key, entry] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key))
        throw new Error('Origin 模板包含无效属性');
      check(entry, depth + 1);
    }
  }
  check(input);
  if (
    !root.page ||
    !root.fonts ||
    !root.colors ||
    !Array.isArray(root.warnings)
  )
    throw new Error('Origin 原生读取结果缺少页面或格式字典');
  const snapshot = input as OriginNativeSnapshot;
  for (const layer of snapshot.layers)
    if (
      typeof layer.name !== 'string' ||
      !layer.format ||
      !Array.isArray(layer.plots) ||
      layer.plots.length > 1024 ||
      !Array.isArray(layer.unsupportedPlotIds)
    )
      throw new Error('Origin 图层结构无效');
  for (const layer of snapshot.layers)
    for (const plot of layer.plots)
      if (
        !plot ||
        !Number.isInteger(plot.plotId) ||
        typeof plot.designations !== 'string' ||
        !plot.format ||
        typeof plot.format !== 'object' ||
        Array.isArray(plot.format)
      )
        throw new Error('Origin 绘图格式无效');
  return snapshot;
}

export function reportScripts(
  c: MapContext,
  value: unknown,
  path: string,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      reportScripts(c, entry, `${path}/${index}`),
    );
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (
      /script|labtalk|python|macro/i.test(key) &&
      typeof entry === 'string' &&
      entry.trim()
    )
      warn(c, `${path}/${key}`, '已忽略 Origin 脚本，导入不会执行脚本');
    else reportScripts(c, entry, `${path}/${key}`);
  }
}
