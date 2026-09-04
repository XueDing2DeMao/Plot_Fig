import { useState } from 'react';
import { BindingPanel } from './components/BindingPanel.js';
import { DiagnosticsPanel } from './components/DiagnosticsPanel.js';
import { FigurePreview } from './components/FigurePreview.js';
import { FilePicker } from './components/FilePicker.js';
import { loadCsvFile, type EditorState } from './state/editor-state.js';

const initialState: EditorState = {
  diagnostics: [],
  overrides: {},
  status: 'empty',
};

export default function App() {
  const [state, setState] = useState(initialState);
  const onFile = async (file: File) => {
    setState({
      fileName: file.name,
      diagnostics: [],
      overrides: {},
      status: 'parsing',
    });
    setState(await loadCsvFile(file));
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
          <BindingPanel data={state.data} />
          <DiagnosticsPanel diagnostics={state.diagnostics} />
        </aside>
        <FigurePreview svg={state.svg} />
      </section>
    </main>
  );
}
