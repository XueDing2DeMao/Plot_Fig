export type ProjectControlStatus =
  'idle' | 'ready' | 'opening' | 'saving' | 'error';

export type ProjectControlsProps = {
  canSave: boolean;
  status: ProjectControlStatus;
  statusMessage?: string;
  hasUnsavedChanges?: boolean;
  pendingChanges?: boolean;
  onSave: () => void;
  onOpenFile: (file: File) => void;
};

export function ProjectControls({
  canSave,
  status,
  statusMessage,
  onSave,
  onOpenFile,
  hasUnsavedChanges = false,
  pendingChanges = false,
}: ProjectControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [openingFile, setOpeningFile] = useState<File | null>(null);
  useEffect(() => {
    const save = () => onSave();
    const open = () => inputRef.current?.click();
    window.addEventListener('plotfig:project-save', save);
    window.addEventListener('plotfig:project-open', open);
    return () => {
      window.removeEventListener('plotfig:project-save', save);
      window.removeEventListener('plotfig:project-open', open);
    };
  }, [onSave]);
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) {
      if (hasUnsavedChanges) setOpeningFile(file);
      else onOpenFile(file);
    }
  };
  const message =
    statusMessage ??
    (status === 'opening'
      ? '正在打开项目…'
      : status === 'saving'
        ? '正在保存项目…'
        : '尚未保存项目');
  const displayedMessage =
    status === 'error' || status === 'opening' || status === 'saving'
      ? message
      : hasUnsavedChanges
        ? `有未保存修改${pendingChanges ? '，保存时将先应用待绘图设置' : '，请下载项目文件'}`
        : message;
  return (
    <section className="card project-controls" aria-label="项目文件">
      <p className="section-kicker">项目文件</p>
      <div className="project-actions">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || status === 'saving'}
        >
          保存项目
        </button>
        <label className="project-open-label" htmlFor="project-file-input">
          打开项目
        </label>
        <input
          ref={inputRef}
          id="project-file-input"
          className="project-open-input"
          aria-label="打开项目文件"
          type="file"
          accept=".plotfig.json,application/json"
          onChange={onFileChange}
        />
      </div>
      {status === 'error' ? (
        <p className="project-status" role="alert">
          {displayedMessage}
        </p>
      ) : (
        <p className="project-status" aria-live="polite">
          {displayedMessage}
        </p>
      )}
      {openingFile && (
        <WorkspaceDialog
          title="打开其他项目"
          onClose={() => setOpeningFile(null)}
        >
          <p>当前有未保存修改。打开“{openingFile.name}”会替换当前工作区。</p>
          <p>需要保留时，请先继续编辑并保存项目。</p>
          <footer className="workspace-actions">
            <button type="button" onClick={() => setOpeningFile(null)}>
              继续编辑
            </button>
            <button
              type="button"
              className="danger-action"
              onClick={() => {
                onOpenFile(openingFile);
                setOpeningFile(null);
              }}
            >
              放弃修改并打开
            </button>
          </footer>
        </WorkspaceDialog>
      )}
    </section>
  );
}
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog.js';
