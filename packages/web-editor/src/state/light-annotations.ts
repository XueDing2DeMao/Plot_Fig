import {
  defaultShapeStyle,
  defaultTextStyle,
  type Annotation,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { newIdentifier } from './publication-utils.js';

export function addAnnotation(
  template: FigureTemplate,
  kind: Annotation['kind'],
): FigureTemplate {
  const panel = template.panels[0];
  const base = { annotationId: newIdentifier(template, 'note'), visible: true };
  let note: Annotation;
  if (kind === 'text')
    note = {
      ...base,
      kind,
      coordinateSpace: 'page',
      position: { x: 0.25, y: 0.2 },
      text: '文字注释',
      format: 'auto',
      textStyle: defaultTextStyle(),
    };
  else if (kind === 'legend')
    note = {
      ...base,
      kind,
      coordinateSpace: 'page',
      position: { x: 0.85, y: 0.85 },
    };
  else if (kind === 'reference-line') {
    const x = panel?.axes.find((a) => a.dimension === 'x'),
      y = panel?.axes.find((a) => a.dimension === 'y');
    if (!panel || !x || !y) throw new Error('参考线需要横纵坐标轴');
    note = {
      ...base,
      kind,
      coordinateSpace: 'data',
      panelId: panel.panelId,
      xAxisId: x.axisId,
      yAxisId: y.axisId,
      orientation: 'y',
      value: 0,
      shapeStyle: defaultShapeStyle(),
    };
  } else
    note = {
      ...base,
      kind,
      coordinateSpace: 'page',
      start: { x: 0.25, y: 0.25 },
      end: { x: 0.55, y: 0.55 },
      shapeStyle: defaultShapeStyle(),
    };
  return { ...template, annotations: [...template.annotations, note] };
}
export function updateAnnotation(
  template: FigureTemplate,
  note: Annotation,
): FigureTemplate {
  if (!template.annotations.some((a) => a.annotationId === note.annotationId))
    throw new Error('注释已不存在');
  return {
    ...template,
    annotations: template.annotations.map((a) =>
      a.annotationId === note.annotationId ? structuredClone(note) : a,
    ),
  };
}
export function removeAnnotation(
  template: FigureTemplate,
  id: string,
): FigureTemplate {
  return {
    ...template,
    annotations: template.annotations.filter((a) => a.annotationId !== id),
  };
}
