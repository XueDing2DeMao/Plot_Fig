import type { FigureTemplate, XyPlot } from '@plot-fig/figure-schema';
export function xyPlot(template: FigureTemplate, index = 0): XyPlot {
  const plot = template.panels[0]?.plotSlots[index];
  if (plot?.kind !== 'xy') throw new Error('Expected an XY fixture');
  return plot;
}
