import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { TextContentFormat } from '@plot-fig/figure-schema';
import { markAxisTitleManual } from './axis-title-bindings.js';
import type { WorkspaceEditor } from './workspace-editor.js';

export type InlineChartTextTarget =
  | {
      kind: 'axis-title';
      panelId: string;
      axisId: string;
    }
  | {
      kind: 'legend-entry';
      panelId: string;
      plotSlotId: string;
    };

function panelId(element: Element): string | undefined {
  return (
    element.closest('[data-panel-id]')?.getAttribute('data-panel-id') ??
    undefined
  );
}

function axisTitleTarget(
  template: FigureTemplate,
  element: Element,
): InlineChartTextTarget | null {
  const title = element.closest('[data-role="axis-title"]');
  if (!title) return null;
  const ownerPanelId = panelId(title);
  const axisId = title.closest('[data-axis-id]')?.getAttribute('data-axis-id');
  if (!ownerPanelId || !axisId) return null;
  const exists = template.panels
    .find((panel) => panel.panelId === ownerPanelId)
    ?.axes.some((axis) => axis.axisId === axisId);
  return exists ? { kind: 'axis-title', panelId: ownerPanelId, axisId } : null;
}

function legendEntryTarget(
  template: FigureTemplate,
  element: Element,
): InlineChartTextTarget | null {
  const label =
    element.closest('[data-role="legend-label"]') ?? element.closest('text');
  const entry = label?.closest('[data-role="legend-entry"]');
  const plotSlotId = entry?.getAttribute('data-plot-slot-id');
  if (!entry || !plotSlotId) return null;
  const preferredPanelId = panelId(entry);
  const panel =
    template.panels.find(
      (candidate) =>
        candidate.panelId === preferredPanelId &&
        candidate.plotSlots.some((plot) => plot.plotSlotId === plotSlotId),
    ) ??
    template.panels.find((candidate) =>
      candidate.plotSlots.some((plot) => plot.plotSlotId === plotSlotId),
    );
  return panel
    ? { kind: 'legend-entry', panelId: panel.panelId, plotSlotId }
    : null;
}

export function inlineChartTextTarget(
  template: FigureTemplate,
  element: Element,
): InlineChartTextTarget | null {
  return (
    axisTitleTarget(template, element) ?? legendEntryTarget(template, element)
  );
}

export function inlineChartTextSource(
  template: FigureTemplate,
  target: InlineChartTextTarget,
): { value: string; format: TextContentFormat } | null {
  const panel = template.panels.find(
    (candidate) => candidate.panelId === target.panelId,
  );
  if (!panel) return null;
  if (target.kind === 'axis-title') {
    const title = panel.axes.find(
      (axis) => axis.axisId === target.axisId,
    )?.title;
    return title
      ? { value: title.text, format: title.format }
      : { value: '', format: 'auto' };
  }
  const legend = panel.plotSlots.find(
    (plot) => plot.plotSlotId === target.plotSlotId,
  )?.legendEntry;
  return legend
    ? { value: legend.text, format: legend.format ?? 'auto' }
    : null;
}

export function updateInlineChartText(
  model: WorkspaceEditor,
  target: InlineChartTextTarget,
  value: string,
): WorkspaceEditor {
  const template = structuredClone(model.template);
  const panel = template.panels.find(
    (candidate) => candidate.panelId === target.panelId,
  );
  if (!panel) throw new Error('找不到图层');
  const text = value.trim().slice(0, 1024);
  if (target.kind === 'axis-title') {
    const axis = panel.axes.find(
      (candidate) => candidate.axisId === target.axisId,
    );
    if (!axis) throw new Error('找不到坐标轴');
    axis.title = {
      ...axis.title,
      format: axis.title?.format ?? 'auto',
      text,
      fontFamily: axis.title?.fontFamily ?? axis.tickLabels.fontFamily,
      fontSizePt: axis.title?.fontSizePt ?? 12,
      color: axis.title?.color ?? axis.tickLabels.color,
    };
    markAxisTitleManual(axis);
  } else {
    const plot = panel.plotSlots.find(
      (candidate) => candidate.plotSlotId === target.plotSlotId,
    );
    if (!plot) throw new Error('找不到曲线');
    plot.legendEntry = { ...plot.legendEntry, text, source: 'manual' };
  }
  return { ...model, template };
}
