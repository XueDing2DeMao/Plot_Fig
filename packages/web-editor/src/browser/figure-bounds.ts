import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  renderFigureSvg,
  validateFixedAxisTicks,
} from '@plot-fig/svg-renderer';
import { assertTemplate } from '../state/publication-utils.js';
import {
  contentRect,
  fitLayersToBounds,
  fitPageToBounds,
  layerBounds,
  unionBounds,
  type GeometryRect,
} from '../state/page-geometry.js';

function transformed(rect: GeometryRect, matrix: DOMMatrix): GeometryRect {
  const corners = [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height],
  ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
  const x = Math.min(...corners.map((p) => p.x)),
    y = Math.min(...corners.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...corners.map((p) => p.x)) - x,
    height: Math.max(...corners.map((p) => p.y)) - y,
  };
}
function intersect(a: GeometryRect, b: GeometryRect): GeometryRect {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}

// 使用浏览器字体度量；不能以字符数估算旋转标题或不同字体的边界。
export function measureFigureBounds(
  svg: string,
  layersOnly: boolean,
): GeometryRect {
  const root = new DOMParser().parseFromString(svg, 'image/svg+xml')
    .documentElement as unknown as SVGSVGElement;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;left:-100000px;top:0;opacity:0;pointer-events:none';
  root.setAttribute('width', String(root.viewBox.baseVal.width));
  root.setAttribute('height', String(root.viewBox.baseVal.height));
  host.append(root);
  document.body.append(host);
  try {
    const base = root.getCTM();
    if (!base) throw new Error('当前环境无法测量绘图内容');
    const rects: GeometryRect[] = [];
    for (const element of root.querySelectorAll<SVGGraphicsElement>(
      'path,rect,line,text,circle,ellipse,polygon,polyline',
    )) {
      if (
        element.closest('defs') ||
        element.getAttribute('data-role') === 'page-background' ||
        (layersOnly && !element.closest('[data-role="panel"]'))
      )
        continue;
      const style = getComputedStyle(element);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        ((style.fill === 'none' || Number(style.fillOpacity) === 0) &&
          (style.stroke === 'none' || Number(style.strokeOpacity) === 0))
      )
        continue;
      const matrix = element.getCTM();
      if (!matrix) continue;
      const box = element.getBBox();
      const padding =
        style.stroke !== 'none' ? parseFloat(style.strokeWidth) / 2 || 0 : 0;
      let rect = transformed(
        {
          x: box.x - padding,
          y: box.y - padding,
          width: box.width + 2 * padding,
          height: box.height + 2 * padding,
        },
        base.inverse().multiply(matrix),
      );
      for (
        let ancestor: Element | null = element;
        ancestor && ancestor !== root;
        ancestor = ancestor.parentElement
      ) {
        if (
          ancestor.getAttribute('opacity') === '0' ||
          getComputedStyle(ancestor).display === 'none'
        ) {
          rect.width = 0;
          break;
        }
        const id = ancestor
          .getAttribute('clip-path')
          ?.match(/^url\(#(.+)\)$/)?.[1];
        if (!id) continue;
        const clip = Array.from(root.querySelectorAll('clipPath'))
          .find((p) => p.id === id)
          ?.querySelector('rect');
        if (!clip) throw new Error('当前裁剪形状无法用于内容适配');
        const transform = (ancestor as SVGGraphicsElement).getCTM();
        if (transform)
          rect = intersect(
            rect,
            transformed(
              {
                x: clip.x.baseVal.value,
                y: clip.y.baseVal.value,
                width: clip.width.baseVal.value,
                height: clip.height.baseVal.value,
              },
              base.inverse().multiply(transform),
            ),
          );
      }
      if (rect.width > 0 && rect.height > 0) rects.push(rect);
    }
    return unionBounds(rects);
  } finally {
    host.remove();
  }
}

export function fitFigureContent(
  template: FigureTemplate,
  data: DataBindingSet,
  direction: 'page' | 'layers',
  keepAspect: boolean,
): FigureTemplate {
  const measure = (current: FigureTemplate) => {
    const rendered = renderFigureSvg(current, data, { purpose: 'export' });
    if (!rendered.ok)
      throw new Error(rendered.diagnostics.map((d) => d.message).join('；'));
    return unionBounds([
      measureFigureBounds(rendered.svg, direction === 'layers'),
      ...layerBounds(current),
    ]);
  };
  let next = structuredClone(template);
  if (direction === 'page') next = fitPageToBounds(next, measure(next));
  else {
    const target = contentRect(next.page);
    let fitted = false;
    // 字体和线宽不随图层缩放，重新测量以消除这些固定尺寸产生的偏差。
    for (let iteration = 0; iteration < 16; iteration++) {
      next = fitLayersToBounds(next, measure(next), keepAspect);
      const b = measure(next),
        tolerance = 0.2;
      if (
        b.x >= target.x - tolerance &&
        b.y >= target.y - tolerance &&
        b.x + b.width <= target.x + target.width + tolerance &&
        b.y + b.height <= target.y + target.height + tolerance
      ) {
        fitted = true;
        break;
      }
    }
    if (!fitted)
      throw new Error('当前文字和图层无法容纳在边距内，请增大页面或减小边距');
  }
  assertTemplate(next);
  const errors = validateFixedAxisTicks(next);
  if (errors.length) throw new Error(errors.map((e) => e.message).join('；'));
  return next;
}
