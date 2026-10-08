import type { FigureTemplate } from '@plot-fig/figure-schema';
import { copyDetailedStyle } from './detail-style.js';

import { assertTemplate } from '../state/publication-utils.js';

import { plotStyle } from './plot-style.js';
export function applyTemplateStyle(
  target: FigureTemplate,
  source: FigureTemplate,
  copyDetails = true,
): FigureTemplate {
  const next = structuredClone(target),
    font = source.theme.font;
  next.page = structuredClone(source.page);
  next.theme = structuredClone(source.theme);
  let index = 0;
  for (const panel of next.panels) {
    for (const axis of panel.axes) {
      axis.line = {
        ...axis.line,
        color: font.color,
        widthPt: source.theme.line.widthPt,
      };
      axis.tickLabels = {
        ...axis.tickLabels,
        fontFamily: font.family,
        fontSizePt: font.sizePt,
        color: font.color,
      };
      if (axis.title)
        axis.title = {
          ...axis.title,
          fontFamily: font.family,
          fontSizePt: font.sizePt,
          color: font.color,
        };
    }
    for (const plot of panel.plotSlots) plotStyle(plot, source, index++);
  }
  applyAnnotationTheme(next, source);
  if (copyDetails) copyDetailedStyle(next, source);
  if (source.publicationPreset)
    next.publicationPreset = structuredClone(source.publicationPreset);
  else delete next.publicationPreset;
  return assertTemplate(next);
}
function applyAnnotationTheme(next: FigureTemplate, source: FigureTemplate) {
  const font = source.theme.font;
  for (const a of next.annotations) {
    if (a.kind === 'text' || a.kind === 'legend')
      a.textStyle = {
        bold: false,
        italic: false,
        anchor: 'start',
        rotation: 0,
        ...a.textStyle,
        ...{
          fontFamily: font.family,
          fontSizePt: font.sizePt,
          color: font.color,
        },
      };
    if (a.kind === 'legend') {
      const sourceLegend = source.annotations.find((s) => s.kind === 'legend');
      if (sourceLegend?.kind === 'legend' && sourceLegend.layout) {
        const ids = a.layout?.plotSlotIds;
        a.layout = structuredClone(sourceLegend.layout);
        delete a.layout.plotSlotIds;
        if (ids) a.layout.plotSlotIds = ids;
      }
    }
  }
}
