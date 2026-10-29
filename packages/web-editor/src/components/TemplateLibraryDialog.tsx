import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { useTemplateLibrary } from './useTemplateLibrary.js';
import { EditorModal } from './EditorModal.js';
import { TemplateStorageFields } from './TemplateStorageFields.js';
import {
  TemplateNavigation,
  TemplateApplyFields,
  TemplatePreview,
} from './TemplateLibraryParts.js';
export function TemplateLibraryDialog({
  model,
  onApply,
  onDismiss,
}: {
  model: WorkspaceEditor;
  onApply: (m: WorkspaceEditor) => boolean | void;
  onDismiss: () => void;
}) {
  const state = useTemplateLibrary(model),
    { draft, message } = state;
  return (
    <EditorModal
      className="template-library-dialog"
      title="模板中心"
      onDismiss={onDismiss}
      footer={
        <>
          <button onClick={onDismiss}>取消</button>
          <button
            className="ui-primary"
            disabled={!!draft.error}
            onClick={() => {
              if (onApply(draft.draft) !== false) onDismiss();
            }}
          >
            应用预览并关闭
          </button>
        </>
      }
    >
      <div className="publication-body template-library-body">
        <section className="template-library-main">
          <TemplateNavigation state={state} />
          <section className="template-storage-panel" aria-label="模板管理">
            <TemplateStorageFields state={state} />
          </section>
        </section>
        <aside className="template-library-detail">
          <TemplatePreview state={state} />
          <section className="publication-form publication-fields">
            <TemplateApplyFields state={state} />
            {message && (
              <p className="publication-message" role="status">
                {message}
              </p>
            )}
            {draft.error && (
              <p className="property-error" role="alert">
                {draft.error}
              </p>
            )}
          </section>
        </aside>
      </div>
    </EditorModal>
  );
}
