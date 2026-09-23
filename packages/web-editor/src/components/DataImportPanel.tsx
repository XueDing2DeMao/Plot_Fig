import { DATA_LIMITS, type DataTable } from '@plot-fig/data-binding';
import { WorkspaceDialog } from './WorkspaceDialog.js';
import { RegionOptions, TextOptions } from './ImportOptions.js';
import { useImportDraft } from './use-import-draft.js';
import { useId, useRef, useState } from 'react';
import './data-import.css';

type ImportState = ReturnType<typeof useImportDraft>;
const IMPORT_PREVIEW_ROWS = 100;
function SheetSelection({ state }: { state: ImportState }) {
  return (
    <fieldset className="sheet-selection">
      <legend>选择要导入的工作表</legend>
      {state.draft.sheets.map((sheet, index) => (
        <label key={index}>
          <input
            type="checkbox"
            checked={state.draft.selected.includes(index)}
            onChange={(e) =>
              state.setDraft((current) => ({
                ...current,
                selected: e.target.checked
                  ? [...current.selected, index].sort((a, b) => a - b)
                  : current.selected.filter((i) => i !== index),
              }))
            }
          />
          {sheet.source.sheetName ?? sheet.source.name}
          <button
            type="button"
            onClick={() =>
              state.setDraft((current) => ({ ...current, active: index }))
            }
          >
            预览{sheet.source.sheetName}
          </button>
        </label>
      ))}
    </fieldset>
  );
}
function RawPreview({ state }: { state: ImportState }) {
  const sheet = state.draft.sheets[state.draft.active];
  if (!sheet) return null;
  const region = state.draft.regions[state.draft.active]!;
  return (
    <>
      <h3>{sheet.source.sheetName ?? sheet.source.name}</h3>
      <RegionOptions
        value={region}
        onChange={(value) =>
          state.setDraft((current) => ({
            ...current,
            regions: current.regions.map((r, i) =>
              i === current.active ? value : r,
            ),
          }))
        }
      />
      <div className="table-wrap import-raw">
        <table>
          <caption>原始数据前 {IMPORT_PREVIEW_ROWS} 行 · 行号从 1 开始</caption>
          <tbody>
            {sheet.rows.slice(0, IMPORT_PREVIEW_ROWS).map((row, index) => (
              <tr key={index}>
                <th scope="row">{index + 1}</th>
                {row.map((cell, col) => (
                  <td key={col}>{cell === null ? '—' : String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="workspace-hint">
        保留空行以维持行对齐。导入后自动按数值处理，可在列设置中调整单位和缺失标记。
      </p>
    </>
  );
}
function ImportDialog({ state }: { state: ImportState }) {
  return (
    <WorkspaceDialog title="导入数据" onClose={state.close}>
      {!state.file && (
        <div className="paste-input">
          <label>
            粘贴表格文本
            <textarea
              rows={5}
              value={state.clipboard}
              onChange={(e) => state.setClipboard(e.target.value)}
              placeholder="从 Excel 复制单元格，在此粘贴"
            />
          </label>
          <button type="button" onClick={() => state.previewText()}>
            预览文本
          </button>
        </div>
      )}
      {!/\.xlsx$/i.test(state.file?.name ?? '') && (
        <TextOptions value={state.options} onChange={state.changeOptions} />
      )}
      {state.loading && <p role="status">正在读取文件…</p>}
      {state.draft.sheets.length > 1 && <SheetSelection state={state} />}
      <RawPreview state={state} />
      {state.error && (
        <p role="alert" className="workspace-error">
          {state.error}
        </p>
      )}
      <footer className="workspace-actions">
        <button type="button" onClick={state.close}>
          取消导入
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={
            state.loading || !state.tables.length || Boolean(state.error)
          }
          onClick={state.apply}
        >
          确认导入
        </button>
      </footer>
    </WorkspaceDialog>
  );
}
export function DataImportPanel({
  onImport,
  hasData = false,
}: {
  onImport: (tables: DataTable[]) => void;
  hasData?: boolean;
}) {
  const state = useImportDraft(onImport);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const bodyId = useId();
  const formatsId = useId();
  const helpId = useId();
  const previewFiles = (files: FileList | null) => {
    if (!files?.length || state.open) return;
    if (files.length !== 1) {
      setFileError('每次请导入一个文件，可重复追加。');
      return;
    }
    setFileError('');
    state.openFile(files[0]!);
  };
  return (
    <section className="panel import-panel" aria-label="导入数据">
      <div className="panel-head">
        <h2>导入数据</h2>
        {!hasData && <small>本地处理</small>}
        {hasData && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? '收起' : '追加数据'}
          </button>
        )}
      </div>
      <div className="import-body" id={bodyId} hidden={hasData && !expanded}>
        <input
          ref={fileInput}
          className="import-file-input"
          aria-label="选择数据文件"
          type="file"
          accept=".csv,.txt,.tsv,.xlsx"
          hidden
          onChange={(event) => {
            previewFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className={`import-dropzone${dragging ? ' is-dragging' : ''}`}
          aria-label="选择文件"
          aria-describedby={`${formatsId} ${helpId}`}
          onClick={() => {
            setFileError('');
            fileInput.current?.click();
          }}
          onDragEnter={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              setDragging(true);
            }
          }}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            previewFiles(event.dataTransfer.files);
          }}
        >
          <span className="import-dropzone-title">
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 15V3m-4 4 4-4 4 4M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
            </svg>
            {dragging ? '松开以预览文件' : '选择文件'}
          </span>
          <span className="import-dropzone-hint">或拖拽单个文件到此处</span>
          <span id={formatsId} className="import-file-formats">
            CSV · TXT · TSV · XLSX
          </span>
        </button>
        <button
          type="button"
          className="import-paste-button"
          onClick={() => {
            setFileError('');
            state.openClipboard();
          }}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
            <rect x="9" y="2" width="6" height="6" rx="1" />
            <path d="M8 12h8m-8 4h5" />
          </svg>
          从剪贴板粘贴
        </button>
        <p id={helpId} className="import-entry-note">
          先预览确认 · 单文件≤{DATA_LIMITS.fileBytes / (1024 * 1024)} MiB
        </p>
        {fileError && (
          <p role="alert" className="import-entry-error">
            {fileError}
          </p>
        )}
      </div>
      {state.open && <ImportDialog state={state} />}
    </section>
  );
}
