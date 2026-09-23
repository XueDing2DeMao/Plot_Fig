import { useMemo, useRef, useState, useId } from 'react';
import { bindTableToPlot, bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { changeSeries } from '../state/workspace-editor.js';
import { tableActions, figureActions } from '../state/workspace-actions.js';
import { plotBindingEntries } from '@plot-fig/figure-schema';
import { listPropertyObjects } from '../state/property-objects.js';
import { OriginTabs } from './OriginTabs.js';
import { EditorModal } from './EditorModal.js';
import { useFigurePropertyDraft } from './use-figure-property-draft.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import { OriginPropertyEditor } from './OriginPropertyEditor.js';
import { WorkspaceBindingPanel } from './WorkspaceBindingPanel.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { PropertyObjectNavigation } from './PropertyObjectNavigation.js';
import { F4CurveLayerFields } from './F4CurveLayerFields.js';
import { PlotPanelFields } from './PlotPanelFields.js';
import { SvgSurface } from './SvgSurface.js';
import { LayerOrderFields } from './LayerOrderFields.js';
import { LayerManagementFields } from './LayerManagementFields.js';
import './origin-management.css';

export type OriginGraphManagementMode =
  'layer-management' | 'layer-contents' | 'plot-setup';
const names = {
  'layer-management': '图层管理',
  'layer-contents': '图层内容',
  'plot-setup': '图表绘制',
};
const layerTabs = [
  { key: 'membership', label: '常用操作' },
  { key: 'layout', label: '排列图层' },
  { key: 'frame', label: '大小/位置' },
  { key: 'link', label: '图层联动' },
  { key: 'axes', label: '坐标轴' },
  { key: 'display', label: '显示' },
];
type Props = {
  mode: OriginGraphManagementMode;
  model: WorkspaceEditor;
  panelId: string;
  onApply: (model: WorkspaceEditor) => void;
  onDismiss: () => void;
};

export function OriginGraphManagementDialog({
  mode: initialMode,
  model,
  panelId,
  onApply,
  onDismiss,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [tab, setTab] = useState('membership');
  const [properties, setProperties] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const managerScroll = useRef<HTMLDivElement>(null);
  const tabsId = useId();
  const [appliedPreview, setAppliedPreview] = useState(model);
  const [committed, setCommitted] = useState(() =>
    JSON.stringify([model.template, model.workspace]),
  );
  const initial = useMemo(
    () => ({ kind: 'panel' as const, panelId }),
    [panelId],
  );
  const initialData = useMemo(
    () =>
      model.workspace.tables.length
        ? bindWorkspace(model.template, model.workspace)
        : undefined,
    [model],
  );
  const draft = useFigurePropertyDraft(
    model.template,
    panelId,
    initialData,
    model.workspace,
    initial,
  );
  const current: WorkspaceEditor = {
    template: draft.template,
    workspace: draft.workspace!,
    activePanelId:
      draft.selection.kind === 'page' ? panelId : draft.selection.panelId,
  };
  const panel = current.template.panels.find(
    (item) => item.panelId === current.activePanelId,
  );
  const [source, setSource] = useState<{
    tableId: string;
    columnId: string;
  } | null>(null);
  const [lastApplied, setLastApplied] = useState(() =>
    JSON.stringify([model.template, model.workspace]),
  );
  const dirty =
    lastApplied !== JSON.stringify([current.template, current.workspace]);
  const error =
    draft.errors.map((error) => error.message).join('；') ||
    draft.operationError;
  const table = tableActions(current, draft.changeModel);
  const figure = figureActions(draft.changeModel);
  const plotId =
    draft.selection.kind === 'plot' ? draft.selection.plotSlotId : '';
  const plotIndex =
    panel?.plotSlots.findIndex((plot) => plot.plotSlotId === plotId) ?? -1;
  const preview = useMemo(() => {
    if (mode === 'layer-management') {
      const data = appliedPreview.workspace.tables.length
        ? bindWorkspace(appliedPreview.template, appliedPreview.workspace)
        : undefined;
      return data ? renderFigureSvg(appliedPreview.template, data) : undefined;
    }
    return draft.data ? renderFigureSvg(draft.template, draft.data) : undefined;
  }, [mode, appliedPreview, draft.template, draft.data]);
  const previewChanged =
    JSON.stringify([appliedPreview.template, appliedPreview.workspace]) !==
    committed;
  const apply = () => {
    if (error || !panel) return;
    if (mode === 'layer-management') {
      setAppliedPreview(current);
      setShowPreview(true);
      if (managerScroll.current) managerScroll.current.scrollTop = 0;
    } else onApply(current);
    setLastApplied(JSON.stringify([current.template, current.workspace]));
  };
  const add = () => {
    if (!source || !panel) return;
    draft.changeModel((previous) => {
      const next = changeSeries(previous, 'add');
      const plot = next.template.panels
        .find((item) => item.panelId === panel.panelId)!
        .plotSlots.at(-1)!;
      const valueRole =
        plot.kind === 'heatmap' || plot.kind === 'contour'
          ? 'z'
          : plot.kind === 'histogram' || plot.kind === 'box'
            ? 'values'
            : plot.kind === 'bar'
              ? 'value'
              : 'y';
      const valueSlot = plotBindingEntries(plot).find(
        (entry) => entry.role === valueRole,
      )?.slotId;
      if (!valueSlot) return previous;
      const workspace = bindTableToPlot(next.workspace, next.template, {
        plotSlotId: plot.plotSlotId,
        tableId: source.tableId,
      });
      return {
        ...next,
        workspace: {
          ...workspace,
          slotBindings: {
            ...workspace.slotBindings,
            [valueSlot]: source,
          },
        },
      };
    });
  };
  const sources = (
    <div className="origin-datasets" role="group" aria-label="可用数据集">
      {current.workspace.tables.length ? (
        current.workspace.tables.map((data) => (
          <fieldset key={data.tableId}>
            <legend>{data.name}</legend>
            {data.columns
              .filter((column) => column.settings.type === 'number')
              .map((column) => (
                <button
                  type="button"
                  key={column.columnId}
                  aria-pressed={
                    source?.tableId === data.tableId &&
                    source.columnId === column.columnId
                  }
                  onClick={() =>
                    setSource({
                      tableId: data.tableId,
                      columnId: column.columnId,
                    })
                  }
                >
                  {column.name}
                </button>
              ))}
          </fieldset>
        ))
      ) : (
        <p>导入数据后，此处列出可用数据集。</p>
      )}
    </div>
  );
  const objects = listPropertyObjects(current.template).filter((object) =>
    mode === 'layer-management'
      ? object.ref.kind === 'panel' ||
        (tab === 'axes' && object.ref.kind === 'axis')
      : object.ref.kind === 'panel' || object.ref.kind === 'plot',
  );
  const tree = (
    <PropertyObjectNavigation
      objects={
        mode === 'layer-management'
          ? objects.map((object) => {
              if (object.ref.kind === 'page') return object;
              const objectPanelId = object.ref.panelId;
              const index = current.template.panels.findIndex(
                (item) => item.panelId === objectPanelId,
              );
              const item = current.template.panels[index]!;
              const name = item.name || `图层 ${index + 1}`;
              return {
                ...object,
                depth: object.ref.kind === 'panel' ? 0 : 1,
                label: object.ref.kind === 'panel' ? name : object.label,
                caption:
                  object.ref.kind === 'panel'
                    ? `${item.plotSlots.length} 条曲线 · ${item.visible === false ? '已隐藏' : '显示中'}`
                    : name,
              };
            })
          : objects
      }
      selected={draft.selection}
      onSelect={draft.select}
      errors={draft.errors}
      label={mode === 'layer-management' ? '图层列表' : '属性对象'}
    />
  );
  return (
    <EditorModal
      className={
        'origin-tool-dialog' +
        (mode === 'layer-management' ? ' origin-layer-manager' : '')
      }
      title={names[mode]}
      onDismiss={onDismiss}
      footer={
        <>
          {mode === 'layer-management' && (
            <>
              <p className="origin-manager-status" role="status">
                {dirty
                  ? '有未预览的更改，请先更新预览。'
                  : previewChanged
                    ? '预览已更新，点击确定保存到图形。'
                    : '调整设置后更新预览；取消将放弃本次更改。'}
              </p>
              <button type="button" onClick={onDismiss}>
                取消
              </button>
              <button
                type="button"
                disabled={!!error || !dirty}
                onClick={apply}
              >
                更新预览
              </button>
            </>
          )}
          {mode === 'layer-contents' && (
            <>
              <button
                type="button"
                disabled={!!error}
                onClick={() => setProperties(true)}
              >
                图层属性...
              </button>
              <button
                type="button"
                disabled={!!error}
                onClick={() => setMode('plot-setup')}
              >
                图表绘制...
              </button>
            </>
          )}
          {mode !== 'layer-contents' && (
            <button
              type="button"
              className={mode === 'layer-management' ? 'ui-primary' : undefined}
              disabled={
                !!error ||
                (mode === 'layer-management' && (!previewChanged || dirty))
              }
              onClick={() => {
                if (mode === 'layer-management') {
                  onApply(appliedPreview);
                  setCommitted(
                    JSON.stringify([
                      appliedPreview.template,
                      appliedPreview.workspace,
                    ]),
                  );
                } else apply();
                if (!error) onDismiss();
              }}
            >
              确定
            </button>
          )}
          {mode !== 'layer-management' && (
            <button type="button" onClick={onDismiss}>
              {mode === 'layer-contents' ? '关闭' : '取消'}
            </button>
          )}
          {mode !== 'layer-management' && (
            <button type="button" disabled={!!error || !dirty} onClick={apply}>
              应用
            </button>
          )}
          {mode === 'layer-contents' && (
            <button type="button" onClick={onDismiss}>
              取消
            </button>
          )}
        </>
      }
    >
      <PropertyNumberDraftContext.Provider
        value={{
          texts: draft.numberTexts,
          setText: draft.setNumberText,
          clearGeometryTexts: draft.clearGeometryTexts,
        }}
      >
        {panel && mode === 'layer-management' && (
          <div className="origin-manager-layout">
            <aside className="origin-manager-sidebar">
              <div className="origin-manager-list-heading">
                <h3>图层列表</h3>
                <span>{current.template.panels.length} / 16</span>
              </div>
              {tree}
            </aside>
            <div className="origin-manager-editor">
              <div className="origin-manager-toolbar">
                <div>
                  <h3>
                    {panel.name ||
                      `图层 ${current.template.panels.indexOf(panel) + 1}`}
                  </h3>
                  <p>设置当前图层，更新预览后确认保存。</p>
                </div>
                <button
                  type="button"
                  aria-expanded={showPreview}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? '收起预览' : '显示预览'}
                </button>
              </div>
              <OriginTabs
                id={tabsId}
                items={layerTabs}
                selected={tab}
                onSelect={(next) => {
                  setTab(next);
                  if (next !== 'axes' && draft.selection.kind === 'axis')
                    draft.select({ kind: 'panel', panelId: panel.panelId });
                }}
                label="图层管理分类"
              />
              <div
                className="origin-manager-scroll"
                ref={managerScroll}
                role="tabpanel"
                id={`${tabsId}-panel`}
                aria-labelledby={`${tabsId}-${tab}`}
              >
                <section
                  className="origin-manager-preview"
                  aria-label="图层预览"
                  hidden={!showPreview}
                >
                  <h4>图层预览</h4>
                  {preview?.ok ? (
                    <SvgSurface svg={preview.svg} label="图层预览图" />
                  ) : (
                    <div className="origin-manager-empty">
                      <strong>暂无可绘制数据</strong>
                      <p>
                        {preview?.ok === false
                          ? [
                              ...new Set(
                                preview.diagnostics.map(
                                  (diagnostic) => diagnostic.message,
                                ),
                              ),
                            ].join('；')
                          : '图层设置仍可保存；导入数据并完成绑定后可显示预览。'}
                      </p>
                    </div>
                  )}
                  <p className="property-hint">
                    {dirty
                      ? '此处显示上次更新的结果，当前更改尚未预览。'
                      : '此处显示已更新的预览，确定后应用到图形。'}
                  </p>
                </section>
                {tab === 'membership' ? (
                  <div className="origin-manager-common">
                    <LayerManagementFields
                      key={panel.panelId}
                      model={current}
                      panelId={panel.panelId}
                      disabled={!!error}
                      onChange={draft.changeModel}
                      compact
                    />
                    <LayerOrderFields
                      template={draft.template}
                      panelId={panel.panelId}
                      disabled={!!error}
                      onChange={draft.changeGeometry}
                    />
                  </div>
                ) : (
                  <OriginPropertyEditor
                    section={
                      tab === 'axes'
                        ? draft.selection.kind === 'axis'
                          ? 'scale'
                          : 'display'
                        : tab
                    }
                    template={draft.template}
                    model={current}
                    onModelChange={draft.changeModel}
                    data={draft.data}
                    value={draft.value}
                    onChange={draft.change}
                    selected={draft.selection}
                    onSelect={draft.select}
                    onGeometryChange={draft.changeGeometry}
                    onResetRange={draft.resetAxisRange}
                    onFitRange={draft.fitAxisRange}
                    errors={draft.errors}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {panel && mode === 'layer-contents' && (
          <>
            <div className="origin-contents-layout">
              {sources}
              <div className="origin-transfer-buttons">
                <button
                  type="button"
                  aria-label="添加绘图"
                  disabled={!source || !!error}
                  onClick={add}
                >
                  →
                </button>
                <button
                  type="button"
                  aria-label="移除绘图"
                  disabled={!plotId || !!error}
                  onClick={() =>
                    draft.changeModel((model) =>
                      changeSeries(model, 'remove', plotId, true),
                    )
                  }
                >
                  ←
                </button>
              </div>
              <div>
                {tree}
                <div className="origin-order-buttons">
                  <button
                    type="button"
                    disabled={plotIndex <= 0 || !!error}
                    onClick={() => figure.onSeries('up', plotId)}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={
                      plotIndex < 0 ||
                      plotIndex >= panel.plotSlots.length - 1 ||
                      !!error
                    }
                    onClick={() => figure.onSeries('down', plotId)}
                  >
                    下移
                  </button>
                </div>
              </div>
            </div>
            <div className="origin-contents-details">
              <F4CurveLayerFields
                panel={panel}
                tab="groups"
                invalid={!!error}
                onChange={(next) =>
                  draft.changeModel((before) => ({
                    ...before,
                    template: {
                      ...before.template,
                      panels: before.template.panels.map((item) =>
                        item.panelId === next.panelId ? next : item,
                      ),
                    },
                  }))
                }
              />
              {plotId && (
                <PlotPanelFields
                  model={current}
                  plotId={plotId}
                  disabled={!!error}
                  onChange={draft.changeModel}
                />
              )}
            </div>
          </>
        )}
        {panel && mode === 'plot-setup' && (
          <div className="origin-plot-setup">
            <details open>
              <summary>可用数据</summary>
              {sources}
            </details>
            <details open>
              <summary>数据列绑定</summary>
              <WorkspaceBindingPanel
                activePanelId={panel.panelId}
                template={current.template}
                workspace={current.workspace}
                data={draft.data}
                {...table}
                {...figure}
                onName={(plotSlotId, value) =>
                  figure.onInlineText(
                    {
                      kind: 'legend-entry',
                      panelId: panel.panelId,
                      plotSlotId,
                    },
                    value,
                  )
                }
              />
            </details>
            <details open>
              <summary>图层与绘图</summary>
              {tree}
            </details>
          </div>
        )}
      </PropertyNumberDraftContext.Provider>
      {error && (
        <div role="alert" className="property-error">
          {error}
          {draft.operationError && (
            <button type="button" onClick={draft.clearOperationError}>
              放弃本次操作
            </button>
          )}
        </div>
      )}
      {properties && panel && (
        <FigurePropertiesDialog
          template={current.template}
          workspace={current.workspace}
          data={draft.data}
          initialSelection={{ kind: 'panel', panelId: panel.panelId }}
          onApply={draft.changeGeometry}
          onApplyModel={(value) => draft.changeModel(() => value)}
          onDismiss={() => setProperties(false)}
        />
      )}
    </EditorModal>
  );
}
