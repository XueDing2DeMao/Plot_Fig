import { parseWorkspaceProject } from '../state/workspace-project.js';
import {
  evaluateRecoveryWrite,
  parseRecoveryRecord,
  parseRecoverySettings,
  summarizeRecoveryDraft,
  type DraftWriteRequest,
  type RecoveryDraftSummary,
  type RecoveryRecordV1,
  type RecoverySettingsV1,
  type RecoveryWriteResult,
} from './draft-record.js';

export type { DraftWriteRequest } from './draft-record.js';

export interface DraftStorage {
  listDrafts(): Promise<RecoveryDraftSummary[]>;
  readDraft(draftId: string): Promise<RecoveryRecordV1>;
  writeDraft(
    request: DraftWriteRequest,
    signal?: AbortSignal,
  ): Promise<RecoveryWriteResult>;
  deleteDraft(draftId: string): Promise<void>;
  readSettings(): Promise<RecoverySettingsV1>;
  setEnabled(enabled: boolean): Promise<RecoverySettingsV1>;
}

const DATABASE_NAME = 'plot-fig-project-recovery';
const DRAFTS = 'drafts';
const SETTINGS = 'settings';

function abortError(): DOMException {
  return new DOMException('恢复草稿写入已取消', 'AbortError');
}

function storageError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    if (error.name === 'QuotaExceededError')
      return new DOMException(
        '浏览器存储空间不足，旧恢复草稿已保留，请清理后重试',
        error.name,
      );
    return error;
  }
  return new Error(fallback);
}

export function createDraftStorage(
  options: {
    databaseName?: string;
    indexedDB?: IDBFactory;
  } = {},
): DraftStorage {
  // 异常键仍可从列表逐条清理；正常记录始终使用原始字符串主键。
  const unusualKeys = new Map<string, IDBValidKey>();
  let unusualKeySequence = 0;

  function openDatabase(signal?: AbortSignal): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      const factory = options.indexedDB ?? globalThis.indexedDB;
      if (!factory) {
        reject(new Error('浏览器无法使用恢复草稿存储，请手动下载项目文件'));
        return;
      }
      let settled = false;
      const finishError = (error: unknown) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', abort);
        reject(storageError(error, '恢复草稿数据库无法打开'));
      };
      const abort = () => finishError(abortError());
      signal?.addEventListener('abort', abort, { once: true });
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(options.databaseName ?? DATABASE_NAME, 1);
      } catch (error) {
        finishError(error);
        return;
      }
      request.onupgradeneeded = () => {
        if (settled) {
          request.transaction?.abort();
          return;
        }
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(DRAFTS))
            db.createObjectStore(DRAFTS, { keyPath: 'draftId' });
          if (!db.objectStoreNames.contains(SETTINGS))
            db.createObjectStore(SETTINGS, { keyPath: 'id' });
        } catch (error) {
          request.transaction?.abort();
          finishError(error);
        }
      };
      request.onblocked = () =>
        finishError(
          new Error(
            '恢复草稿数据库升级被阻塞，请关闭其他正在使用它的标签页后重试',
          ),
        );
      request.onerror = () => finishError(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        signal?.removeEventListener('abort', abort);
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }

  async function transaction<T>(
    stores: string[],
    mode: IDBTransactionMode,
    action: (
      tx: IDBTransaction,
      result: (value: T) => void,
      fail: (error: unknown) => void,
    ) => void,
    signal?: AbortSignal,
  ): Promise<T> {
    const db = await openDatabase(signal);
    if (signal?.aborted) {
      db.close();
      throw abortError();
    }
    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(stores, mode);
      } catch (error) {
        db.close();
        reject(storageError(error, '恢复草稿事务无法启动'));
        return;
      }
      let value: T;
      let hasResult = false;
      let failure: unknown;
      const cleanup = () => {
        signal?.removeEventListener('abort', abort);
        db.close();
      };
      const fail = (error: unknown) => {
        failure = error;
        try {
          tx.abort();
        } catch {
          // 已提交事务不能回滚；oncomplete 将给出真实提交结果。
        }
      };
      const abort = () => fail(abortError());
      tx.oncomplete = () => {
        cleanup();
        if (hasResult) resolve(value);
        else reject(storageError(failure, '恢复草稿事务未返回结果'));
      };
      tx.onabort = () => {
        cleanup();
        reject(
          storageError(failure ?? tx.error, '恢复草稿事务已中止，旧记录已保留'),
        );
      };
      tx.onerror = (event) => {
        failure ??= (event.target as IDBRequest | null)?.error ?? tx.error;
      };
      signal?.addEventListener('abort', abort, { once: true });
      try {
        action(
          tx,
          (result) => {
            value = result;
            hasResult = true;
          },
          fail,
        );
      } catch (error) {
        fail(error);
      }
    });
  }

  function success<T>(
    request: IDBRequest<T>,
    next: (value: T) => void,
    fail: (error: unknown) => void,
  ) {
    request.onsuccess = () => {
      try {
        next(request.result);
      } catch (error) {
        fail(error);
      }
    };
  }

  function key(draftId: string): IDBValidKey {
    return unusualKeys.get(draftId) ?? draftId;
  }

  return {
    listDrafts() {
      return transaction([DRAFTS], 'readonly', (tx, result, fail) => {
        const store = tx.objectStore(DRAFTS);
        // 并列请求保持同一读取快照，避免键和载荷对应关系受并发修改影响。
        const keysRequest = store.getAllKeys();
        const valuesRequest = store.getAll();
        success(
          valuesRequest,
          (values: unknown[]) => {
            const keys = keysRequest.result;
            const summaries = values.map((value, index) => {
              const storageKey = keys[index]!;
              let id: string;
              if (typeof storageKey === 'string') id = storageKey;
              else {
                id = `__invalid-recovery-key-${++unusualKeySequence}`;
                unusualKeys.set(id, storageKey);
              }
              return summarizeRecoveryDraft(value, id);
            });
            result(
              summaries.sort(
                (a, b) =>
                  b.updatedAt - a.updatedAt ||
                  a.draftId.localeCompare(b.draftId),
              ),
            );
          },
          fail,
        );
      });
    },
    readDraft(draftId) {
      return transaction([DRAFTS], 'readonly', (tx, result, fail) => {
        success(
          tx.objectStore(DRAFTS).get(key(draftId)),
          (value: unknown) => {
            if (value === undefined)
              throw new Error('该恢复草稿已删除或不存在');
            result(parseRecoveryRecord(value));
          },
          fail,
        );
      });
    },
    async writeDraft(request, signal) {
      if (signal?.aborted) throw abortError();
      const record = parseRecoveryRecord(request.record);
      const project = parseWorkspaceProject(record.projectJson);
      if (!project.ok)
        throw new Error(
          `恢复草稿项目无效：${project.diagnostics.map((item) => item.message).join('；')}`,
        );
      if (
        !Number.isSafeInteger(request.expectedPolicyRevision) ||
        request.expectedPolicyRevision < 0
      )
        throw new Error('恢复草稿策略修订号无效');
      return transaction(
        [DRAFTS, SETTINGS],
        'readwrite',
        (tx, result, fail) => {
          const drafts = tx.objectStore(DRAFTS);
          success(
            tx.objectStore(SETTINGS).get('recovery'),
            (settings: unknown) => {
              success(
                drafts.getAll(),
                (records: unknown[]) => {
                  const decision = evaluateRecoveryWrite({
                    ...request,
                    record,
                    records,
                    settings,
                  });
                  if (decision.status !== 'write') {
                    result(decision);
                    return;
                  }
                  success(
                    drafts.put(record),
                    () => {
                      result({
                        status: 'saved',
                        revision: record.revision,
                        updatedAt: record.updatedAt,
                      });
                    },
                    fail,
                  );
                },
                fail,
              );
            },
            fail,
          );
        },
        signal,
      );
    },
    deleteDraft(draftId) {
      return transaction([DRAFTS], 'readwrite', (tx, result, fail) => {
        success(
          tx.objectStore(DRAFTS).delete(key(draftId)),
          () => result(undefined),
          fail,
        );
      });
    },
    readSettings() {
      return transaction([SETTINGS], 'readonly', (tx, result, fail) => {
        success(
          tx.objectStore(SETTINGS).get('recovery'),
          (value: unknown) => result(parseRecoverySettings(value)),
          fail,
        );
      });
    },
    setEnabled(enabled) {
      return transaction([SETTINGS], 'readwrite', (tx, result, fail) => {
        const settings = tx.objectStore(SETTINGS);
        success(
          settings.get('recovery'),
          (value: unknown) => {
            const current = parseRecoverySettings(value);
            const next = parseRecoverySettings({
              ...current,
              enabled,
              policyRevision: current.policyRevision + 1,
            });
            success(settings.put(next), () => result(next), fail);
          },
          fail,
        );
      });
    },
  };
}

export const defaultDraftStorage = createDraftStorage();
