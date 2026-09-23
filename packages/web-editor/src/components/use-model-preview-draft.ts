import { useMemo, useState } from 'react';
import {
  validateFigureTemplate,
  resolvePanelFrames,
} from '@plot-fig/figure-schema';
import { bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import type { WorkspaceEditor } from '../state/workspace-editor.js';

// 模板与主题共用的模型草稿及预览；提交由各窗口控制。
export function useModelPreviewDraft(model: WorkspaceEditor) {
  const [draft, setDraft] = useState(() => structuredClone(model));
  const [actionError, setError] = useState('');
  const change = (fn: (model: WorkspaceEditor) => WorkspaceEditor) => {
    try {
      const next = fn(draft);
      next.template = resolvePanelFrames(next.template);
      setDraft(next);
      setError('');
      return next;
    } catch (error) {
      setError(error instanceof Error ? error.message : '无法修改');
      return undefined;
    }
  };
  const checked = useMemo(
    () => validateFigureTemplate(draft.template),
    [draft.template],
  );
  const preview = useMemo(() => {
    if (!checked.ok || !draft.workspace.tables.length) return undefined;
    return renderFigureSvg(
      draft.template,
      bindWorkspace(draft.template, draft.workspace),
    );
  }, [draft, checked.ok]);
  const error =
    actionError ||
    (!checked.ok
      ? checked.issues
          .slice(0, 3)
          .map((issue) => issue.path + ': ' + issue.message)
          .join('\n')
      : '');
  return { draft, change, error, preview };
}
