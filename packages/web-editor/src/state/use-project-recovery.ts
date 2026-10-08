import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  defaultDraftStorage,
  type DraftStorage,
} from '../browser/draft-storage.js';
import {
  createRecoveryRecord,
  type RecoveryDraftSummary,
  type RecoverySettingsV1,
  type RecoveryWriteResult,
} from '../browser/draft-record.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import { serializeWorkspaceProject } from './workspace-project.js';
import { createProjectRecoveryScheduler } from './project-recovery-scheduler.js';

export type ProjectRecoveryStatus =
  | 'loading'
  | 'idle'
  | 'pending'
  | 'saving'
  | 'saved'
  | 'disabled'
  | 'error'
  | 'capacity'
  | 'deleted';
type RecoveryView = {
  settings: RecoverySettingsV1 | null;
  loading: boolean;
  ready: boolean;
  drafts: RecoveryDraftSummary[];
  status: ProjectRecoveryStatus;
  message: string;
  updatedAt?: number | undefined;
};
type RecoverySession = {
  draftId: string;
  createdAt: number;
  sourceDraftId?: string | undefined;
  revision: number;
  dirty: boolean;
  exists: boolean;
  deleted: boolean;
};
type RecoveryInput = {
  model: WorkspaceEditor;
  contentRevision: number;
  projectVersion: number;
  recoverySourceId?: string | undefined;
  storage?: DraftStorage;
};
type Candidate = {
  model: WorkspaceEditor;
  session: RecoverySession;
  revision: number;
  policyRevision: number;
};
// 页面身份只存在内存，复制标签页或刷新不会继承 sessionStorage 中的身份。
let pageSessionId: string | undefined;
function newSession(sourceDraftId?: string): RecoverySession {
  return {
    draftId: crypto.randomUUID(),
    createdAt: Date.now(),
    sourceDraftId,
    revision: 0,
    dirty: false,
    exists: false,
    deleted: false,
  };
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '恢复草稿无法更新';
}
export function useProjectRecovery(input: RecoveryInput) {
  const storage = input.storage ?? defaultDraftStorage;
  const [view, setView] = useState<RecoveryView>({
    settings: null,
    loading: true,
    ready: false,
    drafts: [],
    status: 'loading',
    message: '正在读取恢复草稿…',
  });
  const runtime = useRef({
    mounted: false,
    epoch: 0,
    refreshTicket: 0,
    policyTicket: 0,
    policyBusy: false,
    ready: false,
    settings: null as RecoverySettingsV1 | null,
    session: newSession(input.recoverySourceId),
    latest: input,
    baselineRevision: input.contentRevision,
    projectVersion: input.projectVersion,
  });
  const controller = useMemo(() => {
    const state = runtime.current;
    pageSessionId ??= crypto.randomUUID();
    const sessionId = pageSessionId;
    let channel: BroadcastChannel | undefined;
    let policyQueue = Promise.resolve();
    const patch = (next: Partial<RecoveryView>) => {
      if (state.mounted) setView((current) => ({ ...current, ...next }));
    };
    const report = (status: ProjectRecoveryStatus, message: string) =>
      patch({ status, message });
    const broadcast = () => {
      try {
        channel?.postMessage({ type: 'changed' });
      } catch {
        /* 广播仅用于 UI 同步；事务检查仍保证正确性。 */
      }
    };
    const deleted = () => {
      state.session.deleted = true;
      scheduler.cancel();
      report('deleted', '该恢复副本已删除；可重新保留当前工作区');
    };
    const refresh = async () => {
      const epoch = state.epoch;
      const ticket = ++state.refreshTicket;
      const policyTicket = state.policyTicket;
      const wasReady = state.ready;
      try {
        const [settingsResult, draftsResult] = await Promise.allSettled([
          storage.readSettings(),
          storage.listDrafts(),
        ]);
        if (
          !state.mounted ||
          epoch !== state.epoch ||
          ticket !== state.refreshTicket ||
          policyTicket !== state.policyTicket ||
          state.policyBusy
        )
          return;
        // 设置版本异常只暂停写入，不能遮蔽仍可读取和清理的恢复记录。
        if (draftsResult.status === 'fulfilled')
          patch({ drafts: draftsResult.value });
        if (settingsResult.status === 'rejected') throw settingsResult.reason;
        if (draftsResult.status === 'rejected') throw draftsResult.reason;
        const settings = settingsResult.value;
        const drafts = draftsResult.value;
        const changedPolicy =
          state.settings?.policyRevision !== settings.policyRevision;
        if (changedPolicy) scheduler.cancel();
        state.settings = settings;
        state.ready = true;
        patch({ settings, drafts, ready: true, loading: false });
        if (
          state.session.exists &&
          !drafts.some((draft) => draft.draftId === state.session.draftId)
        )
          deleted();
        else if (!settings.enabled)
          report('disabled', '自动保留恢复草稿已关闭');
        else if (!wasReady || changedPolicy)
          report('idle', '后续修改会自动保留恢复草稿');
        if (!wasReady && state.session.dirty && settings.enabled) schedule();
      } catch (error) {
        if (
          !state.mounted ||
          epoch !== state.epoch ||
          ticket !== state.refreshTicket ||
          policyTicket !== state.policyTicket
        )
          return;
        scheduler.cancel();
        state.ready = false;
        patch({ loading: false, ready: false });
        report('error', errorMessage(error));
      }
    };
    const scheduler = createProjectRecoveryScheduler<
      Candidate,
      RecoveryWriteResult
    >({
      async write(candidate, signal) {
        const settings = await storage.readSettings();
        if (signal.aborted)
          throw new DOMException('恢复写入已取消', 'AbortError');
        if (!settings.enabled) return { status: 'disabled' };
        if (settings.policyRevision !== candidate.policyRevision)
          return { status: 'stale' };
        const session = candidate.session;
        if (session.deleted) return { status: 'deleted' };
        const projectJson = serializeWorkspaceProject(
          candidate.model.template,
          candidate.model.workspace,
        );
        const record = createRecoveryRecord({
          draftId: session.draftId,
          sessionId,
          ...(session.sourceDraftId
            ? { sourceDraftId: session.sourceDraftId }
            : {}),
          revision: candidate.revision,
          name: candidate.model.template.metadata.name,
          createdAt: session.createdAt,
          updatedAt: Date.now(),
          projectJson,
        });
        const creating = !session.exists;
        const result = await storage.writeDraft(
          {
            record,
            mode: creating ? 'create' : 'update',
            expectedPolicyRevision: candidate.policyRevision,
          },
          signal,
        );
        // 适配器仅在事务提交后返回 saved；即使调度取消也保留旧会话的提交事实。
        if (result.status === 'saved') session.exists = true;
        return result;
      },
      onEvent(event) {
        if (!state.mounted || event.candidate.session !== state.session) return;
        if (event.status === 'pending') report('pending', '等待更新恢复草稿');
        else if (event.status === 'saving')
          report('saving', '正在更新恢复草稿…');
        else if (event.status === 'error')
          report('error', errorMessage(event.error));
        else if (event.status === 'saved') {
          const result = event.result;
          if (result.status === 'saved') {
            patch({ updatedAt: result.updatedAt });
            report(
              event.hasPending ? 'pending' : 'saved',
              event.hasPending ? '等待更新最新恢复草稿' : '恢复草稿已更新',
            );
            broadcast();
            void refresh();
          } else if (result.status === 'deleted') deleted();
          else if (result.status === 'capacity')
            report('capacity', '恢复草稿已满或超过容量，请先清理已有副本');
          else {
            scheduler.cancel();
            report(
              result.status === 'disabled' ? 'disabled' : 'error',
              result.status === 'disabled'
                ? '自动保留恢复草稿已关闭'
                : '恢复设置已变化，请重试',
            );
            void refresh();
          }
        }
      },
    });
    const schedule = () => {
      if (
        !state.mounted ||
        !state.ready ||
        state.policyBusy ||
        !state.settings?.enabled ||
        state.session.deleted
      )
        return;
      const session = state.session;
      session.dirty = false;
      session.revision += 1;
      scheduler.schedule({
        model: state.latest.model,
        session,
        revision: session.revision,
        policyRevision: state.settings.policyRevision,
      });
    };
    const resetSession = (sourceDraftId?: string) => {
      scheduler.cancel();
      state.session = newSession(sourceDraftId);
      state.baselineRevision = state.latest.contentRevision;
      state.projectVersion = state.latest.projectVersion;
      patch({ updatedAt: undefined });
      if (state.ready)
        report(
          state.settings?.enabled ? 'idle' : 'disabled',
          state.settings?.enabled
            ? '后续修改会自动保留恢复草稿'
            : '自动保留恢复草稿已关闭',
        );
    };
    return {
      refresh,
      resetSession,
      observe(latest: RecoveryInput) {
        state.latest = latest;
        // 恢复载荷与来源元数据可能分两次 render 到达，首次编辑前补齐同一会话。
        if (!state.session.exists && state.session.revision === 0)
          state.session.sourceDraftId = latest.recoverySourceId;
        if (latest.projectVersion !== state.projectVersion)
          resetSession(latest.recoverySourceId);
        else if (latest.contentRevision !== state.baselineRevision) {
          state.baselineRevision = latest.contentRevision;
          state.session.dirty = true;
          schedule();
        }
      },
      start() {
        state.mounted = true;
        state.epoch += 1;
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            channel = new BroadcastChannel('plot-fig-project-recovery');
            channel.onmessage = () => {
              void refresh();
            };
          } catch {
            channel = undefined;
          }
        }
        void refresh();
        const focus = () => {
          void refresh();
        };
        const visibility = () => {
          if (document.visibilityState === 'hidden') scheduler.flush();
        };
        window.addEventListener('focus', focus);
        document.addEventListener('visibilitychange', visibility);
        return () => {
          state.mounted = false;
          state.epoch += 1;
          scheduler.cancel();
          channel?.close();
          channel = undefined;
          window.removeEventListener('focus', focus);
          document.removeEventListener('visibilitychange', visibility);
        };
      },
      async setEnabled(enabled: boolean) {
        const ticket = ++state.policyTicket;
        const epoch = state.epoch;
        state.policyBusy = true;
        scheduler.cancel();
        report(
          enabled ? 'pending' : 'disabled',
          enabled ? '正在启用自动恢复…' : '正在关闭自动恢复…',
        );
        const operation = policyQueue.then(() => storage.setEnabled(enabled));
        policyQueue = operation.then(
          () => undefined,
          () => undefined,
        );
        try {
          const settings = await operation;
          broadcast();
          if (
            !state.mounted ||
            epoch !== state.epoch ||
            ticket !== state.policyTicket
          )
            return;
          state.policyBusy = false;
          state.settings = settings;
          state.ready = true;
          patch({ settings, ready: true, loading: false });
          if (state.session.deleted)
            report('deleted', '该恢复副本已删除；可重新保留当前工作区');
          else if (enabled) schedule();
          else report('disabled', '自动保留恢复草稿已关闭');
        } catch (error) {
          if (
            !state.mounted ||
            epoch !== state.epoch ||
            ticket !== state.policyTicket
          )
            return;
          state.policyBusy = false;
          state.ready = false;
          patch({ ready: false });
          report('error', errorMessage(error));
        }
      },
      retry() {
        if (state.session.deleted) return;
        const session = state.session;
        void refresh().then(() => {
          if (session === state.session) schedule();
        });
      },
      resume() {
        resetSession(state.latest.recoverySourceId);
        schedule();
      },
      readDraft: (draftId: string) => storage.readDraft(draftId),
      async deleteDraft(draftId: string) {
        const session = state.session;
        const epoch = state.epoch;
        if (draftId === session.draftId) scheduler.cancel();
        try {
          await storage.deleteDraft(draftId);
          broadcast();
          if (!state.mounted || epoch !== state.epoch) return;
          if (session === state.session && draftId === session.draftId)
            deleted();
          await refresh();
        } catch (error) {
          if (state.mounted && epoch === state.epoch)
            report('error', errorMessage(error));
          throw error;
        }
      },
    };
  }, [storage]);
  useLayoutEffect(() => {
    controller.observe(input);
  }, [
    controller,
    input.model,
    input.contentRevision,
    input.projectVersion,
    input.recoverySourceId,
  ]);
  useEffect(() => controller.start(), [controller]);
  return {
    ...view,
    setEnabled: controller.setEnabled,
    retry: controller.retry,
    resume: controller.resume,
    resetSession: controller.resetSession,
    refresh: controller.refresh,
    readDraft: controller.readDraft,
    deleteDraft: controller.deleteDraft,
  };
}
