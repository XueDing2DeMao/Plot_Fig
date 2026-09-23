import { useMemo, useState } from 'react';
import { bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { chartChoice, type ChartChoice } from './chart-defaults.js';
import { changeAllChartTypes } from './chart-operations.js';
import {
  applyMultiAxisPreset,
  collapseMultiAxisPreset,
  multiAxisPreset,
  type MultiAxisPreset,
  type PlotSetupChoice,
} from './multi-axis-presets.js';
import { tableActions, figureActions } from './workspace-actions.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import type { PlotLineChoice, PlotMarkerChoice } from './editor-state.js';
import { isolateLayer, hasLayerAxisLinks } from './layer-batch.js';
import {
  pasteLayerFormat,
  type LayerFormatSnapshot,
  type LayerFormatScope,
} from './layer-format.js';

type Change = (model: WorkspaceEditor) => WorkspaceEditor;
const message = (error: unknown) =>
  error instanceof Error ? error.message : '无法应用待绘图设置';

function previewModel(model: WorkspaceEditor) {
  const id =
    model.template.panels.find((p) => p.panelId === model.activePanelId)
      ?.panelId ?? model.template.panels[0]!.panelId;
  return multiAxisPreset(model.template) ||
    hasLayerAxisLinks(model.template, id)
    ? model
    : isolateLayer(model, id);
}
function structure(model: WorkspaceEditor) {
  return JSON.stringify({
    panels: model.template.panels.map((panel) => ({
      id: panel.panelId,
      axes: panel.axes.map((axis) => axis.axisId),
      plots: panel.plotSlots.map((plot) => ({
        id: plot.plotSlotId,
        kind: plot.kind,
        bindings: plot.bindings,
      })),
    })),
    slots: model.template.dataSlots.map((slot) => slot.dataSlotId),
    tables: model.workspace.tables.map((table) => ({
      id: table.tableId,
      columns: table.columns.map((column) => column.columnId),
    })),
  });
}

function plotColor(
  plot: Extract<
    WorkspaceEditor['template']['panels'][number]['plotSlots'][number],
    { kind: 'xy' }
  >,
) {
  return (
    plot.lineStyle?.color ??
    plot.markerStyle?.stroke ??
    plot.markerStyle?.fill ??
    '#21918c'
  );
}

function ensureLine(
  plot: Extract<
    WorkspaceEditor['template']['panels'][number]['plotSlots'][number],
    { kind: 'xy' }
  >,
) {
  plot.lineStyle ??= {
    visible: true,
    color: plotColor(plot),
    widthPt: 1.5,
    dash: 'solid',
  };
  plot.lineStyle.visible = true;
  return plot.lineStyle;
}

function ensureMarker(
  plot: Extract<
    WorkspaceEditor['template']['panels'][number]['plotSlots'][number],
    { kind: 'xy' }
  >,
) {
  const color = plotColor(plot);
  plot.markerStyle ??= {
    visible: true,
    shape: 'circle',
    sizePt: 4,
    fill: color,
    stroke: color,
    strokeWidthPt: 1,
  };
  plot.markerStyle.visible = true;
  return plot.markerStyle;
}

function normalizeXyAppearance(model: WorkspaceEditor): WorkspaceEditor {
  const activeId = model.activePanelId ?? model.template.panels[0]!.panelId;
  const inScope = (panel: WorkspaceEditor['template']['panels'][number]) =>
    !!multiAxisPreset(model.template) || panel.panelId === activeId;
  const needsRepair = model.template.panels
    .filter(inScope)
    .some((panel) =>
      panel.plotSlots.some(
        (plot) =>
          plot.kind === 'xy' &&
          ((plot.mode !== 'markers' && !plot.lineStyle?.visible) ||
            (plot.mode !== 'line' && !plot.markerStyle?.visible)),
      ),
    );
  if (!needsRepair) return model;
  const repaired = structuredClone(model);
  for (const panel of repaired.template.panels.filter(inScope))
    for (const plot of panel.plotSlots)
      if (plot.kind === 'xy') {
        if (plot.mode !== 'markers') ensureLine(plot);
        if (plot.mode !== 'line') ensureMarker(plot);
      }
  return repaired;
}

export function usePlotSetup(
  model: WorkspaceEditor,
  onApply: (next: WorkspaceEditor) => boolean | void,
  openedVersion = 0,
) {
  const [state, setState] = useState<{
    version: number;
    changes: Change[];
    base: WorkspaceEditor;
    selectedPanelId?: string | undefined;
  }>({ version: openedVersion, changes: [], base: model });
  const [error, setError] = useState('');
  if (state.version !== openedVersion) {
    setState({ version: openedVersion, changes: [], base: model });
    setError('');
  }
  // 待绘图操作重放到最新已确认模型，保留期间修改的图形属性。
  const pending = useMemo(() => {
    try {
      if (state.version !== openedVersion) return { model, error: '' };
      const conflict =
        state.changes.length > 0 && structure(model) !== structure(state.base);
      const replayed = state.changes.reduce(
        (current, change) => change(current),
        conflict ? state.base : model,
      );
      return {
        // 新图层可能尚未存在于已应用模型，选择状态须在草稿重放后恢复。
        model:
          state.selectedPanelId &&
          replayed.template.panels.some(
            (panel) => panel.panelId === state.selectedPanelId,
          )
            ? { ...replayed, activePanelId: state.selectedPanelId }
            : replayed,
        error: conflict
          ? '当前图形结构已更改。待绘图设置和原图均已保留，请重置待绘图设置后重新绑定，避免修改错误的数据组。'
          : '',
      };
    } catch (cause) {
      return {
        model,
        error: `当前图形已更改，待绘图设置无法应用：${message(cause)}。请重置后重新设置。`,
      };
    }
  }, [model, state, openedVersion]);
  const draft = useMemo(
    () => normalizeXyAppearance(pending.model),
    [pending.model],
  );
  const view = useMemo(() => previewModel(draft), [draft]);
  const data = useMemo(
    () =>
      draft.workspace.tables.length
        ? bindWorkspace(view.template, view.workspace)
        : undefined,
    [draft, view],
  );
  const plots = view.template.panels.flatMap((panel) => panel.plotSlots);
  const first = plots[0];
  const preset = multiAxisPreset(draft.template);
  const choice: PlotSetupChoice | '' =
    preset ??
    (first && plots.every((plot) => chartChoice(plot) === chartChoice(first))
      ? chartChoice(first)
      : '');
  const appearanceAvailable =
    plots.length > 0 && plots.every((plot) => plot.kind === 'xy');
  const lineDash: PlotLineChoice =
    first?.kind === 'xy' && first.mode !== 'markers'
      ? (first.lineStyle?.dash ?? 'solid')
      : 'none';
  const markerShape: PlotMarkerChoice =
    first?.kind === 'xy' && first.mode !== 'line'
      ? (first.markerStyle?.shape ?? 'circle')
      : 'none';
  const update = (change: Change) => {
    try {
      change(draft);
      const activePanelId =
        draft.activePanelId ?? draft.template.panels[0]!.panelId;
      const anchoredChange: Change = (current) => {
        if (
          !current.template.panels.some(
            (panel) => panel.panelId === activePanelId,
          )
        )
          throw new Error('原数据组所在图层已不存在');
        const next = change({ ...current, activePanelId });
        return {
          ...next,
          activePanelId: next.template.panels.some(
            (p) => p.panelId === current.activePanelId,
          )
            ? current.activePanelId!
            : (next.activePanelId ?? next.template.panels[0]!.panelId),
        };
      };
      setState((current) => ({
        ...current,
        base: current.changes.length ? current.base : model,
        changes: [...current.changes, anchoredChange],
      }));
      setError('');
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    }
  };
  const confirm = () => {
    if (pending.error) return;
    if (!data || !plots.length) {
      setError('请先导入数据，并至少绑定一组数据。');
      return;
    }
    if (!choice) {
      setError('请为所有数据组选择同一种图表类型。');
      return;
    }
    const invalid = data.diagnostics.filter(
      (item) => item.severity === 'error',
    );
    if (invalid.length) {
      setError(
        '请检查数据绑定：' + invalid.map((item) => item.message).join('；'),
      );
      return;
    }
    if (!validateFigureTemplate(draft.template).ok) {
      setError('图形设置无效，请检查图表类型及坐标轴设置。');
      return;
    }
    const preview = renderFigureSvg(view.template, data);
    if (!preview.ok) {
      setError(preview.diagnostics.map((item) => item.message).join('；'));
      return;
    }
    if (onApply(draft) === false) {
      setError('未能应用图形设置，原图已保留。');
      return;
    }
    setState({ version: openedVersion, changes: [], base: draft });
    setError('');
    return draft;
  };
  return {
    ...draft,
    ...tableActions(draft, update),
    ...figureActions(update),
    onLayerFormat: (
      snapshot: LayerFormatSnapshot,
      panelId: string,
      scope: LayerFormatScope,
    ) => {
      try {
        if (pending.error) throw new Error(pending.error);
        // 与已有草稿一起提交；校验和应用失败时不修改原图或清空草稿。
        const next = {
          ...draft,
          template: pasteLayerFormat(draft.template, snapshot, panelId, scope),
        };
        if (next.workspace.tables.length) {
          const nextView = previewModel(next);
          const nextData = bindWorkspace(nextView.template, nextView.workspace);
          const invalid = nextData.diagnostics.filter(
            (item) => item.severity === 'error',
          );
          if (invalid.length)
            throw new Error(
              '请检查数据绑定：' +
                invalid.map((item) => item.message).join('；'),
            );
          const preview = renderFigureSvg(nextView.template, nextData);
          if (!preview.ok)
            throw new Error(
              preview.diagnostics.map((item) => item.message).join('；'),
            );
        }
        if (onApply(next) === false)
          throw new Error('未能应用粘贴格式，原图和待绘图设置已保留。');
        setState({ version: openedVersion, changes: [], base: next });
        setError('');
        return true;
      } catch (cause) {
        setError(message(cause));
        return false;
      }
    },
    onPanel: (activePanelId: string) => {
      if (
        !draft.template.panels.some((panel) => panel.panelId === activePanelId)
      )
        return;
      const applied = model.template.panels.some(
        (panel) => panel.panelId === activePanelId,
      );
      if (state.changes.length)
        setState((current) => ({
          ...current,
          selectedPanelId: applied ? undefined : activePanelId,
        }));
      if (applied) onApply({ ...model, activePanelId });
    },
    applyBatch: (next: WorkspaceEditor) => {
      if (pending.error) {
        setError(pending.error);
        return false;
      }
      if (onApply(next) === false) return false;
      setState({ version: openedVersion, changes: [], base: next });
      setError('');
      return true;
    },
    data,
    choice,
    appearanceAvailable,
    lineDash,
    markerShape,
    activePanel:
      draft.template.panels.find(
        (panel) => panel.panelId === draft.activePanelId,
      ) ?? draft.template.panels[0]!,
    pending: state.changes.length > 0,
    error: pending.error || error,
    confirm,
    reset: () => {
      setState({ version: openedVersion, changes: [], base: model });
      setError('');
    },
    onChoice: (next: PlotSetupChoice) =>
      update((current) =>
        next === 'double-y' ||
        next === 'triple-y' ||
        next === 'quad-y' ||
        next === 'stacked-shared-x'
          ? applyMultiAxisPreset(current, next as MultiAxisPreset)
          : changeAllChartTypes(
              collapseMultiAxisPreset(current),
              next as ChartChoice,
              multiAxisPreset(current.template)
                ? undefined
                : (current.activePanelId ??
                    current.template.panels[0]!.panelId),
            ),
      ),
    onLineDash: (next: PlotLineChoice) =>
      update((current) => {
        const updated = structuredClone(current);
        for (const panel of updated.template.panels)
          if (
            multiAxisPreset(current.template) ||
            panel.panelId ===
              (current.activePanelId ?? current.template.panels[0]!.panelId)
          )
            for (const plot of panel.plotSlots)
              if (plot.kind === 'xy') {
                if (next === 'none') {
                  if (plot.lineStyle) plot.lineStyle.visible = false;
                  ensureMarker(plot);
                  plot.mode = 'markers';
                } else {
                  const line = ensureLine(plot);
                  line.dash = next;
                  delete line.customDash;
                  plot.mode =
                    plot.mode !== 'line' && plot.markerStyle?.visible
                      ? 'line-markers'
                      : 'line';
                }
              }
        return updated;
      }),
    onMarkerShape: (next: PlotMarkerChoice) =>
      update((current) => {
        const updated = structuredClone(current);
        for (const panel of updated.template.panels)
          if (
            multiAxisPreset(current.template) ||
            panel.panelId ===
              (current.activePanelId ?? current.template.panels[0]!.panelId)
          )
            for (const plot of panel.plotSlots)
              if (plot.kind === 'xy') {
                if (next === 'none') {
                  if (plot.markerStyle) plot.markerStyle.visible = false;
                  ensureLine(plot);
                  plot.mode = 'line';
                } else {
                  const marker = ensureMarker(plot);
                  marker.shape = next;
                  if (next === 'custom')
                    marker.customVertices ??= [
                      [-0.9, 0.4],
                      [-0.6, -0.8],
                      [0.4, -1],
                      [1, -0.1],
                      [0.5, 0.9],
                      [-0.5, 0.8],
                    ];
                  else delete marker.customVertices;
                  plot.mode =
                    plot.mode !== 'markers' && plot.lineStyle?.visible
                      ? 'line-markers'
                      : 'markers';
                }
              }
        return updated;
      }),
  };
}
