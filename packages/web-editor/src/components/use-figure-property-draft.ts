import {
  bindWorkspace,
  type DataBindingSet,
  type DataWorkspace,
} from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { applyPropertyModel } from './property-model-draft.js';
import { useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  initialPropertyObject,
  propertyObjectKey,
  resolvePropertyObject,
  type PropertyObjectRef,
} from '../state/property-objects.js';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import {
  changePropertyDraft,
  applyPropertyGeometry,
  clearPropertyGeometryTexts,
  readPropertyDraft,
  resetPropertyAxisRange,
  setPropertyNumberText,
  type FigurePropertyDraftState,
} from './figure-property-draft-state.js';

export function useFigurePropertyDraft(
  template: FigureTemplate,
  activePanelId?: string,
  data?: DataBindingSet,
  workspace?: DataWorkspace,
  initialSelection?: PropertyObjectRef,
) {
  // 菜单命令可以把明确的对象引用传入属性事务。引用无效时才回退到
  // 当前图层的默认对象，避免旧入口在没有目标信息时改变既有行为。
  const requestedSelection = initialSelection
    ? resolvePropertyObject(template, initialSelection)
    : initialPropertyObject(template, activePanelId);
  const [state, setState] = useState<FigurePropertyDraftState>(() => {
    const draftTemplate = structuredClone(template);
    const draftWorkspace = workspace ? structuredClone(workspace) : undefined;
    // 主预览可能只绑定当前图层；属性事务需要与完整模板对应的数据。
    const draftData = draftWorkspace
      ? draftWorkspace.tables.length
        ? bindWorkspace(draftTemplate, draftWorkspace)
        : undefined
      : data;
    return {
      template: draftTemplate,
      ...(draftData ? { data: draftData } : {}),
      ...(draftWorkspace ? { workspace: draftWorkspace } : {}),
      selection: requestedSelection,
      drafts: {},
    };
  });
  const selection = state.selection;
  const value = readPropertyDraft(state, selection);
  return {
    template: state.template,
    workspace: state.workspace,
    data: state.data,
    operationError: state.operationError,
    clearOperationError: () =>
      setState((current) => {
        const next = { ...current };
        delete next.operationError;
        return next;
      }),
    changeModel: (operation: (model: WorkspaceEditor) => WorkspaceEditor) =>
      setState((current) => applyPropertyModel(current, operation)),
    selection,
    value,
    select: (ref: PropertyObjectRef) =>
      setState((current) => ({
        ...current,
        selection: resolvePropertyObject(current.template, ref),
      })),
    change: (next: PropertyObjectSettings, preserveLayerSize?: boolean) =>
      setState((current) =>
        changePropertyDraft(
          preserveLayerSize === undefined
            ? current
            : { ...current, preserveLayerSize },
          selection,
          value,
          next,
        ),
      ),
    changeGeometry: (next: FigureTemplate) =>
      setState((current) => applyPropertyGeometry(current, next)),
    clearGeometryTexts: () => setState(clearPropertyGeometryTexts),
    fitAxisRange: () =>
      setState((current) => resetPropertyAxisRange(current, selection, 'fit')),
    resetAxisRange: () =>
      setState((current) => resetPropertyAxisRange(current, selection)),
    errors: Object.values(state.drafts).flatMap((draft) =>
      draft.error ? [{ ref: draft.ref, message: draft.error }] : [],
    ),
    numberTexts: state.drafts[propertyObjectKey(selection)]?.numberTexts ?? {},
    setNumberText: (label: string, text: string, path?: string[]) =>
      setState((current) =>
        setPropertyNumberText(current, selection, label, text, path),
      ),
  };
}
