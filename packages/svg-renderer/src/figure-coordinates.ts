import {
  resolvePanelFrames,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  colorbarLayout,
  layerGeometry,
  pageGeometry,
} from './layout-geometry.js';
import { type Rect } from './geometry.js';
import { preparePanel } from './panel.js';
import { sharedScales } from './shared-scales.js';
import { prepareAxisScale } from './panel-scales.js';
import type { PlotScale } from './scales.js';
import { alignYAxisScales } from './axis-alignment.js';
import {
  constrainAxisLengths,
  type AxisLengthRatioStatus,
} from './axis-length-ratio.js';
export function figureCoordinates(
  template: FigureTemplate,
  data?: DataBindingSet,
) {
  template = resolvePanelFrames(template);
  const page = pageGeometry(template.page).page;
  const prepared = new Map(
    template.panels.map((p) => [
      p.panelId,
      data ? preparePanel(p, data, []) : [],
    ]),
  );
  const shared = sharedScales(template, prepared, data);
  const sharedIds = new Set(
    template.sharedAxisGroups?.flatMap((group) =>
      group.members.map((member) => member.axisId),
    ),
  );
  const panels = new Map<
    string,
    {
      rect: Rect;
      scales: Map<string, PlotScale>;
      ratioStatus: AxisLengthRatioStatus;
    }
  >();
  for (const panel of template.panels) {
    if (panel.visible === false) continue;
    const plots = prepared.get(panel.panelId)!;
    const geometry = layerGeometry(
      panel.frame,
      page,
      colorbarLayout(plots.map((item) => item.plot)),
    );
    const scales = new Map<string, PlotScale>();
    for (const axis of panel.axes) {
      const scale =
        shared.has(axis.axisId) || sharedIds.has(axis.axisId)
          ? shared.get(axis.axisId)
          : prepareAxisScale(axis, plots, data);
      if (scale) scales.set(axis.axisId, scale);
    }
    const aligned = alignYAxisScales(panel, scales);
    if (panel.axisLengthRatio && !aligned.ok) throw new Error(aligned.message);
    const effective = constrainAxisLengths(
      geometry,
      panel.axisLengthRatio,
      aligned.scales,
    );
    panels.set(panel.panelId, {
      rect: effective.plot,
      scales: aligned.scales,
      ratioStatus: effective.status,
    });
  }
  return { page, panels };
}
