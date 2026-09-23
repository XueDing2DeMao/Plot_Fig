import { SaxesParser } from 'saxes';
export const MAX_SVG_BYTES = 8 * 1024 * 1024;
const TAGS = new Set(
  'svg g defs clipPath rect line path circle ellipse polygon polyline text tspan title desc linearGradient stop'.split(
    ' ',
  ),
);
const ATTRS = new Set(
  'xmlns version id x y x1 y1 x2 y2 dx dy width height viewBox cx cy r rx ry d points transform fill stroke fill-opacity stroke-opacity opacity stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule clip-path clipPathUnits font-family font-size font-weight font-style text-anchor dominant-baseline alignment-baseline baseline-shift textLength lengthAdjust preserveAspectRatio role offset stop-color stop-opacity'.split(
    ' ',
  ),
);
function checkAttribute(name: string, value: string) {
  if (!ATTRS.has(name) && !/^data-[\w-]+$|^aria-[\w-]+$/.test(name))
    throw new Error('不支持的 SVG 属性：' + name);
  if (name === 'xmlns' && value !== 'http://www.w3.org/2000/svg')
    throw new Error('SVG 命名空间无效');
  if (
    name === 'stop-color' &&
    !/^(?:#[\da-f]{3,4}|#[\da-f]{6}(?:[\da-f]{2})?|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d.%+\-, /]+\))$/i.test(
      value.trim(),
    )
  )
    throw new Error('不支持的渐变颜色格式');
  if (name === 'clip-path') {
    if (!/^url\(#[A-Za-z_][\w.-]*\)$/.test(value))
      throw new Error('只允许内部裁剪路径');
    return;
  }
  if (
    (name === 'fill' || name === 'stroke') &&
    /^url\(#[A-Za-z_][\w.-]*\)$/.test(value)
  )
    return;
  if (
    /url\s*\(|[\x00-\x08]|javascript:|file:|https?:|@import|\\/i.test(value) &&
    name !== 'xmlns'
  )
    throw new Error('SVG 含外部资源或不支持的样式');
}
export function validateSvg(svg: string) {
  if (typeof svg !== 'string' || Buffer.byteLength(svg) > MAX_SVG_BYTES)
    throw new Error('SVG 超过 8 MiB 或格式无效');
  let count = 0,
    depth = 0,
    transparent = false,
    root: Record<string, string> = {};
  const gradients = new Set<string>(),
    paints = new Set<string>();
  const identifiers = new Set<string>();
  const parser = new SaxesParser({ xmlns: false });
  parser.on('doctype', () => {
    throw new Error('不允许 DTD 和实体');
  });
  parser.on('processinginstruction', () => {
    throw new Error('不允许处理指令');
  });
  parser.on('opentag', (tag) => {
    if (!TAGS.has(tag.name) || ++count > 100000 || ++depth > 32)
      throw new Error('SVG 元素或复杂度超出范围');
    if (count === 1) {
      if (tag.name !== 'svg') throw new Error('根元素必须是 SVG');
      root = tag.attributes;
    }
    const id = tag.attributes.id;
    if (id) {
      if (identifiers.has(id)) throw new Error('SVG 标识符重复');
      identifiers.add(id);
      if (tag.name === 'linearGradient') gradients.add(id);
    }
    for (const [name, value] of Object.entries(tag.attributes)) {
      checkAttribute(name, value);
      if ((name === 'fill' || name === 'stroke') && value.startsWith('url(#'))
        paints.add(value.slice(5, -1));
      if (/^(opacity|fill-opacity|stroke-opacity|stop-opacity)$/.test(name)) {
        const text = value.trim();
        const opacity = text.endsWith('%')
          ? Number(text.slice(0, -1)) / 100
          : Number(text);
        if (!Number.isFinite(opacity)) throw new Error('SVG 透明度无效');
        if (opacity < 1) transparent = true;
      }
      if (
        /^(fill|stroke|stop-color)$/.test(name) &&
        /rgba\(|hsla\(|^#[\da-f]{4}$|^#[\da-f]{8}$|^(?:rgb|hsl)\([^)]*\/|^transparent$/i.test(
          value.trim(),
        )
      )
        transparent = true;
    }
  });
  parser.on('closetag', () => {
    depth--;
  });
  parser.write(svg).close();
  for (const id of paints)
    if (!gradients.has(id))
      throw new Error('填充只能引用当前 SVG 内定义的线性渐变');
  const dimensions = validateDimensions(root);
  return {
    ...dimensions,
    transparent,
    width: root.width!,
    height: root.height!,
    viewBox: root.viewBox!,
  };
}
export type ExportRequest = {
  svg: string;
  format: 'pdf' | 'eps';
  dpi: number;
  textToPath: boolean;
  flattenTransparency: boolean;
};
export function validateRequest(value: unknown): ExportRequest {
  if (!value || typeof value !== 'object') throw new Error('导出请求无效');
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) =>
        !['svg', 'format', 'dpi', 'textToPath', 'flattenTransparency'].includes(
          k,
        ),
    )
  )
    throw new Error('未知导出选项');
  if (
    (v.format !== 'pdf' && v.format !== 'eps') ||
    typeof v.svg !== 'string' ||
    typeof v.textToPath !== 'boolean' ||
    typeof v.flattenTransparency !== 'boolean' ||
    typeof v.dpi !== 'number' ||
    !Number.isInteger(v.dpi) ||
    v.dpi < 72 ||
    v.dpi > 2400
  )
    throw new Error('导出选项无效');
  const meta = validateSvg(v.svg);
  if (v.format === 'eps' && meta.transparent && !v.flattenTransparency)
    throw new Error('EPS 不支持透明度，请明确选择栅格化透明图形或调整为不透明');
  return v as ExportRequest;
}

function validateDimensions(root: Record<string, string>) {
  const box = root.viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !box ||
    box.length !== 4 ||
    !box.every(Number.isFinite) ||
    box[2]! <= 0 ||
    box[3]! <= 0 ||
    Math.max(box[2]!, box[3]!) > 14400
  )
    throw new Error('SVG 尺寸无效或过大');
  const units: Record<string, number> = {
    mm: 72 / 25.4,
    cm: 72 / 2.54,
    in: 72,
    px: 0.75,
    pt: 1,
  };
  const dimensions: Record<string, number> = {};
  for (const key of ['width', 'height']) {
    const match = root[key]?.match(/^(\d+(?:\.\d+)?)(mm|cm|in|px|pt)$/);
    if (!match) throw new Error('需要明确的物理尺寸');
    const size = Number(match[1]) * units[match[2]!]!;
    if (!Number.isFinite(size) || size <= 0 || size > 14400)
      throw new Error('物理尺寸超出范围');
    dimensions[key] = size;
  }
  return { widthPt: dimensions.width!, heightPt: dimensions.height! };
}
