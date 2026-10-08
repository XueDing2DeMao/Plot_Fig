import type {
  FigureTemplate,
  Panel,
  Annotation,
  PlotSlot,
} from '@plot-fig/figure-schema';
import { escapeXml, type Rect } from './geometry.js';
import { renderLegendLayout } from './legend-layout.js';
import { hasLineAppearance } from './line-appearance.js';
import type { MarkerLegendSamples } from './marker-details.js';
type Legend = Extract<Annotation, { kind: 'legend' }>;

function implicitLegendId(template: FigureTemplate, panel: Panel): string {
  const ids = new Set([
    template.templateId,
    ...template.annotations.map((annotation) => annotation.annotationId),
    ...template.dataSlots.map((slot) => slot.dataSlotId),
    ...(template.sharedAxisGroups ?? []).map((group) => group.groupId),
  ]);
  for (const item of template.panels) {
    ids.add(item.panelId);
    for (const axis of item.axes) ids.add(axis.axisId);
    for (const plot of item.plotSlots) ids.add(plot.plotSlotId);
    // 预留其他面板的默认名称，保证图例身份不受面板顺序影响。
    if (item.panelId !== panel.panelId) ids.add('auto-' + item.panelId);
  }
  const base = 'auto-' + panel.panelId;
  let id = base;
  for (let suffix = 2; ids.has(id); suffix += 1) id = `${base}-${suffix}`;
  return id;
}

function entries(
  plots: PlotSlot[],
  ids: Set<string>,
  options: { legend: Legend; implicit?: boolean },
) {
  const { legend } = options;
  const valid = plots.filter(
    (p) =>
      ids.has(p.plotSlotId) &&
      (!options.implicit || p.legendEntry.visible) &&
      p.kind !== 'heatmap' &&
      (p.kind !== 'contour' ||
        (p.mode === 'lines' &&
          p.lineStyle.visible &&
          hasLineAppearance(p.lineStyle))),
  );
  return legend.layout?.plotSlotIds
    ? legend.layout.plotSlotIds.flatMap((id) =>
        valid.filter((p) => p.plotSlotId === id),
      )
    : valid;
}
export function renderSeriesLegend(
  template: FigureTemplate,
  panel: Panel,
  options: {
    rect: Rect;
    renderedPlotIds: Set<string>;
    samples?: MarkerLegendSamples;
  },
): string {
  const legends = template.annotations.filter(
    (a): a is Legend =>
      a.kind === 'legend' &&
      a.coordinateSpace === 'panel' &&
      a.panelId === panel.panelId,
  );
  if (
    !legends.length &&
    template.annotations.some(
      (a) => a.kind === 'legend' && a.coordinateSpace === 'page',
    )
  )
    return '';
  const selected: Legend[] = legends.length
    ? legends
    : [
        {
          kind: 'legend',
          annotationId: implicitLegendId(template, panel),
          coordinateSpace: 'panel',
          panelId: panel.panelId,
          visible: true,
          position: { x: 1, y: 1 },
        },
      ];
  return selected
    .map((legend) => {
      const svg = renderLegendLayout(
        template,
        entries(panel.plotSlots, options.renderedPlotIds, {
          legend,
          implicit: !legends.length,
        }),
        {
          legend,
          rect: options.rect,
          ...(options.samples ? { samples: options.samples } : {}),
        },
      );
      return legends.length
        ? svg
        : svg.replace(
            /^<g([^>]*)>/,
            (_match, attributes: string) =>
              `<g${attributes} data-implicit-legend-panel-id="${escapeXml(panel.panelId)}">`,
          );
    })
    .join('');
}
export function renderPageLegends(
  template: FigureTemplate,
  ids: Set<string>,
  rect: Rect,
  samples?: MarkerLegendSamples,
): string {
  return template.annotations
    .filter(
      (a): a is Legend => a.kind === 'legend' && a.coordinateSpace === 'page',
    )
    .map((legend) =>
      renderLegendLayout(
        template,
        entries(
          template.panels.flatMap((p) => p.plotSlots),
          ids,
          { legend },
        ),
        { legend, rect, ...(samples ? { samples } : {}) },
      ),
    )
    .join('');
}
