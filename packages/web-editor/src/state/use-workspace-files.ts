import { bindWorkspace } from '@plot-fig/data-binding';
import { rescaleFigureRanges } from '@plot-fig/svg-renderer';
import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { DATA_LIMITS } from '@plot-fig/data-binding';
import type { ProjectControlStatus } from '../components/ProjectControls.js';
import type { ProjectDiagnostic } from './project-file.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { readFileText } from '../data/file-input.js';
import { useEditorHistory } from './use-editor-history.js';
import {
  shareEditorModel,
  type EditorHistoryOptions,
} from './editor-history.js';
import { assertTemplate } from './publication-utils.js';
import { validateWorkspace } from './workspace-validation.js';
import { samePropertyValue } from '../components/property-draft-patches.js';

type ModelSetter = Dispatch<SetStateAction<WorkspaceEditor>>;
function downloadProject(model: WorkspaceEditor) {
  const serialized = serializeWorkspaceProject(model.template, model.workspace);
  const url = URL.createObjectURL(
    new Blob([serialized], { type: 'application/json' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'workspace.plotfig.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function sameProject(left: WorkspaceEditor, right: WorkspaceEditor) {
  return (
    samePropertyValue(left.template, right.template) &&
    samePropertyValue(left.workspace, right.workspace)
  );
}
// 只缓存递归冻结的历史节点。更换模板时仍检查绑定到的数据槽是否存在。
const validTemplates = new WeakSet<WorkspaceEditor['template']>();
const validWorkspaces = new WeakSet<WorkspaceEditor['workspace']>();
function validateModel(model: WorkspaceEditor) {
  if (!validTemplates.has(model.template)) {
    assertTemplate(model.template);
    validTemplates.add(model.template);
  }
  if (!validWorkspaces.has(model.workspace)) {
    validateWorkspace(model.workspace, model.template);
    validWorkspaces.add(model.workspace);
  } else {
    const ids = new Set(
      model.template.dataSlots.map((slot) => slot.dataSlotId),
    );
    for (const id of Object.keys(model.workspace.slotBindings))
      if (!ids.has(id)) throw new Error(`/slotBindings/${id}：悬空引用`);
  }
}
export type WorkspaceTransactionOptions = EditorHistoryOptions & {
  exact?: boolean;
};
function useFileStatus(initialSnapshot: WorkspaceEditor) {
  const [status, setStatus] = useState<ProjectControlStatus>('idle');
  const [message, setMessage] = useState('尚未保存项目');
  const [savedSnapshot, setSavedSnapshot] = useState<WorkspaceEditor | null>(
    initialSnapshot,
  );
  const [errors, setErrors] = useState<ProjectDiagnostic[]>([]);
  const revision = useRef(0);
  const [openedVersion, setOpenedVersion] = useState(0);
  const report = (status: ProjectControlStatus, message: string) => {
    setStatus(status);
    setMessage(message);
  };
  return {
    status,
    message,
    errors,
    setErrors,
    revision,
    report,
    openedVersion,
    setOpenedVersion,
    savedSnapshot,
    setSavedSnapshot,
  };
}
function readProjectHandler(
  state: ReturnType<typeof useFileStatus>,
  replace: (model: WorkspaceEditor) => WorkspaceEditor,
) {
  return async (
    readProject: () => Promise<string>,
    recovery: boolean,
    canReplace: () => boolean = () => true,
  ): Promise<boolean> => {
    // 先分配 ticket 再读取草稿；恢复和文件打开共用同一条异步替换序列。
    const ticket = ++state.revision.current;
    const action = recovery ? '恢复草稿' : '打开项目';
    state.report('opening', `正在${action}…`);
    try {
      const text = await readProject();
      if (ticket !== state.revision.current) return false;
      if (!canReplace()) {
        state.report(
          'error',
          `读取期间工作区有新修改，已取消${action}；请重新尝试。`,
        );
        return false;
      }
      const result = parseWorkspaceProject(text);
      if (!result.ok) {
        state.setErrors(result.diagnostics);
        state.report(
          'error',
          recovery
            ? '恢复草稿无效，当前工作区已保留'
            : '项目文件无法打开，当前工作区已保留',
        );
        return false;
      }
      const next = replace({
        template: result.template,
        workspace: result.workspace,
      });
      // 草稿不是用户下载过的项目文件，恢复后仍需手动下载形成保存点。
      state.setSavedSnapshot(recovery ? null : next);
      state.setOpenedVersion((version) => version + 1);
      state.setErrors([]);
      state.report(
        'ready',
        recovery ? '草稿已恢复，请下载项目文件以正式保存' : '项目已打开',
      );
      return true;
    } catch (error) {
      if (ticket === state.revision.current)
        state.report(
          'error',
          error instanceof Error ? error.message : `${action}失败`,
        );
      return false;
    }
  };
}
export function useWorkspaceFiles(
  model: WorkspaceEditor,
  setModel: ModelSetter,
) {
  const history = useEditorHistory(model);
  const state = useFileStatus(history.current);
  const unsavedChanges = useMemo(
    () =>
      state.savedSnapshot === null || !sameProject(model, state.savedSnapshot),
    [model.template, model.workspace, state.savedSnapshot],
  );
  const currentModel = useRef(history.current);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [contentRevision, setContentRevision] = useState(0);
  const publish = (next: WorkspaceEditor) => {
    currentModel.current = next;
    state.revision.current += 1;
    setModel(next);
    state.setErrors([]);
  };
  const update = (
    change: (current: WorkspaceEditor) => WorkspaceEditor,
    options: WorkspaceTransactionOptions = {},
  ) => {
    try {
      const before = currentModel.current;
      let candidate = shareEditorModel(before, change(before));
      if (
        candidate.activePanelId &&
        !candidate.template.panels.some(
          (p) => p.panelId === candidate.activePanelId,
        )
      )
        candidate = shareEditorModel(before, {
          ...candidate,
          activePanelId: candidate.template.panels[0]!.panelId,
        });
      // 选择与无效操作不触发自动缩放，也不截断重做分支。
      if (
        candidate.template === before.template &&
        candidate.workspace === before.workspace
      ) {
        const next = history.commit(candidate, options);
        if (next !== before) {
          // 选择不属于内容修改，不作废正在读取的项目。
          currentModel.current = next;
          setModel(next);
        }
        return true;
      }
      validateModel(candidate);
      const resolved = options.exact
        ? { template: candidate.template, diagnostics: [] }
        : rescaleFigureRanges({
            before: before.template,
            candidate: candidate.template,
            beforeData: bindWorkspace(before.template, before.workspace),
            data: bindWorkspace(candidate.template, candidate.workspace),
            reason: 'change',
          });
      const errors = resolved.diagnostics.filter((d) => d.severity === 'error');
      if (errors.length)
        throw new Error(errors.map((d) => d.message).join('；'));
      const next = shareEditorModel(before, {
        ...candidate,
        template: resolved.template,
      });
      validateModel(next);
      const committed = history.commit(next, options);
      if (
        committed.template !== before.template ||
        committed.workspace !== before.workspace
      ) {
        publish(committed);
        setContentRevision((revision) => revision + 1);
      } else if (committed !== before) {
        currentModel.current = committed;
        setModel(committed);
      }
      state.report(
        resolved.diagnostics.length ? 'error' : 'idle',
        history.message ||
          resolved.diagnostics.map((d) => d.message).join('；') ||
          '有未保存修改，请下载项目文件',
      );
      return true;
    } catch (cause) {
      state.report(
        'error',
        cause instanceof Error ? cause.message : '无法应用图表修改',
      );
      return false;
    }
  };
  const restore = (direction: 'undo' | 'redo') => {
    const candidate =
      direction === 'undo' ? history.peekUndo() : history.peekRedo();
    if (!candidate) return false;
    try {
      // 历史恢复只做校验，不运行修改事件的 rescale 或重建操作。
      validateModel(candidate);
      const next = history[direction]()!;
      publish(next);
      setContentRevision((revision) => revision + 1);
      setHistoryVersion((version) => version + 1);
      state.report('idle', direction === 'undo' ? '已撤销' : '已重做');
      return true;
    } catch (error) {
      state.report(
        'error',
        error instanceof Error ? error.message : '无法恢复编辑历史',
      );
      return false;
    }
  };
  const onSave = (next: WorkspaceEditor = currentModel.current) => {
    try {
      downloadProject(next);
      // 保存点必须可达：之后的滚轮不能再与保存前的事务合并。
      history.commit(currentModel.current);
      state.setSavedSnapshot(shareEditorModel(currentModel.current, next));
      state.report('ready', '已发起项目下载，请保留下载的项目文件');
    } catch (error) {
      state.report(
        'error',
        error instanceof Error ? error.message : '项目无法保存',
      );
    }
  };
  const readProject = readProjectHandler(state, (next) => {
    const frozen = history.reset(next);
    publish(frozen);
    setHistoryVersion((version) => version + 1);
    return frozen;
  });
  return {
    status: state.status,
    unsavedChanges,
    message: state.message,
    projectErrors: state.errors,
    openedVersion: state.openedVersion,
    historyVersion,
    contentRevision,
    history,
    undo: () => restore('undo'),
    redo: () => restore('redo'),
    update,
    onOpen: async (file: File, canReplace?: () => boolean) => {
      await readProject(
        async () => {
          if (file.size > DATA_LIMITS.projectBytes)
            throw new Error('项目文件超过 20 MiB');
          return readFileText(file);
        },
        false,
        canReplace,
      );
    },
    onRecover: (read: () => Promise<string>, canReplace?: () => boolean) =>
      readProject(read, true, canReplace),
    onSave,
  };
}
