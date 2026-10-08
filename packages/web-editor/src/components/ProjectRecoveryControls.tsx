import { useEffect, useRef, useState } from 'react';
import type { useProjectRecovery } from '../state/use-project-recovery.js';
import {
  ProjectRecoveryDialog,
  recoveryTime,
} from './ProjectRecoveryDialog.js';
import './project-recovery.css';

export type RecoveryControlsState = Pick<
  ReturnType<typeof useProjectRecovery>,
  | 'loading'
  | 'ready'
  | 'settings'
  | 'drafts'
  | 'status'
  | 'message'
  | 'updatedAt'
  | 'setEnabled'
  | 'retry'
  | 'resume'
  | 'refresh'
  | 'deleteDraft'
>;

export function ProjectRecoveryControls({
  recovery,
  hasUnsavedChanges,
  projectVersion,
  onRestore,
}: {
  recovery: RecoveryControlsState;
  hasUnsavedChanges: boolean;
  projectVersion: number;
  onRestore: (id: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');
  const initialVersion = useRef(projectVersion);
  const interacted = useRef(false);
  const checked = useRef(false);
  useEffect(() => {
    const mark = () => {
      interacted.current = true;
    };
    window.addEventListener('pointerdown', mark, true);
    window.addEventListener('keydown', mark, true);
    return () => {
      window.removeEventListener('pointerdown', mark, true);
      window.removeEventListener('keydown', mark, true);
    };
  }, []);
  useEffect(() => {
    if (recovery.loading || checked.current) return;
    checked.current = true;
    if (
      recovery.drafts.length &&
      !hasUnsavedChanges &&
      !interacted.current &&
      initialVersion.current === projectVersion &&
      !document.querySelector(
        'dialog[open], [role="dialog"][aria-modal="true"], .inline-chart-text-editor',
      )
    )
      setOpen(true);
  }, [recovery.loading, recovery.drafts, hasUnsavedChanges, projectVersion]);
  const toggle = async (enabled: boolean) => {
    setChanging(true);
    setError('');
    try {
      await recovery.setEnabled(enabled);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '无法更改自动保留设置。',
      );
    } finally {
      setChanging(false);
    }
  };
  return (
    <section className="card recovery-controls" aria-label="自动保留恢复草稿">
      <div className="recovery-controls-head">
        <label>
          <input
            type="checkbox"
            checked={recovery.settings?.enabled ?? false}
            disabled={recovery.loading || !recovery.ready || changing}
            onChange={(event) => void toggle(event.target.checked)}
          />
          自动保留恢复草稿
        </label>
        <button
          type="button"
          disabled={recovery.loading}
          onClick={() => {
            void recovery.refresh();
            setOpen(true);
          }}
        >
          恢复草稿（{recovery.drafts.length}）
        </button>
      </div>
      <p className="project-status" role="status">
        {error || recovery.message}
        {recovery.status === 'saved' && recovery.updatedAt
          ? ` · ${recoveryTime(recovery.updatedAt)}`
          : ''}
      </p>
      {recovery.status === 'deleted' && (
        <button type="button" onClick={recovery.resume}>
          重新保留当前工作区
        </button>
      )}
      {(recovery.status === 'error' || recovery.status === 'capacity') && (
        <button type="button" onClick={recovery.retry}>
          重试自动保留
        </button>
      )}
      {open && (
        <ProjectRecoveryDialog
          drafts={recovery.drafts}
          hasUnsavedChanges={hasUnsavedChanges}
          onRestore={onRestore}
          onDelete={recovery.deleteDraft}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
