import type { FigureTemplate } from '@plot-fig/figure-schema';
import { existsInTemplate } from './origin-workspace.js';
import type { PropertyObjectRef } from './property-objects.js';

export function originCanvasTarget(
  template: FigureTemplate,
  element: Element,
): PropertyObjectRef | null {
  const annotationId = element
    .closest('[data-annotation-id]')
    ?.getAttribute('data-annotation-id');
  // 图例条目仍按曲线编辑文字；其余注释的数值属性位于图页的“注释”页。
  if (
    annotationId &&
    !element.closest('[data-plot-slot-id]') &&
    template.annotations.some((note) => note.annotationId === annotationId)
  )
    return { kind: 'page' };
  const panelId = element
    .closest('[data-panel-id]')
    ?.getAttribute('data-panel-id');
  if (!panelId) return element.closest('svg') ? { kind: 'page' } : null;
  const axisId = element
    .closest('[data-axis-id]')
    ?.getAttribute('data-axis-id');
  const plotSlotId = element
    .closest('[data-plot-slot-id]')
    ?.getAttribute('data-plot-slot-id');
  const ref: PropertyObjectRef = axisId
    ? { kind: 'axis', panelId, axisId }
    : plotSlotId
      ? { kind: 'plot', panelId, plotSlotId }
      : { kind: 'panel', panelId };
  return existsInTemplate(template, ref) ? ref : null;
}
