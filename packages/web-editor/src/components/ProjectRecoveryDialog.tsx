import { useState } from 'react';
import type { RecoveryDraftSummary } from '../browser/draft-record.js';
import { WorkspaceDialog } from './WorkspaceDialog.js';

export function recoveryTime(value: number) {
  return Number.isFinite(value) && value > 0
    ? new Date(value).toLocaleString('zh-CN', { hour12: false })
    : '时间未知';
}

export function ProjectRecoveryDialog({
  drafts,
  hasUnsavedChanges,
  onRestore,
  onDelete,
  onClose,
}: {
  drafts: RecoveryDraftSummary[];
  hasUnsavedChanges: boolean;
  onRestore: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [confirmation, setConfirmation] = useState<{
    kind: 'restore' | 'delete';
    draft: RecoveryDraftSummary;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (kind: 'restore' | 'delete', id: string) => {
    setBusy(true);
    setError('');
    try {
      if (kind === 'restore') {
        if (await onRestore(id)) onClose();
        else
          setError(
            '未恢复草稿：读取失败或当前工作区已有新的修改，请查看项目状态。',
          );
      } else await onDelete(id);
      setConfirmation(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '操作失败，请稍后重试。',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <WorkspaceDialog
      title="恢复草稿"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <p>
        草稿保存在此浏览器中，只包含已应用的图形和数据。清除浏览器数据会移除草稿，请仍用“保存项目”下载项目文件。
      </p>
      {error && <p role="alert">{error}</p>}
      {confirmation ? (
        <>
          {confirmation.kind === 'restore' ? (
            <p>
              当前有未保存修改或待绘图设置。恢复“{confirmation.draft.name}
              ”会替换当前工作区。
            </p>
          ) : (
            <p>
              删除恢复草稿“{confirmation.draft.name}”（
              {recoveryTime(confirmation.draft.updatedAt)}
              ）？此操作不会删除已下载的项目文件。
            </p>
          )}
          <footer className="workspace-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                confirmation.kind === 'restore'
                  ? onClose()
                  : setConfirmation(undefined)
              }
            >
              {confirmation.kind === 'restore' ? '继续编辑' : '取消删除'}
            </button>
            <button
              type="button"
              className="danger-action"
              disabled={busy}
              onClick={() =>
                void run(confirmation.kind, confirmation.draft.draftId)
              }
            >
              {confirmation.kind === 'restore'
                ? '放弃当前修改并恢复'
                : '确认删除此草稿'}
            </button>
          </footer>
        </>
      ) : (
        <>
          {drafts.length === 0 ? (
            <p>尚无恢复草稿。应用修改后会自动保留。</p>
          ) : (
            <ul className="recovery-list">
              {drafts.map((draft) => (
                <li key={draft.draftId}>
                  <div>
                    <strong>{draft.name}</strong>
                    <small>
                      {recoveryTime(draft.updatedAt)} ·{' '}
                      {draft.payloadBytes === null
                        ? '大小未知'
                        : `${(draft.payloadBytes / 1024 / 1024).toFixed(2)} MiB`}
                    </small>
                    {draft.error && <p>{draft.error}</p>}
                  </div>
                  <div className="workspace-actions">
                    <button
                      type="button"
                      disabled={busy || !draft.recoverable}
                      aria-label={`恢复“${draft.name}”`}
                      onClick={() => {
                        if (hasUnsavedChanges)
                          setConfirmation({ kind: 'restore', draft });
                        else void run('restore', draft.draftId);
                      }}
                    >
                      恢复
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`删除“${draft.name}”`}
                      onClick={() => setConfirmation({ kind: 'delete', draft })}
                    >
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <footer className="workspace-actions">
            <button type="button" disabled={busy} onClick={onClose}>
              本次跳过
            </button>
            {busy && <span role="status">正在处理…</span>}
          </footer>
        </>
      )}
    </WorkspaceDialog>
  );
}
