import { useState } from 'react';
import { BindingPanel, type BindingChange } from './components/BindingPanel.js';
import { ColumnSummary } from './components/ColumnSummary.js';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.js';
import { FigurePreview } from './components/FigurePreview.js';
import { FilePicker } from './components/FilePicker.js';
import { PlotSettingsPanel } from './components/PlotSettingsPanel.js';
import {
  ProjectControls,
  type ProjectControlStatus,
} from './components/ProjectControls.js';
import {
  defaultTemplate,
  loadCsvFile,
  rebindEditorData,
  restoreProjectState,
  updatePlotMode,
  type EditorState,
  type PlotMode,
} from './state/editor-state.js';
import { serializeProjectFile } from './state/project-file.js';

const initialState: EditorState = {
  diagnostics: [],
  overrides: {},
  plotMode: 'line-markers',
  status: 'empty',
};

async function readProjectFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () =>
      reject(reader.error ?? new Error('Unable to read project file'));
    reader.readAsText(file);
  });
}

export default function App() {
  const [template, setTemplate] = useState(defaultTemplate);
  const [state, setState] = useState(initialState);
  const [projectStatus, setProjectStatus] =
    useState<ProjectControlStatus>('idle');
  const [projectMessage, setProjectMessage] = useState<string | undefined>();
  const onFile = async (file: File) => {
    setProjectStatus('idle');
    setProjectMessage(undefined);
    setState({
      fileName: file.name,
      diagnostics: [],
      overrides: {},
      plotMode: state.plotMode,
      status: 'parsing',
    });
    setState(await loadCsvFile(file, template));
  };
  const onSaveProject = () => {
    if (!state.data || !state.sourceText || state.status !== 'ready') return;
    setProjectStatus('saving');
    const serialized = serializeProjectFile(
      template,
      state.data,
      state.sourceText,
    );
    const url = URL.createObjectURL(
      new Blob([serialized], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.fileName?.replace(/\.[^.]+$/, '') || 'plot-fig'}.plotfig.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setProjectStatus('ready');
    setProjectMessage('项目已保存到本地');
  };
  const onOpenProject = async (file: File) => {
    setProjectStatus('opening');
    setProjectMessage(undefined);
    try {
      const text = await readProjectFileText(file);
      const restored = restoreProjectState(text);
      if (!restored.ok) {
        setState(restored.state);
        setProjectStatus('error');
        setProjectMessage('项目文件无法打开');
        return;
      }
      setTemplate(restored.template);
      setState(restored.state);
      setProjectStatus('ready');
      setProjectMessage('项目已打开');
    } catch {
      setState({
        overrides: {},
        plotMode: 'line-markers',
        diagnostics: [
          {
            code: 'PROJECT_INVALID',
            severity: 'error',
            sourcePath: '/',
            message: 'Project file could not be read',
          },
        ],
        status: 'error',
      });
      setProjectStatus('error');
      setProjectMessage('项目文件无法读取');
    }
  };
  const onBindingChange = ({ dataSlotId, columnId }: BindingChange) => {
    setState((current) => {
      if (!current.data) return current;
      const overrides = { ...current.overrides };
      if (columnId) overrides[dataSlotId] = columnId;
      else delete overrides[dataSlotId];
      return rebindEditorData(
        template,
        current.data,
        overrides,
        current.sourceText,
      );
    });
  };
  const onPlotModeChange = (plotMode: PlotMode) => {
    const nextTemplate = updatePlotMode(template, plotMode);
    setTemplate(nextTemplate);
    setState((current) =>
      current.data
        ? rebindEditorData(
            nextTemplate,
            current.data,
            current.overrides,
            current.sourceText,
          )
        : { ...current, plotMode },
    );
  };
  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">PLOT FIG / XY WORKBENCH</p>
          <h1>从一张表，得到一张可复用的图。</h1>
        </div>
        <span className="status-dot">LOCAL ONLY</span>
      </header>
      <section className="workspace-grid">
        <aside className="control-column">
          <section className="card file-card">
            <p className="section-kicker">01 · 数据源</p>
            <FilePicker onFile={onFile} />
            {state.fileName && <p className="file-name">{state.fileName}</p>}
          </section>
          <ProjectControls
            canSave={Boolean(
              state.data && state.sourceText && state.status === 'ready',
            )}
            status={projectStatus}
            {...(projectMessage ? { statusMessage: projectMessage } : {})}
            onSave={onSaveProject}
            onOpenFile={onOpenProject}
          />
          <BindingPanel
            template={template}
            data={state.data}
            overrides={state.overrides}
            onBindingChange={onBindingChange}
          />
          <PlotSettingsPanel
            mode={state.plotMode}
            onModeChange={onPlotModeChange}
          />
          <ColumnSummary data={state.data} />
          <DiagnosticsPanel diagnostics={state.diagnostics} />
        </aside>
        <FigurePreview svg={state.svg} />
      </section>
    </main>
  );
}
