import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { TemplateLibraryDialog } from './TemplateLibraryDialog.js';
export function TemplateLibraryControls({
  model,
  onApply,
}: {
  model: WorkspaceEditor;
  onApply: (m: WorkspaceEditor) => boolean | void;
}) {
  const [open, setOpen] = useState(false),
    ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        type="button"
        className="property-trigger"
        ref={ref}
        onClick={() => setOpen(true)}
      >
        模板中心
      </button>
      {open &&
        createPortal(
          <TemplateLibraryDialog
            model={model}
            onApply={onApply}
            onDismiss={() => {
              setOpen(false);
              requestAnimationFrame(() => ref.current?.focus());
            }}
          />,
          document.body,
        )}
    </>
  );
}
