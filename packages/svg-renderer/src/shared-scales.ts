import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { PreparedPlot } from './charts/prepared.js';
import type { PlotScale } from './scales.js';
import { prepareAxisScale } from './panel-scales.js';
import { resolveLinkedScales } from './linked-scales.js';
import { alignYAxisScales } from './axis-alignment.js';
export function sharedScales(
  template: FigureTemplate,
  panels: Map<string, PreparedPlot[]>,
  data?: import('@plot-fig/data-binding').DataBindingSet,
): Map<string, PlotScale> {
  const result = new Map<string, PlotScale>();
  for (const group of template.sharedAxisGroups ?? []) {
    const first = group.members[0]!;
    const axis = template.panels
      .find((p) => p.panelId === first.panelId)!
      .axes.find((a) => a.axisId === first.axisId)!;
    const field = axis.dimension === 'x' ? 'xAxisId' : 'yAxisId';
    const plots = group.members.flatMap((ref) =>
      (panels.get(ref.panelId) ?? [])
        .filter((p) => p.plot[field] === ref.axisId)
        .map((item) => ({
          ...item,
          plot: { ...item.plot, [field]: axis.axisId },
        })),
    );
    const scale = prepareAxisScale(axis, plots, data);
    if (scale) for (const ref of group.members) result.set(ref.axisId, scale);
  }
  if (template.panels.some((p) => p.axes.some((a) => a.advanced?.link))) {
    for (const panel of template.panels) {
      for (const axis of panel.axes)
        if (!result.has(axis.axisId) && !axis.advanced?.link) {
          const scale = prepareAxisScale(
            axis,
            panels.get(panel.panelId) ?? [],
            data,
          );
          if (scale) result.set(axis.axisId, scale);
        }
      const aligned = alignYAxisScales(panel, result);
      if (!aligned.ok) throw new Error(aligned.message);
      for (const axis of panel.axes) {
        const scale = aligned.scales.get(axis.axisId);
        if (scale) result.set(axis.axisId, scale);
      }
    }
    resolveLinkedScales(template, result);
  }
  return result;
}
