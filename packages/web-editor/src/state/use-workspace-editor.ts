import { useMemo, useState } from 'react';
import { bindWorkspace, emptyWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './editor-state.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import { useWorkspaceFiles } from './use-workspace-files.js';
import { tableActions, figureActions } from './workspace-actions.js';
import { isolateLayer, hasLayerAxisLinks } from './layer-batch.js';
import { multiAxisPreset } from './multi-axis-presets.js';

export function useWorkspaceEditor() {
  const [model, setModel] = useState<WorkspaceEditor>(() => ({
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  }));
  const files = useWorkspaceFiles(model, setModel);
  const activeId =
    model.template.panels.find((p) => p.panelId === model.activePanelId)
      ?.panelId ?? model.template.panels[0]!.panelId;
  const combinedPreview =
    !!multiAxisPreset(model.template) ||
    hasLayerAxisLinks(model.template, activeId);
  const view = useMemo(
    () => (combinedPreview ? model : isolateLayer(model, activeId)),
    [model, activeId, combinedPreview],
  );
  const data = useMemo(
    () =>
      model.workspace.tables.length
        ? bindWorkspace(view.template, view.workspace)
        : undefined,
    [view],
  );
  const rendered = useMemo(
    () =>
      data && !data.diagnostics.some((d) => d.severity === 'error')
        ? renderFigureSvg(view.template, data)
        : undefined,
    [view.template, data],
  );
  const exported = useMemo(() => {
    const full = view.template.panels.some((panel) =>
      panel.plotSlots.some(
        (plot) =>
          plot.kind === 'xy' &&
          plot.dataView?.sampling &&
          !plot.dataView.sampleExport,
      ),
    );
    return full && data
      ? renderFigureSvg(view.template, data, { purpose: 'export' })
      : rendered;
  }, [view.template, data, rendered]);
  const diagnostics = [
    ...(exported?.ok === false && rendered?.ok ? exported.diagnostics : []),
    ...(data?.diagnostics ?? []),
    ...(rendered?.diagnostics ?? []),
    ...files.projectErrors,
  ];
  return {
    model,
    combinedPreview,
    ...model,
    ...files,
    ...tableActions(model, files.update),
    ...figureActions(files.update),
    data,
    activePanel:
      model.template.panels.find((p) => p.panelId === model.activePanelId) ??
      model.template.panels[0]!,
    svg: rendered?.ok ? rendered.svg : undefined,
    exportSvg: exported?.ok ? exported.svg : undefined,
    diagnostics,
  };
}
