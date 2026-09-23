export type FigureExportOptions = {
  panelIds?: string[];
  transparent?: boolean;
  crop?: boolean;
  padding?: number;
  width?: number;
  height?: number;
};
function parse(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (
    doc.querySelector('parsererror') ||
    doc.documentElement.localName !== 'svg'
  )
    throw new Error('图形 SVG 无效');
  return doc.documentElement as unknown as SVGSVGElement;
}
export function exportLayers(svg: string): string[] {
  return [
    ...parse(svg).querySelectorAll('[data-role="panel"][data-panel-id]'),
  ].map((p) => p.getAttribute('data-panel-id')!);
}
function contentBounds(root: SVGSVGElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  // 挂载到不可见离屏容器，使用浏览器实际字形、公式路径和变换后的 SVG 边界。
  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none';
  const live = document.importNode(root, true);
  host.append(live);
  document.body.append(host);
  try {
    const boxes: { x: number; y: number; width: number; height: number }[] = [];
    const inverse = live.getScreenCTM()?.inverse();
    if (!inverse) throw new Error('浏览器无法测量图形内容');
    const transformBox = (
      b: { x: number; y: number; width: number; height: number },
      m: DOMMatrix,
      pad = 0,
    ) => {
      const points = [
        [b.x - pad, b.y - pad],
        [b.x + b.width + pad, b.y - pad],
        [b.x - pad, b.y + b.height + pad],
        [b.x + b.width + pad, b.y + b.height + pad],
      ].map(([x, y]) => new DOMPoint(x!, y!).matrixTransform(m));
      const x = Math.min(...points.map((p) => p.x)),
        y = Math.min(...points.map((p) => p.y));
      return {
        x,
        y,
        width: Math.max(...points.map((p) => p.x)) - x,
        height: Math.max(...points.map((p) => p.y)) - y,
      };
    };
    const intersect = (
      a: { x: number; y: number; width: number; height: number },
      b: typeof a,
    ) => {
      const x = Math.max(a.x, b.x),
        y = Math.max(a.y, b.y);
      return {
        x,
        y,
        width: Math.min(a.x + a.width, b.x + b.width) - x,
        height: Math.min(a.y + a.height, b.y + b.height) - y,
      };
    };
    for (const el of live.querySelectorAll<SVGGraphicsElement>(
      'path,rect,circle,ellipse,line,polyline,polygon,text,image,use',
    )) {
      if (
        el.closest('defs,clipPath,mask,marker,pattern') ||
        el.getAttribute('data-role') === 'page-background'
      )
        continue;
      const style = getComputedStyle(el);
      if (style.fill === 'none' && style.stroke === 'none') continue;
      const matrix = el.getScreenCTM();
      if (!matrix) continue;
      const b = el.getBBox(),
        pad =
          style.stroke === 'none'
            ? 0
            : (Number.parseFloat(style.strokeWidth) || 0) / 2;
      let bounds = transformBox(b, inverse.multiply(matrix), pad),
        hidden = false;
      for (
        let ancestor: Element | null = el;
        ancestor && ancestor !== live;
        ancestor = ancestor.parentElement
      ) {
        const computed = getComputedStyle(ancestor);
        if (
          computed.display === 'none' ||
          computed.visibility === 'hidden' ||
          computed.opacity === '0'
        ) {
          hidden = true;
          break;
        }
        const graphics = ancestor as SVGGraphicsElement;
        const ctm = graphics.getScreenCTM?.();
        if (!ctm) continue;
        const clipRef = ancestor.getAttribute('clip-path') ?? computed.clipPath;
        const clipId = clipRef?.match(/#([^"')]+)["']?\)/)?.[1];
        const clip = clipId
          ? [...live.querySelectorAll('clipPath')].find((e) => e.id === clipId)
          : undefined;
        if (clip) {
          const rect = clip.querySelector('rect');
          if (
            rect &&
            clip.getAttribute('clipPathUnits') !== 'objectBoundingBox'
          ) {
            const clipTransform = rect.transform.baseVal.consolidate()?.matrix;
            const m = inverse.multiply(ctm);
            bounds = intersect(
              bounds,
              transformBox(
                rect.getBBox(),
                clipTransform ? m.multiply(clipTransform) : m,
              ),
            );
          }
        }
        if (ancestor.localName === 'svg' && computed.overflow !== 'visible') {
          const nested = ancestor as SVGSVGElement,
            view = nested.viewBox.baseVal;
          if (view.width > 0 && view.height > 0)
            bounds = intersect(
              bounds,
              transformBox(view, inverse.multiply(ctm)),
            );
        }
      }
      if (!hidden && bounds.width >= 0 && bounds.height >= 0)
        boxes.push(bounds);
    }
    if (!boxes.length) throw new Error('没有可裁剪的可见内容');
    const x = Math.min(...boxes.map((b) => b.x)),
      y = Math.min(...boxes.map((b) => b.y));
    return {
      x,
      y,
      width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
      height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
    };
  } finally {
    host.remove();
  }
}
export function prepareFigureExport(
  svg: string,
  options: FigureExportOptions = {},
) {
  const root = parse(svg);
  if (options.panelIds) {
    const ids = new Set(options.panelIds);
    if (!ids.size) throw new Error('请至少选择一个图层');
    const selected = [...root.querySelectorAll('[data-role="panel"]')].filter(
      (p) => ids.has(p.getAttribute('data-panel-id') ?? ''),
    );
    if (!selected.length) throw new Error('所选图层已不存在');
    const plotIds = new Set(
      selected.flatMap((p) =>
        [...p.querySelectorAll('[data-plot-slot-id]')].map((e) =>
          e.getAttribute('data-plot-slot-id'),
        ),
      ),
    );
    root.querySelectorAll('[data-role="panel"]').forEach((p) => {
      if (!ids.has(p.getAttribute('data-panel-id') ?? '')) p.remove();
    });
    // 页级跨层图例只保留本次所选曲线的条目。
    root.querySelectorAll('[data-role="legend-entry"]').forEach((e) => {
      const id = e.getAttribute('data-plot-slot-id');
      if (id && !plotIds.has(id)) e.remove();
    });
  }
  if (options.transparent)
    root
      .querySelectorAll('[data-role="page-background"]')
      .forEach((e) => e.remove());
  let box = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    !box ||
    box.length !== 4 ||
    !box.every(Number.isFinite) ||
    box[2]! <= 0 ||
    box[3]! <= 0
  )
    throw new Error('图形尺寸无效');
  if (options.crop) {
    const b = contentBounds(root),
      p = options.padding ?? 4;
    if (!Number.isFinite(p) || p < 0 || p > 1000)
      throw new Error('裁剪留白应为 0–1000 pt');
    box = [
      b.x - p,
      b.y - p,
      Math.max(1, b.width + 2 * p),
      Math.max(1, b.height + 2 * p),
    ];
    root.setAttribute('viewBox', box.join(' '));
    const bg = root.querySelector('[data-role="page-background"]');
    if (bg)
      ['x', 'y', 'width', 'height'].forEach((key, i) =>
        bg.setAttribute(key, String(box![i])),
      );
  }
  const width =
    options.width ??
    (options.height ? Math.round((options.height * box[2]!) / box[3]!) : 2000);
  const height = options.height ?? Math.round((width * box[3]!) / box[2]!);
  if (
    ![width, height].every((v) => Number.isInteger(v) && v > 0 && v <= 8192) ||
    width * height > 32_000_000
  )
    throw new Error('像素尺寸须为 1–8192 的整数，总像素不超过 3200 万');
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  return { svg: new XMLSerializer().serializeToString(root), width, height };
}
