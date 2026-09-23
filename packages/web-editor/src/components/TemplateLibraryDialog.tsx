import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { useTemplateLibrary } from './useTemplateLibrary.js';
import { EditorModal } from './EditorModal.js';
import { TemplateStorageFields } from './TemplateStorageFields.js';
import {
  TemplateNavigation,
  TemplateApplyFields,
  JournalPresetFields,
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
      <div className="publication-body">
        <TemplateNavigation state={state} />
        <section className="publication-form publication-fields">
          <TemplateApplyFields state={state} />
          <JournalPresetFields state={state} />
          <TemplateStorageFields state={state} />
          {message && <p role="status">{message}</p>}
          {draft.error && <p role="alert">{draft.error}</p>}
        </section>
        <TemplatePreview state={state} />
      </div>
    </EditorModal>
  );
}
