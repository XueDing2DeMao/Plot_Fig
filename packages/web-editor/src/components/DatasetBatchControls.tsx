import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { DatasetBatchDialog } from './DatasetBatchDialog.js';

export function DatasetBatchControls({
  model,
  pending,
}: {
  model: WorkspaceEditor;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const hint = '请先生成图形或重置待绘图设置，再使用批处理。';
  return (
    <>
      <button
        className="property-trigger"
        disabled={pending}
        title={pending ? hint : '直接按当前图形批量换表绘图，无需设置模板'}
        onClick={(e) => {
          trigger.current = e.currentTarget;
          setOpen(true);
        }}
      >
        数据表批绘
      </button>
      {pending && <span className="dataset-batch-pending">{hint}</span>}
      {open &&
        createPortal(
          <DatasetBatchDialog
            model={model}
            onDismiss={() => {
              setOpen(false);
              requestAnimationFrame(() => trigger.current?.focus());
            }}
          />,
          document.body,
        )}
    </>
  );
}
