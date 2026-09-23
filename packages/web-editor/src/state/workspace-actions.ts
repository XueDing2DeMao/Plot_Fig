import { synchronizeLegendSources } from './legend-bindings.js';
import { changeChartType } from './chart-operations.js';
import type { ChartChoice } from './chart-defaults.js';
import {
  bindTableToPlot,
  removeWorkspaceTable,
  suggestTableColumn,
  type DataTable,
  type TableRegion,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { updatePlotMode, type PlotMode } from './editor-state.js';
import {
  changeSeries,
  importTables,
  type SeriesAction,
  type WorkspaceEditor,
} from './workspace-editor.js';
import { synchronizeCurveOneAxisTitles } from './axis-title-bindings.js';
import { rebuildImportedTable } from './table-import-settings.js';
import {
  updateInlineChartText,
  type InlineChartTextTarget,
} from './inline-chart-text.js';

type Update = (
  change: (current: WorkspaceEditor) => WorkspaceEditor,
) => boolean | void;
function replaceTable(
  model: WorkspaceEditor,
  table: DataTable,
): WorkspaceEditor {
  const next = {
    ...model,
    workspace: {
      ...model.workspace,
      tables: model.workspace.tables.map((t) =>
        t.tableId === table.tableId ? table : t,
      ),
    },
  };
  return synchronizeCurveOneAxisTitles(model, next);
}

function changeImportOptions(
  model: WorkspaceEditor,
  tableId: string,
  region: TableRegion,
): WorkspaceEditor {
  const table = model.workspace.tables.find((item) => item.tableId === tableId);
  if (!table) throw new Error('找不到数据表');
  const rebuilt = rebuildImportedTable(table, region);
  const columns = new Set(rebuilt.columns.map((column) => column.columnId));
  const slotBindings = Object.fromEntries(
    Object.entries(model.workspace.slotBindings).filter(
      ([, ref]) => ref.tableId !== tableId || columns.has(ref.columnId),
    ),
  );
  return synchronizeCurveOneAxisTitles(model, {
    ...model,
    workspace: {
      ...model.workspace,
      tables: model.workspace.tables.map((item) =>
        item.tableId === tableId ? rebuilt : item,
      ),
      slotBindings,
    },
  });
}
function selectColumn(
  model: WorkspaceEditor,
  selection: { slotId: string; tableId: string; columnId: string },
): WorkspaceEditor {
  const { slotId, tableId, columnId } = selection;
  const table = model.workspace.tables.find((t) => t.tableId === tableId)!;
  const slot = model.template.dataSlots.find((s) => s.dataSlotId === slotId)!;
  const selected =
    columnId === '__none__'
      ? undefined
      : columnId || suggestTableColumn(table, slot)?.columnId;
  const slotBindings = { ...model.workspace.slotBindings };
  if (selected) slotBindings[slotId] = { tableId, columnId: selected };
  else delete slotBindings[slotId];
  return synchronizeCurveOneAxisTitles(model, {
    ...model,
    workspace: { ...model.workspace, slotBindings },
  });
}
export function tableActions(model: WorkspaceEditor, update: Update) {
  return {
    onImport: (tables: DataTable[]) =>
      update((current) => importTables(current, tables)),
    onTableChange: (table: DataTable) =>
      update((current) => replaceTable(current, table)),
    onImportOptions: (tableId: string, region: TableRegion) =>
      update((current) => changeImportOptions(current, tableId, region)),
    onSelect: (activeTableId: string) =>
      update((current) => ({
        ...current,
        workspace: { ...current.workspace, activeTableId },
      })),
    onRemove: (id: string) =>
      update((current) =>
        synchronizeLegendSources({
          ...current,
          workspace: removeWorkspaceTable(current.workspace, id),
        }),
      ),
    onTable: (plotSlotId: string, tableId: string) =>
      update((current) => {
        const next = {
          ...current,
          workspace: bindTableToPlot(current.workspace, current.template, {
            plotSlotId,
            tableId,
          }),
        };
        return synchronizeCurveOneAxisTitles(current, next, plotSlotId);
      }),
    onColumn: (slotId: string, tableId: string, columnId: string) =>
      update((current) => selectColumn(current, { slotId, tableId, columnId })),
  };
}
export function figureActions(update: Update) {
  return {
    onInlineText: (target: InlineChartTextTarget, value: string) =>
      update((current) => updateInlineChartText(current, target, value)),
    onAddChart: (choice?: ChartChoice) =>
      update((current) => {
        const next = changeSeries(current, 'add');
        const id = (next.template.panels.find(
          (p) => p.panelId === next.activePanelId,
        ) ?? next.template.panels[0])!.plotSlots.at(-1)!.plotSlotId;
        return choice ? changeChartType(next, id, choice) : next;
      }),
    onChart: (id: string, choice: ChartChoice) =>
      update((current) => changeChartType(current, id, choice)),
    onSeries: (action: SeriesAction, id?: string) =>
      update((current) => changeSeries(current, action, id)),
    onModel: (model: WorkspaceEditor) =>
      update(() => synchronizeLegendSources(model)),
    onPanel: (activePanelId: string) =>
      update((current) => ({ ...current, activePanelId })),
    onTemplate: (template: FigureTemplate) =>
      update((current) => {
        // 打开项目可能没有显式选择；重排前先固定当前有效图层。
        const selected =
          current.template.panels.find(
            (panel) => panel.panelId === current.activePanelId,
          ) ?? current.template.panels[0]!;
        const activePanelId = template.panels.some(
          (panel) => panel.panelId === selected.panelId,
        )
          ? selected.panelId
          : template.panels[0]!.panelId;
        return synchronizeLegendSources({
          ...current,
          template,
          activePanelId,
        });
      }),
    onMode: (mode: PlotMode) =>
      update((current) => ({
        ...current,
        template: updateActiveMode(current, mode),
      })),
  };
}

function updateActiveMode(current: WorkspaceEditor, mode: PlotMode) {
  const template = structuredClone(current.template);
  const panel =
    template.panels.find((p) => p.panelId === current.activePanelId) ??
    template.panels[0]!;
  const plot = panel.plotSlots[0];
  if (plot?.kind === 'xy') plot.mode = mode;
  return template;
}
