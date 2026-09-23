import type { FigureTemplate } from '@plot-fig/figure-schema';
import { preserveFrameLinkGeometry } from './panel-frame-links.js';

type Page = FigureTemplate['page'];
type Length = Page['size']['width'];
export type GeometryUnit = Length['unit'] | '%';
export type GeometryReference = 'page' | 'content';
export type GeometryRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
const points = { mm: 72 / 25.4, cm: 72 / 2.54, in: 72, px: 72 / 96 };

export function normalizeFrame(frame: GeometryRect): GeometryRect {
  const result = { ...frame };
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    if (Math.abs(result[key]) < 1e-12) result[key] = 0;
    if (Math.abs(result[key] - 1) < 1e-12) result[key] = 1;
  }
  if (Math.abs(result.x + result.width - 1) < 1e-12)
    result.width = 1 - result.x;
  if (Math.abs(result.y + result.height - 1) < 1e-12)
    result.height = 1 - result.y;
  return result;
}

export function convertLength(length: Length, unit: Length['unit']): Length {
  return { value: (length.value * points[length.unit]) / points[unit], unit };
}
export function pageRect(page: Page): GeometryRect {
  return {
    x: 0,
    y: 0,
    width: page.size.width.value * points[page.size.width.unit],
    height: page.size.height.value * points[page.size.height.unit],
  };
}
export function contentRect(page: Page): GeometryRect {
  const rect = pageRect(page),
    m = page.margins;
  const result = {
    x: m.left,
    y: m.top,
    width: rect.width - m.left - m.right,
    height: rect.height - m.top - m.bottom,
  };
  if (
    !Object.values(m).every((n) => Number.isFinite(n) && n >= 0) ||
    !(result.width > 0 && result.height > 0)
  )
    throw new Error('图页边距必须为非负数，且两侧边距之和必须小于页面尺寸');
  return result;
}
export function readFrame(
  frame: GeometryRect,
  page: Page,
  unit: GeometryUnit,
  reference: GeometryReference,
): GeometryRect {
  const p = pageRect(page),
    r = reference === 'page' ? p : contentRect(page);
  const x = unit === '%' ? r.width / 100 : points[unit],
    y = unit === '%' ? r.height / 100 : points[unit];
  return {
    x: (frame.x * p.width - r.x) / x,
    y: (frame.y * p.height - r.y) / y,
    width: (frame.width * p.width) / x,
    height: (frame.height * p.height) / y,
  };
}
export function writeFrame(
  value: GeometryRect,
  page: Page,
  unit: GeometryUnit,
  reference: GeometryReference,
): GeometryRect {
  const p = pageRect(page),
    r = reference === 'page' ? p : contentRect(page);
  const x = unit === '%' ? r.width / 100 : points[unit],
    y = unit === '%' ? r.height / 100 : points[unit];
  return normalizeFrame({
    x: (value.x * x + r.x) / p.width,
    y: (value.y * y + r.y) / p.height,
    width: (value.width * x) / p.width,
    height: (value.height * y) / p.height,
  });
}
export function resizePageLayers(
  before: FigureTemplate,
  candidate: FigureTemplate,
  preserve: boolean,
): FigureTemplate {
  if (!preserve) return candidate;
  const a = pageRect(before.page),
    b = pageRect(candidate.page);
  if (
    Math.abs(a.width - b.width) < 1e-9 &&
    Math.abs(a.height - b.height) < 1e-9
  )
    return candidate;
  const next = structuredClone(candidate);
  for (const panel of next.panels) {
    panel.frame.x *= a.width / b.width;
    panel.frame.width *= a.width / b.width;
    panel.frame.y *= a.height / b.height;
    panel.frame.height *= a.height / b.height;
    panel.frame = normalizeFrame(panel.frame);
  }
  return preserveFrameLinkGeometry(next);
}
export function unionBounds(rects: GeometryRect[]): GeometryRect {
  if (!rects.length) throw new Error('没有可适配的绘图内容');
  const x = Math.min(...rects.map((r) => r.x)),
    y = Math.min(...rects.map((r) => r.y));
  const width = Math.max(...rects.map((r) => r.x + r.width)) - x,
    height = Math.max(...rects.map((r) => r.y + r.height)) - y;
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error('绘图内容的尺寸无效');
  return { x, y, width, height };
}
export function layerBounds(template: FigureTemplate): GeometryRect[] {
  const p = pageRect(template.page);
  return template.panels
    .filter((panel) => panel.visible !== false)
    .map(({ frame: f }) => ({
      x: f.x * p.width,
      y: f.y * p.height,
      width: f.width * p.width,
      height: f.height * p.height,
    }));
}
export function fitPageToBounds(
  template: FigureTemplate,
  measured: GeometryRect,
): FigureTemplate {
  const next = structuredClone(template),
    p = pageRect(template.page),
    m = template.page.margins;
  const b = unionBounds([measured, ...layerBounds(template)]);
  const width = b.width + m.left + m.right,
    height = b.height + m.top + m.bottom;
  if (!Object.values(m).every((n) => Number.isFinite(n) && n >= 0))
    throw new Error('图页边距无效');
  next.page.size.width.value = width / points[next.page.size.width.unit];
  next.page.size.height.value = height / points[next.page.size.height.unit];
  const dx = m.left - b.x,
    dy = m.top - b.y;
  for (const panel of next.panels) {
    if (panel.visible === false) continue;
    const f = panel.frame;
    panel.frame = normalizeFrame({
      x: (f.x * p.width + dx) / width,
      y: (f.y * p.height + dy) / height,
      width: (f.width * p.width) / width,
      height: (f.height * p.height) / height,
    });
  }
  for (const annotation of next.annotations) {
    if (annotation.coordinateSpace !== 'page') continue;
    const move = (point: { x: number; y: number }) => ({
      x: (point.x * p.width + dx) / width,
      y: 1 - ((1 - point.y) * p.height + dy) / height,
    });
    if ('position' in annotation)
      annotation.position = move(annotation.position);
    if ('start' in annotation) annotation.start = move(annotation.start);
    if ('end' in annotation) annotation.end = move(annotation.end);
  }
  return preserveFrameLinkGeometry(next);
}
export function fitLayersToBounds(
  template: FigureTemplate,
  bounds: GeometryRect,
  keepAspect: boolean,
): FigureTemplate {
  const next = structuredClone(template),
    p = pageRect(template.page),
    target = contentRect(template.page);
  let sx = target.width / bounds.width,
    sy = target.height / bounds.height;
  if (keepAspect) sx = sy = Math.min(sx, sy);
  const dx = target.x + (target.width - bounds.width * sx) / 2 - bounds.x * sx;
  const dy =
    target.y + (target.height - bounds.height * sy) / 2 - bounds.y * sy;
  for (const panel of next.panels) {
    if (panel.visible === false) continue;
    const f = panel.frame;
    panel.frame = normalizeFrame({
      x: (f.x * p.width * sx + dx) / p.width,
      y: (f.y * p.height * sy + dy) / p.height,
      width: f.width * sx,
      height: f.height * sy,
    });
  }
  return preserveFrameLinkGeometry(next);
}
