import { useMemo, useReducer, useRef } from 'react';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  createEditorHistory,
  type EditorHistory,
  type EditorHistoryLimits,
  type EditorHistoryOptions,
} from './editor-history.js';

export function useEditorHistory(
  initial: WorkspaceEditor,
  limits?: EditorHistoryLimits,
): EditorHistory {
  const controller = useRef<EditorHistory | undefined>(undefined);
  if (!controller.current)
    controller.current = createEditorHistory(initial, limits);
  const history = controller.current;
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const methods = useMemo(
    () => ({
      commit(next: WorkspaceEditor, options?: EditorHistoryOptions) {
        const model = history.commit(next, options);
        refresh();
        return model;
      },
      undo() {
        const model = history.undo();
        refresh();
        return model;
      },
      redo() {
        const model = history.redo();
        refresh();
        return model;
      },
      reset(next: WorkspaceEditor) {
        const model = history.reset(next);
        refresh();
        return model;
      },
      peekUndo: history.peekUndo,
      peekRedo: history.peekRedo,
    }),
    [history],
  );
  return {
    ...methods,
    get current() {
      return history.current;
    },
    get canUndo() {
      return history.canUndo;
    },
    get canRedo() {
      return history.canRedo;
    },
    get undoCount() {
      return history.undoCount;
    },
    get redoCount() {
      return history.redoCount;
    },
    get estimatedBytes() {
      return history.estimatedBytes;
    },
    get message() {
      return history.message;
    },
  };
}
