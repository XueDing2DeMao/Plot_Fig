import {
  defaultLegendLayout,
  type Annotation,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { templateIdentifiers } from './series-operations.js';

export type CanvasPoint = { x: number; y: number };
export type CanvasScreenMatrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};
type Rect = CanvasPoint & { width: number; height: number };
export type CanvasAnnotationCoordinates = {
  page: Rect;
  panels: ReadonlyMap<string, { rect: Rect }>;
};
export type MovableAnnotation = Extract<
  Annotation,
  { kind: 'text' | 'legend'; coordinateSpace: 'page' | 'panel' }
>;

const finitePoint = (point: CanvasPoint) =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

/** 使用根 SVG 的 getScreenCTM，包含 CSS 缩放及 preserveAspectRatio 留白。 */
export function cssPointToSvg(
  point: CanvasPoint,
  matrix: CanvasScreenMatrix,
): CanvasPoint | null {
  return cssDeltaToSvg(
    { x: point.x - matrix.e, y: point.y - matrix.f },
    matrix,
  );
}

export function cssDeltaToSvg(
  delta: CanvasPoint,
  matrix: CanvasScreenMatrix,
): CanvasPoint | null {
  const { a, b, c, d, e, f } = matrix;
  if (!finitePoint(delta) || ![a, b, c, d, e, f].every(Number.isFinite))
    return null;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || determinant === 0) return null;
  const point = {
    x: (d * delta.x - c * delta.y) / determinant,
    y: (a * delta.y - b * delta.x) / determinant,
  };
  return finitePoint(point) ? point : null;
}

export function movableAnnotation(
  template: FigureTemplate,
  annotationId: string,
  implicitPanelId?: string,
): MovableAnnotation | null {
  if (implicitPanelId !== undefined) {
    // DOM 的显式标记区分合成图例，不能仅根据 auto-* 名字猜测。
    const panel = template.panels.find((p) => p.panelId === implicitPanelId);
    if (
      !panel ||
      panel.visible === false ||
      template.annotations.some(
        (a) =>
          a.kind === 'legend' &&
          (a.coordinateSpace === 'panel'
            ? a.panelId === implicitPanelId
            : !a.layout?.plotSlotIds ||
              panel.plotSlots.some((plot) =>
                a.layout!.plotSlotIds!.includes(plot.plotSlotId),
              )),
      )
    )
      return null;
    const plotSlotIds = panel.plotSlots
      .filter((plot) => plot.visible !== false && plot.legendEntry.visible)
      .map((plot) => plot.plotSlotId);
    if (!plotSlotIds.length) return null;
    return {
      annotationId,
      kind: 'legend',
      coordinateSpace: 'panel',
      panelId: implicitPanelId,
      visible: true,
      position: { x: 1, y: 1 },
      // 显式图例默认会纳入隐藏的图例项，固定原来的候选项避免拖动改变内容。
      layout: { ...defaultLegendLayout(), plotSlotIds },
    };
  }
  const annotation = template.annotations.find(
    (a) => a.annotationId === annotationId,
  );
  if (
    !annotation ||
    (annotation.kind !== 'text' && annotation.kind !== 'legend') ||
    annotation.coordinateSpace === 'data' ||
    annotation.visible === false ||
    !finitePoint(annotation.position)
  )
    return null;
  if (
    annotation.coordinateSpace === 'panel' &&
    !template.panels.some(
      (panel) =>
        panel.panelId === annotation.panelId && panel.visible !== false,
    )
  )
    return null;
  return annotation;
}

export function annotationPositionBySvgDelta(
  template: FigureTemplate,
  coordinates: CanvasAnnotationCoordinates,
  annotationId: string,
  delta: CanvasPoint,
  implicitPanelId?: string,
): CanvasPoint | null {
  const annotation = movableAnnotation(template, annotationId, implicitPanelId);
  if (!annotation || !finitePoint(delta)) return null;
  const rect =
    annotation.coordinateSpace === 'page'
      ? coordinates.page
      : coordinates.panels.get(annotation.panelId)?.rect;
  if (
    !rect ||
    ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    return null;
  const position = {
    x: annotation.position.x + delta.x / rect.width,
    // 持久化坐标 Y 向上，SVG / CSS 坐标 Y 向下。
    y: annotation.position.y - delta.y / rect.height,
  };
  return finitePoint(position) ? position : null;
}

export function setCanvasAnnotationPosition(
  template: FigureTemplate,
  annotationId: string,
  position: CanvasPoint,
  implicitPanelId?: string,
): FigureTemplate {
  if (!finitePoint(position)) return template;
  const annotation = movableAnnotation(template, annotationId, implicitPanelId);
  if (
    !annotation ||
    (annotation.position.x === position.x &&
      annotation.position.y === position.y)
  )
    return template;
  const moved = { ...annotation, position: { ...position } };
  if (implicitPanelId !== undefined) {
    // 独立图层预览可能未包含其他层的 ID；最终写入必须对完整模板避碰。
    const ids = templateIdentifiers(template);
    let suffix = 2;
    while (ids.has(moved.annotationId))
      moved.annotationId = `${annotationId}-${suffix++}`;
  }
  return {
    ...template,
    annotations:
      implicitPanelId !== undefined
        ? [...template.annotations, moved]
        : template.annotations.map((a) => (a === annotation ? moved : a)),
  };
}

export function moveAnnotationBySvgDelta(
  template: FigureTemplate,
  coordinates: CanvasAnnotationCoordinates,
  annotationId: string,
  delta: CanvasPoint,
  implicitPanelId?: string,
): FigureTemplate {
  const position = annotationPositionBySvgDelta(
    template,
    coordinates,
    annotationId,
    delta,
    implicitPanelId,
  );
  return position
    ? setCanvasAnnotationPosition(
        template,
        annotationId,
        position,
        implicitPanelId,
      )
    : template;
}
