import { useEffect, useRef, useState } from 'react';
import type { DataBindingSet, DataWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import {
  listPropertyObjects,
  propertyObjectKey,
  type PropertyObjectRef,
} from '../state/property-objects.js';
import { OriginPropertyEditor } from './OriginPropertyEditor.js';
import { usePropertyPreview, DraftPreview } from './PropertyDraftPreview.js';
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
import { usePropertyBatch } from './use-property-batch.js';
import { PropertyBatchEditor } from './PropertyBatchEditor.js';
import { useBeforeUnload } from '../state/use-before-unload.js';

type Props = {
  workspace?: DataWorkspace | undefined;
  onApplyModel?: ((model: WorkspaceEditor) => void) | undefined;
  activePanelId?: string | undefined;
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  onApply: (template: FigureTemplate) => void;
  onDismiss: () => void;
  /** 菜单入口传入的精确对象；未提供时保持旧的默认选择。 */
  initialSelection?: PropertyObjectRef | undefined;
};

function DialogHeader({
  onDismiss,
  kind,
}: {
  onDismiss: () => void;
  kind: PropertyObjectRef['kind'];
}) {
  return (
    <header className="property-dialog-head">
      <div>
        <h2 id="property-dialog-title">
          绘图细节 -{' '}
          {kind === 'page'
            ? '页面属性'
            : kind === 'panel'
              ? '图层属性'
              : kind === 'axis'
                ? '坐标轴属性'
                : '绘图属性'}
        </h2>
      </div>
      <button
        type="button"
        className="property-close"
        aria-label="关闭图形属性"
        onClick={onDismiss}
      >
        ×
      </button>
    </header>
  );
}

function DialogFooter({
  onDismiss,
  onApply,
  onConfirm,
  disabled,
  applyDisabled,
  onBatch,
}: {
  onDismiss: () => void;
  onApply: () => void;
  onConfirm: () => void;
  disabled: boolean;
  applyDisabled: boolean;
  onBatch?: ((mode: 'copy' | 'edit') => void) | undefined;
}) {
  return (
    <footer className="property-dialog-footer">
      {onBatch && (
        <div className="property-batch-entry">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBatch('copy')}
          >
            应用于…
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBatch('edit')}
          >
            多选编辑…
          </button>
        </div>
      )}
      <button
        type="button"
        className="property-apply"
        disabled={disabled}
        onClick={onConfirm}
      >
        确定
      </button>
      <button type="button" className="property-cancel" onClick={onDismiss}>
        取消
      </button>
      <button
        type="button"
        className="property-apply"
        disabled={applyDisabled}
        onClick={onApply}
      >
        应用
      </button>
    </footer>
  );
}

export function FigurePropertiesDialog(props: Props) {
  if (props.initialSelection?.kind === 'axis') {
    return (
      <AxisPropertiesDialog
        {...props}
        panelId={props.initialSelection.panelId}
        axisId={props.initialSelection.axisId}
      />
    );
  }
  return <PlotDetailsDialog {...props} />;
}

function PlotDetailsDialog(props: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [repairRequest, setRepairRequest] = useState<{
    key: string;
    version: number;
  }>();
  const [applied, setApplied] = useState(() =>
    JSON.stringify([props.template, props.workspace]),
  );
  const ref = useRef<HTMLDialogElement>(null);
  const draft = useFigurePropertyDraft(
    props.template,
    props.activePanelId,
    props.data,
    props.workspace,
    props.initialSelection,
  );
  const effectiveData = draft.data;
  const batch = usePropertyBatch(effectiveData);
  const effectiveTemplate = batch.session
    ? (batch.preview ?? draft.template)
    : draft.template;
  useBeforeUnload(
    JSON.stringify([effectiveTemplate, draft.workspace]) !== applied ||
      draft.errors.length > 0,
  );
  const preview = usePropertyPreview(
    effectiveTemplate,
    effectiveData,
    showPreview,
  );
  const lastValidSvg = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (preview.svg) lastValidSvg.current = preview.svg;
  }, [preview.svg]);
  const objects = listPropertyObjects(draft.template);
  const error =
    draft.errors
      .map((issue) => {
        const object = objects.find(
          (entry) => entry.key === propertyObjectKey(issue.ref),
        );
        return (object?.label ?? '对象') + '：' + issue.message;
      })
      .join('；') ||
    draft.operationError ||
    batch.result.error ||
    preview.error;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, []);
  const dismiss = () => {
    ref.current?.close?.();
    props.onDismiss();
  };
  const apply = () => {
    if (error || !preview.validate()) return false;
    if (props.onApplyModel && draft.workspace)
      props.onApplyModel({
        template: effectiveTemplate,
        workspace: draft.workspace,
        activePanelId:
          draft.selection.kind === 'page'
            ? effectiveTemplate.panels[0]!.panelId
            : draft.selection.panelId,
      });
    else props.onApply(effectiveTemplate);
    setApplied(JSON.stringify([effectiveTemplate, draft.workspace]));
    if (batch.session) {
      draft.changeGeometry(effectiveTemplate);
      batch.applied(effectiveTemplate);
    }
    return true;
  };
  const confirm = () => {
    if (error) return;
    if (apply()) dismiss();
  };
  return (
    <dialog
      ref={ref}
      className={`property-dialog origin-dialog${showPreview ? ' has-preview' : ''}`}
      aria-labelledby="property-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <DialogHeader onDismiss={dismiss} kind={draft.selection.kind} />
      <div className="property-dialog-body">
        <PropertyNumberDraftContext.Provider
          value={{
            texts: draft.numberTexts,
            setText: draft.setNumberText,
            clearGeometryTexts: draft.clearGeometryTexts,
          }}
        >
          {batch.session ? (
            <PropertyBatchEditor
              session={batch.session}
              onChange={batch.update}
              error={error}
              onDiscard={batch.close}
              onFinish={() => {
                if (error) return;
                draft.changeGeometry(effectiveTemplate);
                batch.close();
              }}
            />
          ) : (
            <OriginPropertyEditor
              model={
                draft.workspace
                  ? { template: draft.template, workspace: draft.workspace }
                  : undefined
              }
              onModelChange={
                props.onApplyModel && draft.workspace
                  ? draft.changeModel
                  : undefined
              }
              template={draft.template}
              value={draft.value}
              onChange={draft.change}
              onGeometryChange={draft.changeGeometry}
              data={effectiveData}
              selected={draft.selection}
              onSelect={draft.select}
              onResetRange={draft.resetAxisRange}
              onFitRange={draft.fitAxisRange}
              errors={draft.errors}
              repairRequest={repairRequest}
            />
          )}
        </PropertyNumberDraftContext.Provider>
        <DraftPreview
          hidden={!showPreview}
          svg={preview.svg ?? lastValidSvg.current}
          error={error}
          warnings={preview.warnings}
        />
      </div>
      {!showPreview && error && (
        <p className="property-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="origin-preview-toggle"
        aria-label={showPreview ? '收起预览' : '展开预览'}
        aria-expanded={showPreview}
        onClick={() => setShowPreview((value) => !value)}
      >
        {showPreview ? '收起预览' : '显示预览'}
      </button>
      {draft.operationError && (
        <div className="property-error-links">
          <button type="button" onClick={draft.clearOperationError}>
            放弃本次操作
          </button>
        </div>
      )}
      {draft.errors.length > 0 && (
        <div className="property-error-links" aria-label="需要修正的对象">
          {draft.errors.map((issue) => {
            const key = propertyObjectKey(issue.ref);
            const object = objects.find((entry) => entry.key === key);
            return (
              <button
                type="button"
                key={key}
                onClick={() => {
                  draft.select(issue.ref);
                  setRepairRequest((previous) => ({
                    key,
                    version: (previous?.version ?? 0) + 1,
                  }));
                }}
              >
                修正 {object?.label ?? '对象'}
              </button>
            );
          })}
        </div>
      )}
      <DialogFooter
        onDismiss={dismiss}
        onApply={apply}
        onConfirm={confirm}
        disabled={Boolean(error)}
        applyDisabled={
          Boolean(error) ||
          JSON.stringify([effectiveTemplate, draft.workspace]) === applied ||
          (!!batch.session && !batch.ready)
        }
        onBatch={
          !batch.session && draft.selection.kind !== 'page'
            ? (mode) => batch.open(draft.template, draft.selection, mode)
            : undefined
        }
      />
    </dialog>
  );
}
