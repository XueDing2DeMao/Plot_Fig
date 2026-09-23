import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { removePanel } from '../state/panel-operations.js';
import { WorkspaceDialog } from './WorkspaceDialog.js';

export function LayerDeleteControls({
  model,
  onApply,
}: {
  model: WorkspaceEditor;
  onApply: (next: WorkspaceEditor) => boolean | void;
}) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const panels = model.template.panels;
  const active =
    panels.find((panel) => panel.panelId === model.activePanelId) ?? panels[0]!;
  const targetIndex = panels.findIndex((panel) => panel.panelId === targetId);
  const target = panels[targetIndex];
  const annotations = model.template.annotations.filter(
    (annotation) =>
      annotation.coordinateSpace !== 'page' && annotation.panelId === targetId,
  );
  const children = panels.filter(
    (panel) => panel.frameLink?.parentPanelId === targetId,
  );
  return (
    <>
      <button
        type="button"
        disabled={panels.length <= 1}
        title={
          panels.length <= 1
            ? '至少保留一个图层'
            : `删除 ${active.name ?? '图层 ' + (panels.indexOf(active) + 1)}`
        }
        onClick={() => {
          setError('');
          setTargetId(active.panelId);
        }}
      >
        删除当前图层
      </button>
      {target &&
        createPortal(
          <WorkspaceDialog title="删除图层" onClose={() => setTargetId(null)}>
            <p>
              将删除“{target.name ?? '图层 ' + (targetIndex + 1)}”及本层的{' '}
              {target.plotSlots.length} 条曲线、{annotations.length}{' '}
              个注释，原始数据表保留。
            </p>
            {children.length > 0 && (
              <p>子图层将解除位置与尺寸链接，并保持当前位置。</p>
            )}
            {error && (
              <p role="alert" className="workspace-error">
                {error}
              </p>
            )}
            <footer className="workspace-actions">
              <button type="button" onClick={() => setTargetId(null)}>
                取消
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => {
                  try {
                    if (onApply(removePanel(model, target.panelId)) === false) {
                      setError('未能删除，请先检查待绘图设置。');
                      return;
                    }
                    setTargetId(null);
                    requestAnimationFrame(() =>
                      document
                        .getElementById('figure-preview-stage')
                        ?.focus({ preventScroll: true }),
                    );
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : '无法删除图层',
                    );
                  }
                }}
              >
                确认删除图层
              </button>
            </footer>
          </WorkspaceDialog>,
          document.body,
        )}
    </>
  );
}
