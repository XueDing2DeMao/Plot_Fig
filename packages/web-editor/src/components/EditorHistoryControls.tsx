import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type EditorHistoryControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  blocked?: () => string | undefined;
  message?: string | undefined;
};

type Direction = 'undo' | 'redo';

function nativeEditingTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target : document.activeElement;
  if (!element) return false;
  if (element.closest('input, textarea, select, [role="textbox"]')) return true;
  const editable = element.closest('[contenteditable]');
  return !!editable && editable.getAttribute('contenteditable') !== 'false';
}

export function EditorHistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  blocked,
  message,
}: EditorHistoryControlsProps) {
  const [notice, setNotice] = useState<{
    text: string;
    dialog: Element | undefined;
  }>();
  const perform = useCallback(
    (direction: Direction) => {
      if (!(direction === 'undo' ? canUndo : canRedo)) return false;
      const reason = blocked?.();
      if (reason) {
        setNotice({
          text: reason,
          dialog: [...document.querySelectorAll('dialog[open]')].at(-1),
        });
      } else {
        setNotice(undefined);
        if (direction === 'undo') onUndo();
        else onRedo();
      }
      return true;
    },
    [canUndo, canRedo, onUndo, onRedo, blocked],
  );

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.isComposing ||
        !(event.ctrlKey || event.metaKey) ||
        nativeEditingTarget(event.target)
      )
        return;
      const key = event.key.toLowerCase();
      const direction =
        key === 'z'
          ? event.shiftKey
            ? 'redo'
            : 'undo'
          : key === 'y' && !event.shiftKey
            ? 'redo'
            : undefined;
      if (direction && perform(direction)) event.preventDefault();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [perform]);

  return (
    <div className="editor-history-controls" role="group" aria-label="编辑历史">
      <button
        type="button"
        disabled={!canUndo}
        aria-label="撤销"
        title="撤销（Ctrl/Cmd+Z）"
        aria-keyshortcuts="Control+Z Meta+Z"
        onMouseDown={(event) => {
          if (blocked?.()) event.preventDefault();
        }}
        onClick={() => perform('undo')}
      >
        <span aria-hidden="true" className="preview-tool-glyph">
          ↶
        </span>
      </button>
      <button
        type="button"
        disabled={!canRedo}
        aria-label="重做"
        title="重做（Ctrl/Cmd+Y 或 Ctrl/Cmd+Shift+Z）"
        aria-keyshortcuts="Control+Y Meta+Y Control+Shift+Z Meta+Shift+Z"
        onMouseDown={(event) => {
          if (blocked?.()) event.preventDefault();
        }}
        onClick={() => perform('redo')}
      >
        <span aria-hidden="true" className="preview-tool-glyph">
          ↷
        </span>
      </button>
      <span className="editor-history-status" role="status" aria-live="polite">
        {notice?.text ?? message}
      </span>
      {notice?.dialog?.isConnected &&
        notice.dialog.hasAttribute('open') &&
        createPortal(
          <p className="workspace-hint" role="status" aria-live="polite">
            {notice.text}
          </p>,
          notice.dialog,
        )}
    </div>
  );
}
