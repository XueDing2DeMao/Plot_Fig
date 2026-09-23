import {
  appendWorkspaceTables,
  bindWorkspace,
  bindTableToPlot,
  columnKey,
  type DataTable,
  type DataWorkspace,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { changeChartType } from './chart-operations.js';
import { chartChoice } from './chart-defaults.js';
import {
  addSeries,
  duplicateSeries,
  moveSeries,
  removeSeries,
} from './series-operations.js';
import { synchronizeCurveOneAxisTitles } from './axis-title-bindings.js';
import { multiAxisPreset } from './multi-axis-presets.js';

export type WorkspaceEditor = {
  activePanelId?: string;
  template: FigureTemplate;
  workspace: DataWorkspace;
};
export type SeriesAction = 'add' | 'duplicate' | 'remove' | 'up' | 'down';

export function importTables(
  model: WorkspaceEditor,
  tables: DataTable[],
): WorkspaceEditor {
  let workspace = appendWorkspaceTables(model.workspace, tables);
  if (!model.workspace.tables.length && workspace.tables.length) {
    const activeId = model.activePanelId ?? model.template.panels[0]!.panelId;
    const panels = multiAxisPreset(model.template)
      ? model.template.panels
      : model.template.panels.filter((p) => p.panelId === activeId);
    for (const plot of panels.flatMap((panel) => panel.plotSlots))
      workspace = bindTableToPlot(workspace, model.template, {
        plotSlotId: plot.plotSlotId,
        tableId: workspace.tables[0]!.tableId,
      });
  }
  return synchronizeCurveOneAxisTitles(model, { ...model, workspace });
}

export function changeSeries(
  model: WorkspaceEditor,
  action: SeriesAction,
  plotSlotId = '',
  allowEmptyLayer = false,
): WorkspaceEditor {
  const activePanel =
    model.template.panels.find(
      (panel) => panel.panelId === model.activePanelId,
    ) ?? model.template.panels[0]!;
  const wasEmpty = action === 'add' && activePanel.plotSlots.length === 0;
  const overrides = Object.fromEntries(
    Object.entries(model.workspace.slotBindings).map(([slot, ref]) => [
      slot,
      columnKey(ref),
    ]),
  );
  const result =
    action === 'add'
      ? addSeries(
          model.template,
          overrides,
          model.activePanelId,
          bindWorkspace(model.template, model.workspace),
        )
      : action === 'duplicate'
        ? duplicateSeries(
            model.template,
            overrides,
            plotSlotId,
            bindWorkspace(model.template, model.workspace),
          )
        : action === 'remove'
          ? removeSeries(model.template, overrides, plotSlotId, allowEmptyLayer)
          : moveSeries(model.template, overrides, plotSlotId, action);
  if (!result.ok) throw new Error(result.message);
  const refs = new Map(
    Object.values(model.workspace.slotBindings).map((ref) => [
      columnKey(ref),
      ref,
    ]),
  );
  const slotBindings = Object.fromEntries(
    Object.entries(result.value.overrides).flatMap(([slot, key]) =>
      refs.has(key) ? [[slot, refs.get(key)!]] : [],
    ),
  );
  const workspace = { ...model.workspace, slotBindings };
  const tableId =
    model.workspace.activeTableId ?? model.workspace.tables[0]?.tableId;
  let next: WorkspaceEditor = {
    ...model,
    template: result.value.template,
    workspace,
  };
  if (wasEmpty) {
    const existing = model.template.panels.flatMap(
      (panel) => panel.plotSlots,
    )[0];
    if (existing)
      next = changeChartType(
        next,
        result.value.selectedPlotSlotId,
        chartChoice(existing),
      );
    if (tableId)
      next.workspace = bindTableToPlot(next.workspace, next.template, {
        plotSlotId: result.value.selectedPlotSlotId,
        tableId,
      });
  }
  return synchronizeCurveOneAxisTitles(model, next);
}
