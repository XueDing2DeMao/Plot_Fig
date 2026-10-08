// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { afterEach, expect, it, vi } from 'vitest';
import type { DraftStorage } from '../browser/draft-storage.js';
import type {
  RecoveryRecordV1,
  RecoverySettingsV1,
  RecoveryWriteResult,
} from '../browser/draft-record.js';
import { defaultTemplate } from './default-template.js';
import { useProjectRecovery } from './use-project-recovery.js';
import type { WorkspaceEditor } from './workspace-editor.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function memoryStorage() {
  const records = new Map<string, RecoveryRecordV1>();
  let settings: RecoverySettingsV1 = {
    id: 'recovery',
    recordVersion: 1,
    enabled: true,
    policyRevision: 0,
  };
  const storage: DraftStorage = {
    listDrafts: vi.fn(async () =>
      [...records.values()].map((record) => ({
        draftId: record.draftId,
        name: record.name,
        updatedAt: record.updatedAt,
        payloadBytes: record.payloadBytes,
        recoverable: true,
      })),
    ),
    readDraft: vi.fn(async (id) => {
      const found = records.get(id);
      if (!found) throw new Error('不存在');
      return found;
    }),
    readSettings: vi.fn(async () => settings),
    setEnabled: vi.fn(async (enabled) => {
      settings = {
        ...settings,
        enabled,
        policyRevision: settings.policyRevision + 1,
      };
      return settings;
    }),
    deleteDraft: vi.fn(async (id) => {
      records.delete(id);
    }),
    writeDraft: vi.fn(
      async (
        { record, mode, expectedPolicyRevision },
        signal,
      ): Promise<RecoveryWriteResult> => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (!settings.enabled) return { status: 'disabled' };
        if (expectedPolicyRevision !== settings.policyRevision)
          return { status: 'stale' };
        if (mode === 'update' && !records.has(record.draftId))
          return { status: 'deleted' };
        records.set(record.draftId, record);
        return {
          status: 'saved',
          revision: record.revision,
          updatedAt: record.updatedAt,
        };
      },
    ),
  };
  return { storage, records };
}
function model(name = '初始项目'): WorkspaceEditor {
  const template = defaultTemplate();
  return {
    template: { ...template, metadata: { ...template.metadata, name } },
    workspace: emptyWorkspace(),
  };
}
async function setup(storage = memoryStorage().storage, strict = false) {
  vi.useFakeTimers();
  const initialProps = {
    model: model(),
    contentRevision: 0,
    projectVersion: 0,
    recoverySourceId: undefined as string | undefined,
    storage,
  };
  const hook = renderHook(useProjectRecovery, {
    initialProps,
    ...(strict ? { wrapper: StrictMode } : {}),
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return { ...hook, props: initialProps };
}
async function advance(ms = 2_000) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

it('does not save its initial baseline or selection renders, then creates and updates one draft for real edits', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  await advance(60_000);
  hook.rerender({
    ...hook.props,
    model: { ...hook.props.model, activePanelId: 'selection' },
  });
  await advance();
  expect(storage.writeDraft).not.toHaveBeenCalled();
  hook.rerender({ ...hook.props, model: model('第一次'), contentRevision: 1 });
  await advance(1_999);
  expect(storage.writeDraft).not.toHaveBeenCalled();
  await advance(1);
  expect(hook.result.current.status).toBe('saved');
  const [first] = [...records.values()];
  expect(first?.name).toBe('第一次');
  hook.rerender({ ...hook.props, model: model('第二次'), contentRevision: 2 });
  await advance();
  expect([...records.keys()]).toEqual([first!.draftId]);
  expect(
    vi.mocked(storage.writeDraft).mock.calls.map(([request]) => request.mode),
  ).toEqual(['create', 'update']);
});

it('treats a project switch and recovery source as a new baseline without writing it', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  const first = [...records.values()][0]!;
  hook.rerender({
    ...hook.props,
    model: model('恢复'),
    contentRevision: 2,
    projectVersion: 1,
    recoverySourceId: first.draftId,
  });
  await advance(60_000);
  expect(storage.writeDraft).toHaveBeenCalledTimes(1);
  hook.rerender({
    ...hook.props,
    model: model('恢复后修改'),
    contentRevision: 3,
    projectVersion: 1,
    recoverySourceId: first.draftId,
  });
  await advance();
  const second = [...records.values()][1]!;
  expect(second.draftId).not.toBe(first.draftId);
  expect(second.sessionId).toBe(first.sessionId);
  expect(second.sourceDraftId).toBe(first.draftId);
});

it('ignores a delayed old-project completion and does not create duplicate slots in StrictMode', async () => {
  const { storage } = memoryStorage();
  const pending = deferred<RecoveryWriteResult>();
  vi.mocked(storage.writeDraft).mockImplementationOnce(() => pending.promise);
  const hook = await setup(storage, true);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  expect(storage.writeDraft).toHaveBeenCalledTimes(1);
  hook.rerender({
    ...hook.props,
    model: model('新项目'),
    contentRevision: 2,
    projectVersion: 1,
  });
  expect(vi.mocked(storage.writeDraft).mock.calls[0]![1]!.aborted).toBe(true);
  await act(async () => {
    pending.resolve({ status: 'saved', revision: 1, updatedAt: Date.now() });
  });
  expect(hook.result.current.status).toBe('idle');
  expect(hook.result.current.updatedAt).toBeUndefined();
});

it('stops immediately when disabled and explicit re-enable saves the latest confirmed model', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await act(async () => {
    await hook.result.current.setEnabled(false);
  });
  await advance(60_000);
  expect(storage.writeDraft).not.toHaveBeenCalled();
  expect(hook.result.current.status).toBe('disabled');
  hook.rerender({
    ...hook.props,
    model: model('关闭期间修改'),
    contentRevision: 2,
  });
  await act(async () => {
    await hook.result.current.setEnabled(true);
  });
  await advance();
  expect([...records.values()][0]?.name).toBe('关闭期间修改');
  expect(
    vi.mocked(storage.writeDraft).mock.calls[0]![0].expectedPolicyRevision,
  ).toBe(2);
});

it('does not resurrect deleted drafts until the user explicitly resumes with a new identity', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  const oldId = [...records.keys()][0]!;
  await act(async () => {
    await hook.result.current.deleteDraft(oldId);
  });
  hook.rerender({ ...hook.props, contentRevision: 2 });
  await advance();
  expect(hook.result.current.status).toBe('deleted');
  expect(records.size).toBe(0);
  act(() => hook.result.current.retry());
  await advance();
  expect(records.size).toBe(0);
  act(() => hook.result.current.resume());
  await advance();
  expect(records.size).toBe(1);
  expect([...records.keys()][0]).not.toBe(oldId);
});

it('checks shared settings again before a write even without a cross-tab notification', async () => {
  const { storage } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await storage.setEnabled(false);
  await advance();
  expect(storage.writeDraft).not.toHaveBeenCalled();
  expect(hook.result.current.status).toBe('disabled');
});

it('keeps failures visible without automatic retries and allows explicit retry', async () => {
  const { storage } = memoryStorage();
  vi.mocked(storage.writeDraft).mockRejectedValueOnce(new Error('配额不足'));
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance(60_000);
  expect(storage.writeDraft).toHaveBeenCalledTimes(1);
  expect(hook.result.current.message).toContain('配额不足');
  act(() => hook.result.current.retry());
  await advance();
  expect(storage.writeDraft).toHaveBeenCalledTimes(2);
  expect(hook.result.current.status).toBe('saved');
});

it('reports startup storage errors and retains the current model', async () => {
  const { storage } = memoryStorage();
  vi.mocked(storage.readSettings).mockRejectedValue(new Error('恢复设置损坏'));
  const hook = await setup(storage);
  expect(hook.result.current.status).toBe('error');
  expect(hook.result.current.message).toContain('恢复设置损坏');
  expect(hook.result.current.ready).toBe(false);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  expect(storage.writeDraft).not.toHaveBeenCalled();
});

it('cancels queued and active work on cleanup', async () => {
  const { storage } = memoryStorage();
  const pending = deferred<RecoveryWriteResult>();
  vi.mocked(storage.writeDraft).mockImplementationOnce(() => pending.promise);
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  hook.rerender({ ...hook.props, contentRevision: 2 });
  hook.unmount();
  expect(vi.mocked(storage.writeDraft).mock.calls[0]![1]!.aborted).toBe(true);
  pending.resolve({ status: 'saved', revision: 1, updatedAt: Date.now() });
  await advance(60_000);
  expect(storage.writeDraft).toHaveBeenCalledTimes(1);
});

it('attaches a recovery source delivered in the render after its new-project baseline', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, projectVersion: 1, contentRevision: 1 });
  hook.rerender({
    ...hook.props,
    projectVersion: 1,
    contentRevision: 1,
    recoverySourceId: 'source-draft',
  });
  await advance();
  expect(storage.writeDraft).not.toHaveBeenCalled();
  hook.rerender({
    ...hook.props,
    projectVersion: 1,
    contentRevision: 2,
    recoverySourceId: 'source-draft',
  });
  await advance();
  expect([...records.values()][0]?.sourceDraftId).toBe('source-draft');
});

it('can create again after disabling aborts its first uncommitted transaction', async () => {
  const { storage, records } = memoryStorage();
  vi.mocked(storage.writeDraft).mockImplementationOnce(
    (_request, signal) =>
      new Promise((_resolve, reject) => {
        signal!.addEventListener(
          'abort',
          () => reject(new DOMException('aborted', 'AbortError')),
          { once: true },
        );
      }),
  );
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  await act(async () => {
    const disabling = hook.result.current.setEnabled(false);
    const enabling = hook.result.current.setEnabled(true);
    await Promise.all([disabling, enabling]);
  });
  await advance();
  expect(records.size).toBe(1);
  expect(hook.result.current.status).toBe('saved');
  expect(
    vi.mocked(storage.writeDraft).mock.calls.map(([request]) => request.mode),
  ).toEqual(['create', 'create']);
});

it('keeps recovery usable when BroadcastChannel is blocked by the browser', async () => {
  vi.stubGlobal(
    'BroadcastChannel',
    class {
      constructor() {
        throw new DOMException('blocked', 'SecurityError');
      }
    },
  );
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  expect(records.size).toBe(1);
  expect(hook.result.current.status).toBe('saved');
});

it('rejects externally deleted updates and requires an explicit new draft identity', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  records.clear();
  hook.rerender({ ...hook.props, contentRevision: 2 });
  await advance();
  expect(hook.result.current.status).toBe('deleted');
  hook.rerender({ ...hook.props, contentRevision: 3 });
  await advance(60_000);
  expect(storage.writeDraft).toHaveBeenCalledTimes(2);
  expect(records.size).toBe(0);
});

it('preserves the last successful record when a later model cannot be serialized', async () => {
  const { storage, records } = memoryStorage();
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  const first = [...records.values()][0]!;
  const invalid = {
    ...hook.props.model,
    workspace: {
      ...hook.props.model.workspace,
      slotBindings: { missing: { tableId: 'unknown', columnId: 'unknown' } },
    },
  };
  hook.rerender({ ...hook.props, model: invalid, contentRevision: 2 });
  await advance(60_000);
  expect(hook.result.current.status).toBe('error');
  expect([...records.values()]).toEqual([first]);
  expect(storage.writeDraft).toHaveBeenCalledTimes(1);
});

it('recovers from unavailable startup storage only after an explicit retry', async () => {
  const { storage, records } = memoryStorage();
  vi.mocked(storage.readSettings).mockRejectedValueOnce(
    new Error('暂时不可用'),
  );
  const hook = await setup(storage);
  expect(hook.result.current.ready).toBe(false);
  act(() => hook.result.current.retry());
  await advance();
  expect(hook.result.current.status).toBe('saved');
  expect(records.size).toBe(1);
});

it('shows an older committed snapshot as pending until the newest queued edit commits', async () => {
  const { storage } = memoryStorage();
  const originalWrite = vi.mocked(storage.writeDraft).getMockImplementation()!;
  const first = deferred<void>();
  const latest = deferred<void>();
  vi.mocked(storage.writeDraft)
    .mockImplementationOnce(async (...args) => {
      await first.promise;
      return originalWrite(...args);
    })
    .mockImplementationOnce(async (...args) => {
      await latest.promise;
      return originalWrite(...args);
    });
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, model: model('v1'), contentRevision: 1 });
  await advance();
  hook.rerender({ ...hook.props, model: model('v2'), contentRevision: 2 });
  hook.rerender({ ...hook.props, model: model('v3'), contentRevision: 3 });
  await act(async () => {
    first.resolve();
  });
  expect(hook.result.current.status).toBe('pending');
  await advance();
  expect(hook.result.current.status).toBe('saving');
  expect(
    vi
      .mocked(storage.writeDraft)
      .mock.calls.map(([request]) => request.record.name),
  ).toEqual(['v1', 'v3']);
  await act(async () => {
    latest.resolve();
  });
  expect(hook.result.current.status).toBe('saved');
});

it('does not resurrect a first commit deleted while its successful callback is delayed', async () => {
  const { storage, records } = memoryStorage();
  const originalWrite = vi.mocked(storage.writeDraft).getMockImplementation()!;
  const completion = deferred<void>();
  vi.mocked(storage.writeDraft).mockImplementationOnce(async (...args) => {
    const result = await originalWrite(...args);
    await completion.promise;
    return result;
  });
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  records.clear();
  await act(async () => {
    await hook.result.current.setEnabled(false);
    await hook.result.current.setEnabled(true);
    completion.resolve();
  });
  await advance();
  expect(records.size).toBe(0);
  expect(hook.result.current.status).toBe('deleted');
  expect(
    vi.mocked(storage.writeDraft).mock.calls.map(([request]) => request.mode),
  ).toEqual(['create', 'update']);
});

it('does not retry a failed write merely because a later background refresh recovers', async () => {
  const { storage } = memoryStorage();
  vi.mocked(storage.writeDraft).mockRejectedValueOnce(new Error('配额不足'));
  const hook = await setup(storage);
  hook.rerender({ ...hook.props, contentRevision: 1 });
  await advance();
  vi.mocked(storage.readSettings).mockRejectedValueOnce(
    new Error('暂时不可读'),
  );
  await act(async () => {
    await hook.result.current.refresh();
  });
  await act(async () => {
    await hook.result.current.refresh();
  });
  await advance(60_000);
  expect(storage.writeDraft).toHaveBeenCalledTimes(1);
});

it('keeps existing drafts available to read and delete when shared settings are corrupt', async () => {
  const { storage, records } = memoryStorage();
  const first = await setup(storage);
  first.rerender({ ...first.props, contentRevision: 1 });
  await advance();
  const draftId = [...records.keys()][0]!;
  first.unmount();
  vi.mocked(storage.readSettings).mockRejectedValue(new Error('恢复设置损坏'));
  const hook = await setup(storage);
  expect(hook.result.current.ready).toBe(false);
  expect(hook.result.current.status).toBe('error');
  expect(hook.result.current.drafts.map((draft) => draft.draftId)).toEqual([
    draftId,
  ]);
  expect((await hook.result.current.readDraft(draftId)).draftId).toBe(draftId);
  await act(async () => {
    await hook.result.current.deleteDraft(draftId);
  });
  expect(hook.result.current.drafts).toEqual([]);
  expect(records.size).toBe(0);
});
