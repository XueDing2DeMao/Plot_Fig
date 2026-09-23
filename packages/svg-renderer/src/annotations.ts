import {
  defaultShapeStyle,
  type Annotation,
  type Panel,
} from '@plot-fig/figure-schema';
import { escapeXml, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';
import { annotationText, annotationSegment } from './annotation-style.js';
import { scaleCells, clippedCell } from './segmented-panel.js';
import { clipDataLine, containsDataPoint, type DataClip } from './data-clip.js';
type Point = { x: number; y: number };
type Context = {
  rect: Rect;
  scales: Map<string, PlotScale>;
  dataClip?: DataClip;
};
function pointFor(
  annotation: Annotation,
  point: Point,
  context: Context,
): Point {
  const { rect, scales } = context;
  const x =
    annotation.coordinateSpace === 'data'
      ? scales.get(annotation.xAxisId)?.map(point.x)
      : point.x;
  const y =
    annotation.coordinateSpace === 'data'
      ? scales.get(annotation.yAxisId)?.map(point.y)
      : point.y;
  return {
    x: rect.x + (x ?? NaN) * rect.width,
    y: rect.y + (1 - (y ?? NaN)) * rect.height,
  };
}
function reference(
  annotation: Extract<Annotation, { kind: 'reference-line' }>,
  context: Context,
) {
  const { rect, scales } = context;
  const x = scales.get(annotation.xAxisId),
    y = scales.get(annotation.yAxisId);
  if (!x || !y) return '';
  const vertical = annotation.orientation === 'x';
  const value = vertical
    ? rect.x + x.map(annotation.value) * rect.width
    : rect.y + (1 - y.map(annotation.value)) * rect.height;
  return annotationSegment(
    'reference-line',
    {
      start: vertical ? { x: value, y: rect.y } : { x: rect.x, y: value },
      end: vertical
        ? { x: value, y: rect.y + rect.height }
        : { x: rect.x + rect.width, y: value },
    },
    annotation.shapeStyle,
  );
}
function renderOne(annotation: Annotation, context: Context): string {
  if (annotation.visible === false || annotation.kind === 'legend') return '';
  if (context.dataClip && annotation.coordinateSpace === 'data') {
    const c = context.dataClip;
    if (
      annotation.kind === 'text' &&
      !containsDataPoint(annotation.position, c)
    )
      return '';
    const xScale = context.scales.get(annotation.xAxisId)!,
      yScale = context.scales.get(annotation.yAxisId)!;
    const mappable = (p: Point) =>
      Number.isFinite(xScale.map(p.x)) && Number.isFinite(yScale.map(p.y));
    if (
      annotation.kind === 'arrow' &&
      (!mappable(annotation.start) || !mappable(annotation.end))
    ) {
      const segment = clipDataLine(annotation.start, annotation.end, c);
      if (!segment) return '';
      const style = annotation.shapeStyle ?? defaultShapeStyle(),
        start =
          style.arrowHead === 'both' && containsDataPoint(annotation.start, c),
        end =
          style.arrowHead !== 'none' && containsDataPoint(annotation.end, c);
      annotation = {
        ...annotation,
        start: start && !end ? segment[1] : segment[0],
        end: start && !end ? segment[0] : segment[1],
        shapeStyle: {
          ...style,
          arrowHead: start && end ? 'both' : start || end ? 'end' : 'none',
        },
      };
    }
    if (
      annotation.kind === 'rectangle' &&
      (!mappable(annotation.start) || !mappable(annotation.end))
    ) {
      if (
        Math.max(annotation.start.x, annotation.end.x) < c.xMin ||
        Math.min(annotation.start.x, annotation.end.x) > c.xMax ||
        Math.max(annotation.start.y, annotation.end.y) < c.yMin ||
        Math.min(annotation.start.y, annotation.end.y) > c.yMax
      )
        return '';
      const clamp = (p: Point) => ({
        x: Math.max(c.xMin, Math.min(c.xMax, p.x)),
        y: Math.max(c.yMin, Math.min(c.yMax, p.y)),
      });
      annotation = {
        ...annotation,
        start: clamp(annotation.start),
        end: clamp(annotation.end),
      };
    }
  }
  let svg = '';
  if (annotation.kind === 'reference-line')
    svg = reference(annotation, context);
  else if (annotation.kind === 'text') {
    const p = pointFor(annotation, annotation.position, context);
    if (![p.x, p.y].every(Number.isFinite)) return '';
    svg = annotationText(
      annotation.text,
      p,
      annotation.textStyle,
      annotation.format,
      `annotation-${annotation.annotationId}`,
    );
  } else
    svg = annotationSegment(
      annotation.kind,
      {
        start: pointFor(annotation, annotation.start, context),
        end: pointFor(annotation, annotation.end, context),
      },
      annotation.shapeStyle,
    );
  return (
    '<g data-annotation-id="' +
    escapeXml(annotation.annotationId) +
    '">' +
    svg +
    '</g>'
  );
}
export function renderPanelAnnotations(
  annotations: Annotation[],
  panel: Panel,
  context: Context,
): string {
  return annotations
    .filter((a) => a.coordinateSpace !== 'page' && a.panelId === panel.panelId)
    .map((a) => {
      if (a.coordinateSpace === 'data') {
        const x = context.scales.get(a.xAxisId),
          y = context.scales.get(a.yAxisId);
        if (x && y && (x.segments || y.segments))
          return scaleCells(context.rect, x, y)
            .map((cell, index) =>
              clippedCell(
                `annotation-segment-${a.annotationId}-${index}`,
                cell.rect,
                renderOne(a, {
                  rect: cell.rect,
                  scales: new Map(context.scales)
                    .set(a.xAxisId, cell.xScale)
                    .set(a.yAxisId, cell.yScale),
                  dataClip: {
                    xMin: cell.xScale.min,
                    xMax: cell.xScale.max,
                    yMin: cell.yScale.min,
                    yMax: cell.yScale.max,
                  },
                }),
                'annotation-segment',
              ),
            )
            .join('');
      }
      const svg = renderOne(a, context);
      return a.coordinateSpace === 'data' && panel.clip
        ? '<g clip-path="url(#panel-clip-' +
            escapeXml(panel.panelId) +
            ')">' +
            svg +
            '</g>'
        : svg;
    })
    .join('');
}
export function renderPageAnnotations(
  annotations: Annotation[],
  viewport: Rect,
): string {
  return annotations
    .filter((a) => a.coordinateSpace === 'page')
    .map((a) => renderOne(a, { rect: viewport, scales: new Map() }))
    .join('');
}
