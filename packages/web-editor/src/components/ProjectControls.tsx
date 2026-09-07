export type ProjectControlStatus =
  'idle' | 'ready' | 'opening' | 'saving' | 'error';

export type ProjectControlsProps = {
  canSave: boolean;
  status: ProjectControlStatus;
  statusMessage?: string;
  onSave: () => void;
  onOpenFile: (file: File) => void;
};

export function ProjectControls({
  canSave,
  status,
  statusMessage,
  onSave,
  onOpenFile,
}: ProjectControlsProps) {
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) onOpenFile(file);
  };
  const message =
    statusMessage ??
    (status === 'opening'
      ? '正在打开项目…'
      : status === 'saving'
        ? '正在保存项目…'
        : '项目文件保存在本地');
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
          {message}
        </p>
      ) : (
        <p className="project-status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}
import type { ChangeEvent } from 'react';
