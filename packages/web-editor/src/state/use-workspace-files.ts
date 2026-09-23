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
function projectSnapshot(model: WorkspaceEditor) {
  return JSON.stringify([model.template, model.workspace]);
}
function useFileStatus(initialSnapshot: string) {
  const [status, setStatus] = useState<ProjectControlStatus>('idle');
  const [message, setMessage] = useState('尚未保存项目');
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot);
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
function openHandler(
  state: ReturnType<typeof useFileStatus>,
  setModel: ModelSetter,
) {
  return async (file: File, canReplace: () => boolean = () => true) => {
    const ticket = ++state.revision.current;
    state.report('opening', '正在打开项目…');
    try {
      if (file.size > DATA_LIMITS.projectBytes)
        throw new Error('项目文件超过 20 MiB');
      const result = parseWorkspaceProject(await readFileText(file));
      if (ticket !== state.revision.current) return;
      if (!canReplace()) {
        state.report(
          'error',
          '读取期间工作区有新修改，已取消打开项目；请重新打开。',
        );
        return;
      }
      if (!result.ok) {
        state.setErrors(result.diagnostics);
        state.report('error', '项目文件无法打开，当前工作区已保留');
        return;
      }
      const next = { template: result.template, workspace: result.workspace };
      setModel(next);
      state.setSavedSnapshot(projectSnapshot(next));
      state.setOpenedVersion((version) => version + 1);
      state.setErrors([]);
      state.report('ready', '项目已打开');
    } catch (error) {
      if (ticket === state.revision.current)
        state.report(
          'error',
          error instanceof Error ? error.message : '项目无法打开',
        );
    }
  };
}
export function useWorkspaceFiles(
  model: WorkspaceEditor,
  setModel: ModelSetter,
) {
  const snapshot = useMemo(
    () => projectSnapshot(model),
    [model.template, model.workspace],
  );
  const state = useFileStatus(snapshot);
  const unsavedChanges = snapshot !== state.savedSnapshot;
  const currentModel = useRef(model);
  currentModel.current = model;
  const update = (change: (current: WorkspaceEditor) => WorkspaceEditor) => {
    try {
      const before = currentModel.current;
      const candidate = change(before);
      const resolved = rescaleFigureRanges({
        before: before.template,
        candidate: candidate.template,
        beforeData: bindWorkspace(before.template, before.workspace),
        data: bindWorkspace(candidate.template, candidate.workspace),
        reason: 'change',
      });
      const next = { ...candidate, template: resolved.template };
      currentModel.current = next;
      state.revision.current += 1;
      setModel(next);
      state.setErrors([]);
      state.report(
        resolved.diagnostics.length ? 'error' : 'idle',
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
  const onSave = (next: WorkspaceEditor = currentModel.current) => {
    try {
      downloadProject(next);
      state.setSavedSnapshot(projectSnapshot(next));
      state.report('ready', '已发起项目下载，请保留下载的项目文件');
    } catch (error) {
      state.report(
        'error',
        error instanceof Error ? error.message : '项目无法保存',
      );
    }
  };
  return {
    status: state.status,
    unsavedChanges,
    message: state.message,
    projectErrors: state.errors,
    openedVersion: state.openedVersion,
    update,
    onOpen: openHandler(state, setModel),
    onSave,
  };
}
