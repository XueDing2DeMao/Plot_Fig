import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';

type Annotation = FigureTemplate['annotations'][number];
type Panel = FigureTemplate['panels'][number];
type Point = { x: number; y: number };

function panelPoint(point: Point, rect: Rect): Point {
  return {
    x: rect.x + point.x * rect.width,
    y: rect.y + (1 - point.y) * rect.height,
  };
}

function dataPoint(
  point: Point,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): Point {
  return {
    x: rect.x + xScale.map(point.x) * rect.width,
    y: rect.y + (1 - yScale.map(point.y)) * rect.height,
  };
}

function pointFor(
  annotation: Annotation,
  point: Point,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): Point {
  return annotation.coordinateSpace === 'data'
    ? dataPoint(point, rect, xScale, yScale)
    : panelPoint(point, rect);
}

function renderText(
  annotation: Extract<Annotation, { kind: 'text' }>,
  point: Point,
): string {
  return `<text data-role="annotation-text" x="${formatNumber(point.x)}" y="${formatNumber(point.y)}">${escapeXml(annotation.text)}</text>`;
}

function renderLegend(
  annotation: Extract<Annotation, { kind: 'legend' }>,
  point: Point,
): string {
  if (!annotation.visible) return '';
  return `<text data-role="annotation-legend" x="${formatNumber(point.x)}" y="${formatNumber(point.y)}">Legend</text>`;
}

function renderSegment(
  annotation: Extract<Annotation, { kind: 'arrow' | 'rectangle' }>,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): string {
  const start = pointFor(annotation, annotation.start, rect, xScale, yScale);
  const end = pointFor(annotation, annotation.end, rect, xScale, yScale);
  if (annotation.kind === 'arrow')
    return `<line data-role="annotation-arrow" x1="${formatNumber(start.x)}" y1="${formatNumber(start.y)}" x2="${formatNumber(end.x)}" y2="${formatNumber(end.y)}" />`;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return `<rect data-role="annotation-rectangle" x="${formatNumber(x)}" y="${formatNumber(y)}" width="${formatNumber(Math.abs(end.x - start.x))}" height="${formatNumber(Math.abs(end.y - start.y))}" fill="none" />`;
}

function renderReferenceLine(
  annotation: Extract<Annotation, { kind: 'reference-line' }>,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): string {
  if (annotation.orientation === 'x') {
    const x = rect.x + xScale.map(annotation.value) * rect.width;
    return `<line data-role="annotation-reference-line" x1="${formatNumber(x)}" x2="${formatNumber(x)}" y1="${formatNumber(rect.y)}" y2="${formatNumber(rect.y + rect.height)}" />`;
  }
  const y = rect.y + (1 - yScale.map(annotation.value)) * rect.height;
  return `<line data-role="annotation-reference-line" x1="${formatNumber(rect.x)}" x2="${formatNumber(rect.x + rect.width)}" y1="${formatNumber(y)}" y2="${formatNumber(y)}" />`;
}

function renderOne(
  annotation: Annotation,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): string {
  if (annotation.kind === 'reference-line')
    return renderReferenceLine(annotation, rect, xScale, yScale);
  if (annotation.kind === 'text')
    return renderText(
      annotation,
      pointFor(annotation, annotation.position, rect, xScale, yScale),
    );
  if (annotation.kind === 'legend')
    return renderLegend(
      annotation,
      pointFor(annotation, annotation.position, rect, xScale, yScale),
    );
  return renderSegment(annotation, rect, xScale, yScale);
}

export function renderPanelAnnotations(
  annotations: Annotation[],
  panel: Panel,
  rect: Rect,
  xScale: PlotScale,
  yScale: PlotScale,
): string {
  return annotations
    .filter(
      (annotation) =>
        annotation.coordinateSpace !== 'page' &&
        annotation.panelId === panel.panelId,
    )
    .map((annotation) => renderOne(annotation, rect, xScale, yScale))
    .join('');
}

export function renderPageAnnotations(
  annotations: Annotation[],
  viewport: Rect,
): string {
  return annotations
    .filter((annotation) => annotation.coordinateSpace === 'page')
    .map((annotation) => {
      if (annotation.kind === 'text')
        return renderText(
          annotation,
          panelPoint(annotation.position, viewport),
        );
      if (annotation.kind === 'legend')
        return renderLegend(
          annotation,
          panelPoint(annotation.position, viewport),
        );
      if (annotation.kind === 'arrow' || annotation.kind === 'rectangle') {
        const identity = {
          min: 0,
          max: 1,
          scale: 'linear' as const,
          map: (value: number) => value,
        };
        return renderSegment(annotation, viewport, identity, identity);
      }
      return '';
    })
    .join('');
}
