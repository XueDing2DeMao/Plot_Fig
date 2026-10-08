import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDraftStorage } from './draft-storage.js';
import { createRecoveryRecord } from './draft-record.js';
import { defaultTemplate } from '../state/default-template.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { serializeWorkspaceProject } from '../state/workspace-project.js';

afterEach(() => vi.unstubAllGlobals());

function validRecord() {
  return createRecoveryRecord({
    draftId: 'a',
    sessionId: 'session',
    revision: 1,
    createdAt: 1,
    updatedAt: 2,
    projectJson: serializeWorkspaceProject(defaultTemplate(), emptyWorkspace()),
  });
}

function opening() {
  // 只控制连接/事件生命周期，不模拟 IndexedDB 的事务或原子性。
  const request = {} as IDBOpenDBRequest;
  const indexedDB = { open: vi.fn(() => request) } as unknown as IDBFactory;
  const storage = createDraftStorage({
    indexedDB,
    databaseName: 'isolated-test',
  });
  return { request, indexedDB, storage };
}

describe('recovery storage connection lifecycle', () => {
  it('reports unavailable browser storage without falling back to another persistence API', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(createDraftStorage().readSettings()).rejects.toThrow(
      /无法使用/,
    );
  });

  it('validates candidate project data before opening the database', async () => {
    const { indexedDB, storage } = opening();
    const record = createRecoveryRecord({
      ...validRecord(),
      projectJson: '{}',
    });
    await expect(
      storage.writeDraft({ record, mode: 'create', expectedPolicyRevision: 0 }),
    ).rejects.toThrow(/项目/);
    expect(indexedDB.open).not.toHaveBeenCalled();
  });

  it('rejects an already cancelled write without opening a database', async () => {
    const { indexedDB, storage } = opening();
    const controller = new AbortController();
    controller.abort();
    await expect(
      storage.writeDraft(
        { record: validRecord(), mode: 'create', expectedPolicyRevision: 0 },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(indexedDB.open).not.toHaveBeenCalled();
  });

  it('closes a late successful connection after an upgrade was blocked', async () => {
    const { request, storage } = opening();
    const pending = storage.readSettings();
    request.onblocked!.call(request, {} as IDBVersionChangeEvent);
    await expect(pending).rejects.toThrow(/关闭其他/);
    const close = vi.fn();
    Object.defineProperty(request, 'result', { value: { close } });
    request.onsuccess!.call(request, new Event('success'));
    expect(close).toHaveBeenCalledOnce();
  });

  it('waits for transaction commit rather than reporting request success', async () => {
    const { request, storage } = opening();
    const get = {} as IDBRequest;
    const tx = {
      objectStore: () => ({ get: () => get }),
    } as unknown as IDBTransaction;
    const close = vi.fn();
    const db = { transaction: () => tx, close } as unknown as IDBDatabase;
    Object.defineProperty(request, 'result', { value: db });
    const settled = vi.fn();
    const pending = storage.readSettings().then((result) => {
      settled(result);
      return result;
    });
    request.onsuccess!.call(request, new Event('success'));
    await Promise.resolve();
    Object.defineProperty(get, 'result', { value: undefined });
    get.onsuccess!.call(get, new Event('success'));
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();
    tx.oncomplete!.call(tx, new Event('complete'));
    await expect(pending).resolves.toMatchObject({
      enabled: true,
      policyRevision: 0,
    });
    expect(close).toHaveBeenCalledOnce();
  });
});
