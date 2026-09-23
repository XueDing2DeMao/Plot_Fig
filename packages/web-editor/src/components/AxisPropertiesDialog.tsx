import { useEffect, useMemo, useRef, useState, useId } from 'react';
import { useBeforeUnload } from '../state/use-before-unload.js';
import type { DataBindingSet, DataWorkspace } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';
import { OriginAxisFields } from './OriginAxisFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import { OriginTabs, originAxisTabs } from './OriginTabs.js';
import { figureCoordinates } from '@plot-fig/svg-renderer';
import { usePropertyPreview, DraftPreview } from './PropertyDraftPreview.js';
import { AxisLengthRatioFields } from './AxisLengthRatioFields.js';
import { AxisCreationFields } from './AxisCreationFields.js';
import { usePropertyBatch } from './use-property-batch.js';
import { PropertyBatchEditor } from './PropertyBatchEditor.js';
import {
  listPropertyObjects,
  propertyObjectKey,
} from '../state/property-objects.js';
import './figure-properties-dialog.css';
import './axis-properties-dialog.css';

type Props = {
  template: FigureTemplate;
  panelId: string;
  axisId: string;
  data?: DataBindingSet | undefined;
  workspace?: DataWorkspace | undefined;
  onApply: (template: FigureTemplate) => void;
  onApplyModel?: ((model: WorkspaceEditor) => void) | undefined;
  onDismiss: () => void;
};

function axisSelectorLabel(
  axis: FigureTemplate['panels'][number]['axes'][number],
  axes: FigureTemplate['panels'][number]['axes'],
  tab: string,
): string {
  if (tab === 'scale') {
    const dimensionCount = axes.filter(
      (candidate) => candidate.dimension === axis.dimension,
    ).length;
    if (dimensionCount === 1) return axis.dimension === 'x' ? '水平' : '垂直';
    return {
      bottom: '下 X 轴',
      top: '上 X 轴',
      left: '左 Y 轴',
      right: '右 Y 轴',
    }[axis.position];
  }
  return {
    bottom: '下轴',
    top: '上轴',
    left: '左轴',
    right: '右轴',
  }[axis.position];
}

export function AxisPropertiesDialog({
  template,
  panelId,
  axisId,
  data,
  workspace,
  onApply,
  onApplyModel,
  onDismiss,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const tabsId = useId();
  const axisRef = useMemo(
    () => ({ kind: 'axis' as const, panelId, axisId }),
    [panelId, axisId],
  );
  const draft = useFigurePropertyDraft(
    template,
    panelId,
    data,
    workspace,
    axisRef,
  );
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, []);
  const [tab, setTab] = useState('scale');
  const [showPreview, setShowPreview] = useState(true);
  const batch = usePropertyBatch(draft.data);
  const effectiveTemplate = batch.session
    ? (batch.preview ?? draft.template)
    : draft.template;
  const [applied, setApplied] = useState(() =>
    JSON.stringify([template, workspace]),
  );
  const dirty =
    JSON.stringify([effectiveTemplate, draft.workspace]) !== applied;
  useBeforeUnload(dirty || draft.errors.length > 0);
  const axis = draft.value.kind === 'axis' ? draft.value : undefined;
  const selection = draft.selection.kind === 'axis' ? draft.selection : null;
  const panel = draft.template.panels.find(
    (item) => item.panelId === selection?.panelId,
  );
  const selectedAxis = panel?.axes.find(
    (item) => item.axisId === selection?.axisId,
  );
  const ratioGeometry = useMemo(() => {
    try {
      return panel?.axisLengthRatio
        ? figureCoordinates(draft.template, draft.data).panels.get(
            panel.panelId,
          )
        : undefined;
    } catch {
      return undefined;
    }
  }, [draft.template, draft.data, panel]);
  const preview = usePropertyPreview(
    effectiveTemplate,
    draft.data,
    showPreview,
  );
  const lastValidSvg = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (preview.svg) lastValidSvg.current = preview.svg;
  }, [preview.svg]);
  const error =
    draft.errors.map((issue) => issue.message).join('；') ||
    draft.operationError ||
    batch.result.error ||
    preview.error;
  const dismiss = () => {
    ref.current?.close?.();
    onDismiss();
  };
  const apply = () => {
    if (error || !axis || !selectedAxis || !preview.validate()) return false;
    if (onApplyModel && draft.workspace)
      onApplyModel({
        template: effectiveTemplate,
        workspace: draft.workspace,
        activePanelId: panelId,
      });
    else onApply(effectiveTemplate);
    setApplied(JSON.stringify([effectiveTemplate, draft.workspace]));
    if (batch.session) {
      draft.changeGeometry(effectiveTemplate);
      batch.applied(effectiveTemplate);
    }
    return true;
  };
  return (
    <dialog
      ref={ref}
      className={`property-dialog axis-properties-dialog${showPreview ? ' has-preview' : ''}`}
      aria-label="坐标轴属性"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <header className="axis-properties-dialog__header">
        <div>
          <h2>坐标轴属性</h2>
          <p>
            {panel?.name ?? panelId} ·{' '}
            {selectedAxis?.dimension === 'x' ? 'X' : 'Y'} 轴
          </p>
        </div>
        <button type="button" aria-label="关闭坐标轴属性" onClick={dismiss}>
          ×
        </button>
      </header>
      <div className="property-dialog-body axis-properties-dialog__body">
        <div className="axis-properties-dialog__editor">
          {axis && selectedAxis ? (
            <PropertyNumberDraftContext.Provider
              value={{
                texts: draft.numberTexts,
                setText: draft.setNumberText,
                clearGeometryTexts: draft.clearGeometryTexts,
              }}
            >
              {batch.session ? (
                <div className="axis-properties-dialog__batch">
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
                </div>
              ) : (
                <>
                  <OriginTabs
                    id={tabsId}
                    items={originAxisTabs}
                    selected={tab}
                    onSelect={setTab}
                    label="坐标轴属性分类"
                  />
                  <div className="origin-axis-layout">
                    <nav
                      className="origin-axis-selector"
                      aria-label="坐标轴选择"
                    >
                      {[...panel!.axes]
                        .sort(
                          (a, b) =>
                            ['bottom', 'top', 'left', 'right'].indexOf(
                              a.position,
                            ) -
                            ['bottom', 'top', 'left', 'right'].indexOf(
                              b.position,
                            ),
                        )
                        .map((a) => (
                          <button
                            type="button"
                            key={a.axisId}
                            aria-pressed={selectedAxis.axisId === a.axisId}
                            onClick={() =>
                              draft.select({
                                kind: 'axis',
                                panelId: panel!.panelId,
                                axisId: a.axisId,
                              })
                            }
                          >
                            {axisSelectorLabel(a, panel!.axes, tab)}
                          </button>
                        ))}
                    </nav>
                    <section
                      role="tabpanel"
                      id={`${tabsId}-panel`}
                      aria-labelledby={`${tabsId}-${tab}`}
                      className="axis-properties-dialog__form"
                    >
                      <OriginAxisFields
                        value={axis}
                        onChange={draft.change}
                        onResetRange={draft.resetAxisRange}
                        onFitRange={draft.fitAxisRange}
                        tab={tab}
                        axes={panel?.axes ?? []}
                        axis={selectedAxis}
                        template={draft.template}
                        model={
                          draft.workspace
                            ? {
                                template: draft.template,
                                workspace: draft.workspace,
                              }
                            : undefined
                        }
                        onModelChange={
                          onApplyModel && draft.workspace
                            ? draft.changeModel
                            : undefined
                        }
                      />
                      {tab === 'display' && panel && (
                        <>
                          <AxisCreationFields
                            template={draft.template}
                            panelId={panel.panelId}
                            disabled={!!error}
                            onChange={draft.changeGeometry}
                          />
                          <AxisLengthRatioFields
                            template={draft.template}
                            panel={panel}
                            selectedAxisId={selectedAxis.axisId}
                            value={axis.axisLengthRatio}
                            pending={ratioGeometry?.ratioStatus === 'pending'}
                            onChange={(ratio) => {
                              const next = { ...axis };
                              if (ratio) next.axisLengthRatio = ratio;
                              else delete next.axisLengthRatio;
                              draft.change(next);
                            }}
                          />
                        </>
                      )}
                    </section>
                  </div>
                </>
              )}
            </PropertyNumberDraftContext.Provider>
          ) : (
            <p>正在载入坐标轴属性…</p>
          )}
          {error && !showPreview && (
            <p className="axis-properties-dialog__error" role="alert">
              {error}
            </p>
          )}
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
                const object = listPropertyObjects(draft.template).find(
                  (entry) => entry.key === key,
                );
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => {
                      batch.close();
                      draft.select(issue.ref);
                    }}
                  >
                    修正 {object?.label ?? '坐标轴'}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DraftPreview
          hidden={!showPreview}
          svg={preview.svg ?? lastValidSvg.current}
          error={error}
          warnings={preview.warnings}
        />
      </div>
      <button
        type="button"
        className="origin-preview-toggle"
        aria-label={showPreview ? '收起预览' : '展开预览'}
        aria-expanded={showPreview}
        onClick={() => setShowPreview((value) => !value)}
      >
        {showPreview ? '<<' : '>>'}
      </button>
      <footer className="axis-properties-dialog__footer">
        {!batch.session && selection && (
          <div className="property-batch-entry">
            <button
              type="button"
              disabled={!!error}
              onClick={() => batch.open(draft.template, selection, 'copy')}
            >
              应用于…
            </button>
            <button
              type="button"
              disabled={!!error}
              onClick={() => batch.open(draft.template, selection, 'edit')}
            >
              多选编辑…
            </button>
          </div>
        )}
        <button
          type="button"
          className="axis-properties-dialog__ok"
          disabled={Boolean(error) || !axis}
          onClick={() => {
            if (apply()) dismiss();
          }}
        >
          确定
        </button>
        <button type="button" onClick={dismiss}>
          取消
        </button>
        <button
          type="button"
          className="axis-properties-dialog__apply"
          disabled={
            Boolean(error) ||
            !axis ||
            !dirty ||
            (!!batch.session && !batch.ready)
          }
          onClick={apply}
        >
          应用
        </button>
      </footer>
    </dialog>
  );
}
