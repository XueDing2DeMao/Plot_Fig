import { bindWorkspace } from '@plot-fig/data-binding';
import { resolvePanelFrames } from '@plot-fig/figure-schema';
import {
  figureCoordinates,
  renderFigureSvg,
  rescaleFigureRanges,
  validateFixedAxisTicks,
} from '@plot-fig/svg-renderer';
import { assertTemplate } from '../state/publication-utils.js';
import {
  resolvePropertyObject,
  type PropertyObjectRef,
} from '../state/property-objects.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import type { FigurePropertyDraftState } from './figure-property-draft-state.js';

function nextSelection(
  previous: PropertyObjectRef,
  model: WorkspaceEditor,
): PropertyObjectRef {
  if (previous.kind === 'plot') {
    const panel = model.template.panels.find((p) =>
      p.plotSlots.some((plot) => plot.plotSlotId === previous.plotSlotId),
    );
    if (panel && panel.panelId !== previous.panelId)
      return { ...previous, panelId: panel.panelId };
  }
  if (
    model.activePanelId &&
    (previous.kind === 'page' || model.activePanelId !== previous.panelId)
  )
    return { kind: 'panel', panelId: model.activePanelId };
  return resolvePropertyObject(model.template, previous);
}
export function applyPropertyModel(
  state: FigurePropertyDraftState,
  operation: (model: WorkspaceEditor) => WorkspaceEditor,
): FigurePropertyDraftState {
  if (
    !state.workspace ||
    Object.values(state.drafts).some((draft) => draft.error)
  )
    return state;
  try {
    const candidate = operation(
      structuredClone({
        template: state.template,
        workspace: state.workspace,
        activePanelId:
          state.selection.kind === 'page'
            ? state.template.panels[0]!.panelId
            : state.selection.panelId,
      }),
    );
    let template = resolvePanelFrames(candidate.template);
    const data = candidate.workspace.tables.length
      ? bindWorkspace(template, candidate.workspace)
      : undefined;
    if (data) {
      const result = rescaleFigureRanges({
        before: state.template,
        candidate: template,
        beforeData:
          state.data ?? bindWorkspace(state.template, state.workspace),
        data,
        reason: 'change',
      });
      const errors = result.diagnostics.filter((d) => d.severity === 'error');
      if (errors.length)
        throw new Error(errors.map((d) => d.message).join('；'));
      template = result.template;
    }
    assertTemplate(template);
    const errors = validateFixedAxisTicks(template);
    if (errors.length) throw new Error(errors.map((e) => e.message).join('；'));
    if (template.panels.some((panel) => panel.axisLengthRatio))
      figureCoordinates(template, data);
    if (data) {
      const preview = renderFigureSvg(template, data);
      if (!preview.ok)
        throw new Error(
          preview.diagnostics
            .filter((issue) => issue.severity === 'error')
            .map((issue) => issue.message)
            .join('；') || '此操作无法生成有效预览，请检查目标轴范围',
        );
    }
    const next: FigurePropertyDraftState = {
      ...state,
      template,
      workspace: candidate.workspace,
      selection: nextSelection(state.selection, { ...candidate, template }),
      drafts: {},
    };
    if (data) next.data = data;
    else delete next.data;
    delete next.operationError;
    return next;
  } catch (cause) {
    return {
      ...state,
      operationError:
        cause instanceof Error ? cause.message : '无法完成图层操作',
    };
  }
}
