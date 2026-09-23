import { useState } from 'react';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { addPanel } from '../state/panel-operations.js';

export function LayerCreateControls({
  model,
  onApply,
}: {
  model: WorkspaceEditor;
  onApply: (next: WorkspaceEditor) => boolean | void;
}) {
  const [error, setError] = useState('');
  const atLimit = model.template.panels.length >= 16;
  return (
    <>
      <button
        type="button"
        disabled={atLimit}
        title={atLimit ? '最多支持 16 个图层' : '创建空白图层并切换到新图层'}
        onClick={() => {
          setError('');
          try {
            const next = addPanel(
              model,
              model.activePanelId ?? model.template.panels[0]!.panelId,
            );
            if (onApply(next) === false) {
              setError('未能新建图层，请先检查待绘图设置。');
              return;
            }
            requestAnimationFrame(() =>
              document
                .getElementById('figure-preview-stage')
                ?.focus({ preventScroll: true }),
            );
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '无法新建图层');
          }
        }}
      >
        新建图层
      </button>
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
    </>
  );
}
