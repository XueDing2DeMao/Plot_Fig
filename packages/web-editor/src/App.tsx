import { useEffect, useRef, useState } from 'react';
import { multiAxisPreset } from './state/multi-axis-presets.js';
import { hasLayerAxisLinks } from './state/layer-batch.js';
import { LayerDeleteControls } from './components/LayerDeleteControls.js';
import { LayerCreateControls } from './components/LayerCreateControls.js';
import { LayerFormatControls } from './components/LayerFormatControls.js';
import { TemplateLibraryControls } from './components/TemplateLibraryControls.js';
import { FigurePreview } from './components/FigurePreview.js';
import { FigurePropertiesPanel } from './components/FigurePropertiesPanel.js';
import { PlotSettingsPanel } from './components/PlotSettingsPanel.js';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.js';
import { ProjectControls } from './components/ProjectControls.js';
import { DataImportPanel } from './components/DataImportPanel.js';
import { WorkspaceTablePanel } from './components/WorkspaceTablePanel.js';
import { WorkspaceTableList } from './components/WorkspaceTableList.js';
import { WorkspaceFiles } from './components/WorkspaceFiles.js';
import { WorkspaceDialog } from './components/WorkspaceDialog.js';
import { WorkspaceBindingPanel } from './components/WorkspaceBindingPanel.js';
import {
  OriginGraphManagementDialog,
  type OriginGraphManagementMode,
} from './components/OriginGraphManagementDialog.js';
import { OriginExportDialog } from './components/OriginExportDialog.js';
import { TemplateLibraryDialog } from './components/TemplateLibraryDialog.js';
import type { PropertyObjectRef } from './state/property-objects.js';
import { FigureActionMenus } from './components/FigureActionMenus.js';
import type { OriginMenuCommand } from './state/origin-menu-model.js';
import {
  activateOriginWindow,
  createOriginWorkspaceState,
  resolveOriginPropertyCommand,
  resolveOriginAxisCommand,
  existsInTemplate,
  selectOriginObject,
} from './state/origin-workspace.js';
import { useWorkspaceEditor } from './state/use-workspace-editor.js';
import { usePlotSetup } from './state/use-plot-setup.js';
import { useBeforeUnload } from './state/use-before-unload.js';
import { seriesBindingSummary } from './components/series-binding-summary.js';
import type { SeriesRevealRequest } from './components/use-series-disclosure.js';
import './components/workspace.css';
import './components/origin-menu-bar.css';

type Editor = ReturnType<typeof useWorkspaceEditor>;
type PlotSetup = ReturnType<typeof usePlotSetup>;
const workspaceSections = [
  { id: 'import', label: '导入数据' },
  { id: 'binding', label: '数据绑定' },
  { id: 'style', label: '图形设置' },
  { id: 'preview', label: '图形预览' },
  { id: 'export', label: '导出图形' },
  { id: 'project', label: '项目文件' },
];

function currentWorkspaceSection() {
  return (
    workspaceSections.find(({ id }) => window.location.hash === `#${id}`)?.id ??
    'import'
  );
}

function Sidebar({
  workspace,
  onPreview,
}: {
  workspace: PlotSetup['workspace'];
  onPreview: (id: string) => void;
}) {
  const [activeSection, setActiveSection] = useState(currentWorkspaceSection);
  useEffect(() => {
    const updateSection = () => setActiveSection(currentWorkspaceSection());
    window.addEventListener('hashchange', updateSection);
    return () => window.removeEventListener('hashchange', updateSection);
  }, []);
  return (
    <aside className="app-sidebar">
      <p className="side-label">工作区</p>
      <nav className="workspace-nav" aria-label="工作区导航">
        {workspaceSections.map(({ id, label }, index) => (
          <a
            key={id}
            className={activeSection === id ? 'active' : undefined}
            aria-current={activeSection === id ? 'location' : undefined}
            href={`#${id}`}
          >
            <b>0{index + 1}</b>
            {label}
          </a>
        ))}
      </nav>
      <WorkspaceFiles workspace={workspace} onPreview={onPreview} />
    </aside>
  );
}
function WorkspaceContent({
  editor,
  setup,
  previewTableId,
  onPreviewTable,
  onActivate,
  onSelect,
  onSelectLayer,
  onOpen,
  onApplyLayers,
  menus,
  onExport,
  onConfirm,
  bindingReveal,
}: {
  editor: Editor;
  setup: PlotSetup;
  previewTableId: string | null;
  onPreviewTable: (id: string | null) => void;
  onActivate: (context: 'graph' | 'worksheet') => void;
  onSelect: (ref: PropertyObjectRef) => void;
  onSelectLayer: (panelId: string) => void;
  onOpen: (ref: PropertyObjectRef) => void;
  onApplyLayers: PlotSetup['applyBatch'];
  menus: React.ReactNode;
  onExport: () => void;
  onConfirm: PlotSetup['confirm'];
  bindingReveal: SeriesRevealRequest | undefined;
}) {
  const previewWorkspace = {
    ...setup.workspace,
    activeTableId: setup.workspace.tables.some(
      (table) => table.tableId === previewTableId,
    )
      ? previewTableId!
      : setup.workspace.activeTableId,
  };
  return (
    <>
      <div className="editor-layout">
        <div className="primary-column">
          <div
            data-testid="origin-worksheet-window"
            className="data-setup-stack"
            id="import"
            onMouseDown={() => onActivate('worksheet')}
            onFocusCapture={() => onActivate('worksheet')}
          >
            <DataImportPanel
              onImport={setup.onImport}
              hasData={setup.workspace.tables.length > 0}
            />
            <section id="binding" tabIndex={-1}>
              <WorkspaceBindingPanel
                revealRequest={bindingReveal}
                activePanelId={setup.activePanel.panelId}
                template={setup.template}
                workspace={setup.workspace}
                data={setup.data}
                onTable={setup.onTable}
                onColumn={setup.onColumn}
                onName={(plotSlotId, value) =>
                  setup.onInlineText(
                    {
                      kind: 'legend-entry',
                      panelId: setup.activePanel.panelId,
                      plotSlotId,
                    },
                    value,
                  )
                }
                onSeries={setup.onSeries}
              />
            </section>
          </div>
          <div
            id="preview"
            onMouseDown={() => onActivate('graph')}
            onFocusCapture={() => onActivate('graph')}
          >
            <FigurePreview
              template={editor.template}
              layers={setup.template.panels}
              activePanelId={setup.activePanel.panelId}
              onSelectLayer={onSelectLayer}
              combinedPreview={editor.combinedPreview}
              pending={setup.pending}
              onExport={onExport}
              exportDisabled={
                editor.workspace.tables.length === 0 ||
                (!setup.pending &&
                  !editor.exportSvg &&
                  editor.template.panels.length < 2)
              }
              onSelectObject={onSelect}
              onOpenObject={onOpen}
              onInlineTextChange={editor.onInlineText}
              svg={editor.svg}
              layerActions={
                <>
                  <LayerFormatControls
                    key={editor.openedVersion}
                    template={setup.template}
                    activePanelId={setup.activePanel.panelId}
                    onApply={(_template, snapshot, scope) =>
                      setup.onLayerFormat(
                        snapshot,
                        setup.activePanel.panelId,
                        scope,
                      )
                    }
                  />
                  <LayerCreateControls
                    model={{
                      template: setup.template,
                      workspace: setup.workspace,
                      activePanelId: setup.activePanel.panelId,
                    }}
                    onApply={onApplyLayers}
                  />
                  <LayerDeleteControls
                    model={{
                      template: setup.template,
                      workspace: setup.workspace,
                      activePanelId: setup.activePanel.panelId,
                    }}
                    onApply={onApplyLayers}
                  />
                </>
              }
              actions={
                <div
                  className="figure-action-toolbar"
                  role="group"
                  aria-label="绘图功能菜单"
                >
                  <TemplateLibraryControls
                    model={{
                      template: setup.template,
                      workspace: setup.workspace,
                      activePanelId: setup.activePanel.panelId,
                    }}
                    onApply={setup.applyBatch}
                  />
                  <FigurePropertiesPanel
                    workspace={editor.workspace}
                    onApplyModel={editor.onModel}
                    activePanelId={editor.activePanel.panelId}
                    template={editor.template}
                    data={editor.data}
                    onApply={editor.onTemplate}
                  />
                  {menus}
                </div>
              }
            />
          </div>
        </div>
        <aside className="right-stack">
          <section
            id="style"
            onMouseDown={() => onActivate('graph')}
            onFocusCapture={() => onActivate('graph')}
          >
            <PlotSettingsPanel
              lineDash={setup.lineDash}
              markerShape={setup.markerShape}
              onLineDashChange={setup.onLineDash}
              onMarkerShapeChange={setup.onMarkerShape}
              appearanceAvailable={setup.appearanceAvailable}
              choice={setup.choice}
              onChoice={setup.onChoice}
              onConfirm={onConfirm}
              onReset={setup.reset}
              pending={setup.pending}
              hasFigure={Boolean(editor.svg)}
              error={setup.error}
            />
          </section>
          <DiagnosticsPanel
            diagnostics={
              setup.pending
                ? [...(setup.data?.diagnostics ?? []), ...editor.projectErrors]
                : editor.diagnostics
            }
          />
        </aside>
      </div>
      {previewTableId !== null && (
        <WorkspaceDialog
          title="数据表预览"
          onClose={() => onPreviewTable(null)}
        >
          <div
            className="table-preview-layout"
            onMouseDown={() => onActivate('worksheet')}
            onFocusCapture={() => onActivate('worksheet')}
          >
            <WorkspaceTableList
              workspace={previewWorkspace}
              template={setup.template}
              onSelect={onPreviewTable}
              onRemove={setup.onRemove}
            />
            <WorkspaceTablePanel
              workspace={previewWorkspace}
              template={setup.template}
              onSelect={onPreviewTable}
              onTableChange={setup.onTableChange}
              onImportOptions={setup.onImportOptions}
              onRemove={setup.onRemove}
            />
          </div>
        </WorkspaceDialog>
      )}
    </>
  );
}
export default function App() {
  const editor = useWorkspaceEditor();
  const setup = usePlotSetup(
    editor.model,
    editor.onModel,
    editor.openedVersion,
  );
  const [bindingReveal, setBindingReveal] = useState<SeriesRevealRequest>();
  const confirmSetup = () => {
    const next = setup.confirm();
    if (next) {
      const panelId = next.activePanelId;
      if (
        panelId &&
        !editor.template.panels.some((panel) => panel.panelId === panelId)
      )
        setOriginState((state) =>
          selectOriginObject(state, { kind: 'panel', panelId }),
        );
      return next;
    }
    const combined =
      multiAxisPreset(setup.template) ||
      hasLayerAxisLinks(setup.template, setup.activePanel.panelId);
    const panels = [
      setup.activePanel,
      ...(combined
        ? setup.template.panels.filter(
            (panel) => panel.panelId !== setup.activePanel.panelId,
          )
        : []),
    ];
    const invalid = panels
      .flatMap((panel) => panel.plotSlots.map((plot) => ({ panel, plot })))
      .find(
        ({ plot }) =>
          seriesBindingSummary(
            plot,
            setup.template,
            setup.workspace,
            setup.data,
          ).invalid,
      );
    if (invalid) {
      if (invalid.panel.panelId !== setup.activePanel.panelId)
        setup.onPanel(invalid.panel.panelId);
      setBindingReveal((previous) => ({
        plotSlotId: invalid.plot.plotSlotId,
        version: (previous?.version ?? 0) + 1,
      }));
    } else
      requestAnimationFrame(() =>
        document.getElementById('style')?.scrollIntoView?.({ block: 'start' }),
      );
    return undefined;
  };
  const hasUnsavedChanges = editor.unsavedChanges || setup.pending;
  const latestSetup = useRef(setup);
  latestSetup.current = setup;
  const openProject = (file: File) => {
    const before = latestSetup.current;
    return editor.onOpen(
      file,
      () =>
        before.template === latestSetup.current.template &&
        before.workspace === latestSetup.current.workspace,
    );
  };
  useBeforeUnload(hasUnsavedChanges);
  const saveProject = () => {
    if (setup.pending && !confirmSetup()) return;
    editor.onSave();
  };
  const [previewTableId, setPreviewTableId] = useState<string | null>(null);
  const [originState, setOriginState] = useState(() =>
    createOriginWorkspaceState({
      selection: { kind: 'panel', panelId: editor.activePanel.panelId },
    }),
  );
  const [auxiliary, setAuxiliary] = useState<'export' | 'templates' | null>(
    null,
  );
  const openExport = () => {
    if (setup.pending && !confirmSetup()) return;
    setAuxiliary('export');
  };
  const [management, setManagement] = useState<{
    mode: OriginGraphManagementMode;
    panelId: string;
  } | null>(null);
  const menuContext = originState.activeWindow;
  // 绘图操作区始终操作当前图形，保留已选对象ID及失效选择保护。
  // 草稿图层只临时作为命令目标，撤销草稿后仍保留原图的对象选择。
  const graphCommandState = activateOriginWindow(
    editor.template.panels.some(
      (panel) => panel.panelId === setup.activePanel.panelId,
    )
      ? originState
      : selectOriginObject(originState, {
          kind: 'panel',
          panelId: setup.activePanel.panelId,
        }),
    'graph',
  );
  const activate = (context: 'graph' | 'worksheet') =>
    setOriginState((state) =>
      state.activeWindow === context
        ? state
        : activateOriginWindow(state, context),
    );
  const select = (target: PropertyObjectRef) => {
    if (!existsInTemplate(editor.template, target)) return;
    if (
      target.kind !== 'page' &&
      (target.panelId !== editor.activePanel.panelId ||
        target.panelId !== setup.activePanel.panelId)
    )
      setup.onPanel(target.panelId);
    setOriginState((state) => selectOriginObject(state, target));
  };
  const openProperties = (target: PropertyObjectRef) => {
    if (!existsInTemplate(editor.template, target)) return;
    select(target);
    window.dispatchEvent(
      new CustomEvent('plotfig:open-properties', {
        detail: {
          target,
          dialog: target.kind === 'panel' ? 'layer' : target.kind,
        },
      }),
    );
  };
  const canExecute = (command: OriginMenuCommand) => {
    if (command === 'tools.template-center') return true;
    if (command === 'file.export')
      return (
        !setup.pending &&
        (!!editor.exportSvg || editor.template.panels.length > 1)
      );
    if (
      command === 'graph.layer-contents' ||
      command === 'graph.layer-management' ||
      command === 'graph.plot-setup'
    )
      return resolveOriginPropertyCommand(
        editor.template,
        graphCommandState,
        'format.layer',
      ).enabled;
    if (command === 'format.axis.x' || command === 'format.axis.y')
      return resolveOriginAxisCommand(
        editor.template,
        graphCommandState,
        command === 'format.axis.x' ? 'x' : 'y',
      ).enabled;
    if (
      command === 'format.page' ||
      command === 'format.layer' ||
      command === 'format.plot' ||
      command === 'format.axis'
    ) {
      return resolveOriginPropertyCommand(
        editor.template,
        graphCommandState,
        command,
      ).enabled;
    }
    if (command === 'file.open') return true;
    if (command === 'file.save')
      return setup.workspace.tables.length > 0 && editor.status !== 'saving';
    return false;
  };
  const onMenuCommand = (command: OriginMenuCommand) => {
    if (!canExecute(command)) return;
    if (command === 'tools.template-center' || command === 'file.export') {
      setAuxiliary(command === 'file.export' ? 'export' : 'templates');
      return;
    }
    if (
      command === 'graph.layer-contents' ||
      command === 'graph.layer-management' ||
      command === 'graph.plot-setup'
    ) {
      const resolved = resolveOriginPropertyCommand(
        editor.template,
        graphCommandState,
        'format.layer',
      );
      if (resolved.enabled && resolved.target.kind === 'panel')
        setManagement({
          mode: command.slice(6) as OriginGraphManagementMode,
          panelId: resolved.target.panelId,
        });
      return;
    }
    if (command === 'format.axis.x' || command === 'format.axis.y') {
      const resolved = resolveOriginAxisCommand(
        editor.template,
        graphCommandState,
        command === 'format.axis.x' ? 'x' : 'y',
      );
      if (resolved.enabled) openProperties(resolved.target);
      return;
    }
    if (command === 'file.open' || command === 'file.save') {
      window.dispatchEvent(
        new Event(
          command === 'file.open'
            ? 'plotfig:project-open'
            : 'plotfig:project-save',
        ),
      );
    } else if (
      command === 'format.page' ||
      command === 'format.layer' ||
      command === 'format.plot' ||
      command === 'format.axis'
    ) {
      const resolved = resolveOriginPropertyCommand(
        editor.template,
        graphCommandState,
        command,
      );
      if (!resolved.enabled) return;
      window.dispatchEvent(
        new CustomEvent('plotfig:open-properties', {
          detail: { target: resolved.target, dialog: resolved.dialog },
        }),
      );
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主内容
      </a>
      <header className="app-topbar">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>
            <strong>Plot Fig</strong>
            <small>数据绘图工作台</small>
          </span>
        </div>
        <div className="top-actions">
          <span className="status">
            <i />
            本地工作区
          </span>
          <a className="icon-button" href="#style" aria-label="图形设置">
            ⚙
          </a>
        </div>
      </header>
      <Sidebar workspace={setup.workspace} onPreview={setPreviewTableId} />
      <main className="app-main" id="main-content" tabIndex={-1}>
        <div className="page-head">
          <div>
            <p className="eyebrow">PLOT FIG / WORKSPACE</p>
            <h1>数据绘图工作台</h1>
            <p>
              导入数据，为每组选择 X/Y
              数据列，设置当前图层的图表类型；通过「新建图层」添加图层，完成后导出图形。
            </p>
          </div>
          <div className="head-actions" id="project">
            <ProjectControls
              canSave={setup.workspace.tables.length > 0}
              hasUnsavedChanges={hasUnsavedChanges}
              pendingChanges={setup.pending}
              status={editor.status}
              statusMessage={editor.message}
              onSave={saveProject}
              onOpenFile={openProject}
            />
          </div>
        </div>
        <WorkspaceContent
          editor={editor}
          setup={setup}
          onExport={openExport}
          onConfirm={confirmSetup}
          bindingReveal={bindingReveal}
          previewTableId={previewTableId}
          onPreviewTable={setPreviewTableId}
          onActivate={activate}
          onSelect={select}
          onSelectLayer={(panelId) => {
            if (
              !setup.template.panels.some((panel) => panel.panelId === panelId)
            )
              return;
            setup.onPanel(panelId);
            if (
              editor.template.panels.some((panel) => panel.panelId === panelId)
            )
              setOriginState((state) =>
                selectOriginObject(state, { kind: 'panel', panelId }),
              );
          }}
          onOpen={openProperties}
          onApplyLayers={(next) => {
            if (setup.applyBatch(next) === false) return false;
            setOriginState((state) =>
              selectOriginObject(state, {
                kind: 'panel',
                panelId: next.activePanelId ?? next.template.panels[0]!.panelId,
              }),
            );
            return true;
          }}
          menus={
            <FigureActionMenus
              context={menuContext}
              canExecute={canExecute}
              onCommand={onMenuCommand}
            />
          }
        />
      </main>
      <div className="mobile-plot-action">
        <span>
          {setup.pending
            ? '设置尚未应用'
            : editor.svg
              ? '预览已更新'
              : '准备绘图'}
        </span>
        <button
          type="button"
          className="ui-primary"
          onClick={() => {
            if (confirmSetup())
              document
                .getElementById('preview')
                ?.scrollIntoView?.({ block: 'start' });
          }}
        >
          应用并查看预览
        </button>
      </div>
      {management && (
        <OriginGraphManagementDialog
          key={`${management.mode}:${management.panelId}`}
          mode={management.mode}
          panelId={management.panelId}
          model={editor.model}
          onApply={editor.onModel}
          onDismiss={() => setManagement(null)}
        />
      )}
      {auxiliary === 'templates' && (
        <TemplateLibraryDialog
          model={{
            template: setup.template,
            workspace: setup.workspace,
            activePanelId: setup.activePanel.panelId,
          }}
          onApply={setup.applyBatch}
          onDismiss={() => setAuxiliary(null)}
        />
      )}
      {auxiliary === 'export' && (
        <OriginExportDialog
          svg={editor.exportSvg}
          name={editor.template.metadata.name}
          model={editor.model}
          onDismiss={() => setAuxiliary(null)}
        />
      )}
    </div>
  );
}
