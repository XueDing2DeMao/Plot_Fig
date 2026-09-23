import { useState } from 'react';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { OriginExportDialog } from './OriginExportDialog.js';

export function LayerExportControls({
  model,
  disabled = false,
  svg,
}: {
  model: WorkspaceEditor;
  disabled?: boolean;
  svg?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        批量导出…
      </button>
      {open && (
        <OriginExportDialog
          svg={svg}
          name={
            model.template.panels.find((p) => p.panelId === model.activePanelId)
              ?.name ?? model.template.metadata.name
          }
          model={model}
          initialMode="batch"
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}
