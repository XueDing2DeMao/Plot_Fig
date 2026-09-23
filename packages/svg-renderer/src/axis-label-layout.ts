import type { Rect } from './geometry.js';
import { layoutText } from './text/layout.js';
import { typesetMath } from './text/mathjax-adapter.js';
import { resolveTextFormat } from './text/parse.js';
import type {
  TextContentFormat,
  TextLayoutOptions as SchemaTextLayoutOptions,
} from '@plot-fig/figure-schema';
import type { TextLayout } from './text/types.js';

export type AxisLabelPlacement = {
  text: string;
  fontSizePt?: number;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
};
export type AxisLabelLayoutOptions = {
  fontSizePt: number;
  bold?: boolean;
  italic?: boolean;
  rotation?: number;
  offsetPt?: { x: number; y: number };
  wrapWidthPt?: number;
  overlap?: 'keep' | 'hide';
  lineHeight?: number;
  background?: 'none' | 'white';
  format?: TextContentFormat;
  layout?: SchemaTextLayoutOptions;
  mathIdPrefix?: string;
};
export type AxisLabelLayout = AxisLabelPlacement & {
  rotation: number;
  bold: boolean;
  italic: boolean;
  visible: boolean;
  lines: { text: string; x: number; y: number }[];
  bounds: Rect;
  unrotatedBounds: Rect;
  background: 'none' | 'white';
  sharedLayout: TextLayout;
  renderShared: boolean;
};

function validateOptions(options: AxisLabelLayoutOptions) {
  const {
    fontSizePt,
    wrapWidthPt,
    offsetPt,
    rotation = 0,
    lineHeight = 1.2,
  } = options;
  if (!Number.isFinite(fontSizePt) || fontSizePt <= 0)
    throw new Error('标签字号必须为有限正数');
  if (!Number.isFinite(rotation) || rotation < -180 || rotation > 180)
    throw new Error('标签旋转角度必须为 -180–180 度');
  if (!Number.isFinite(lineHeight) || lineHeight < 0.5 || lineHeight > 5)
    throw new Error('标签行高必须为 0.5–5 倍');
  if (
    wrapWidthPt !== undefined &&
    (!Number.isFinite(wrapWidthPt) || wrapWidthPt <= 0)
  )
    throw new Error('标签换行宽度必须为有限正数');
  if (offsetPt && ![offsetPt.x, offsetPt.y].every(Number.isFinite))
    throw new Error('标签偏移必须为有限数值');
}

function layoutLabel(
  item: AxisLabelPlacement,
  options: AxisLabelLayoutOptions,
): AxisLabelLayout {
  if (item.fontSizePt !== undefined) {
    options = { ...options, fontSizePt: item.fontSizePt };
    validateOptions(options);
  }
  const x = item.x + (options.offsetPt?.x ?? 0),
    y = item.y + (options.offsetPt?.y ?? 0);
  const rotation = options.rotation ?? 0;
  const format = options.format ?? 'auto';
  const resolvedFormat = resolveTextFormat(item.text, format);
  const shared = layoutText(
    item.text,
    {
      fontFamily: 'sans-serif',
      fontSizePt: options.fontSizePt,
      color: '#000000',
      ...(options.bold === undefined ? {} : { bold: options.bold }),
      ...(options.italic === undefined ? {} : { italic: options.italic }),
    },
    {
      x,
      y,
      anchor: item.anchor,
      align:
        options.layout?.align ??
        (item.anchor === 'middle'
          ? 'center'
          : item.anchor === 'end'
            ? 'right'
            : 'left'),
      format,
      wrapMode:
        resolvedFormat === 'plain' && !options.layout ? 'character' : 'word',
      rotation,
      ...(options.layout?.lineHeight === undefined &&
      options.lineHeight === undefined
        ? {}
        : { lineHeight: options.layout?.lineHeight ?? options.lineHeight }),
      ...(options.layout?.wrapWidthPt === undefined &&
      options.wrapWidthPt === undefined
        ? {}
        : { wrapWidthPt: options.layout?.wrapWidthPt ?? options.wrapWidthPt }),
      ...(options.layout?.paddingPt === undefined
        ? {}
        : { paddingPt: options.layout.paddingPt }),
      ...(options.layout?.background === undefined
        ? options.background === 'white'
          ? { background: '#ffffff' }
          : {}
        : { background: options.layout.background }),
      ...(options.layout?.border === undefined
        ? {}
        : { border: options.layout.border }),
      sourcePath: '/axis/tickLabels',
    },
    resolvedFormat !== 'plain'
      ? {
          measureMath: (source, font) =>
            typesetMath(
              source,
              font.fontSizePt,
              options.mathIdPrefix ?? 'axis-label',
            ),
        }
      : {},
  );
  return {
    ...item,
    x,
    y,
    rotation,
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    visible: shared.lines.some((line) => line.text.length > 0),
    background: options.background ?? 'none',
    unrotatedBounds: shared.contentBounds,
    bounds: shared.bounds,
    sharedLayout: shared,
    renderShared: options.layout !== undefined || resolvedFormat !== 'plain',
    lines: shared.lines.map((line) => ({
      text: line.text,
      x,
      y: line.y,
    })),
  };
}

// 碰撞以旋转包围盒在轴屏幕方向上的投影判断，比实际字形交叠更保守。
// O(总字符数 + n log n)：排序后贪心扫描，不依赖 DOM 或字体测量。
export function layoutAxisLabels(
  items: readonly AxisLabelPlacement[],
  options: AxisLabelLayoutOptions,
  direction: 'x' | 'y',
): AxisLabelLayout[] {
  validateOptions(options);
  const result = items.map((item) => layoutLabel(item, options));
  if (options.overlap !== 'hide') return result;
  const sorted = result
    .map((label, index) => ({ label, index }))
    .sort(
      (a, b) => a.label[direction] - b.label[direction] || a.index - b.index,
    );
  let end = -Infinity;
  for (const { label } of sorted) {
    if (!label.visible || label.bounds.width === 0 || label.bounds.height === 0)
      continue;
    const start = label.bounds[direction];
    const tolerance =
      Number.EPSILON * Math.max(1, Math.abs(start), Math.abs(end)) * 8;
    if (Number.isFinite(end) && start < end - tolerance) label.visible = false;
    else
      end = Math.max(
        end,
        start + (direction === 'x' ? label.bounds.width : label.bounds.height),
      );
  }
  return result;
}
