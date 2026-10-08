import type { WorkspaceEditor } from './workspace-editor.js';

export type EditorHistoryLimits = { maxEntries?: number; maxBytes?: number };
export type EditorHistoryOptions = {
  label?: string;
  group?: string;
  time?: number;
};
export interface EditorHistory {
  readonly current: WorkspaceEditor;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoCount: number;
  readonly redoCount: number;
  readonly estimatedBytes: number;
  readonly message: string | undefined;
  commit(
    next: WorkspaceEditor,
    options?: EditorHistoryOptions,
  ): WorkspaceEditor;
  peekUndo(): WorkspaceEditor | undefined;
  peekRedo(): WorkspaceEditor | undefined;
  undo(): WorkspaceEditor | undefined;
  redo(): WorkspaceEditor | undefined;
  reset(model: WorkspaceEditor): WorkspaceEditor;
}

type ObjectInfo = { bytes: number; children: object[] };
// 只缓存由本模块创建并递归冻结的 JSON 节点；WeakMap 不延长旧快照寿命。
const objectInfo = new WeakMap<object, ObjectInfo>();

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function primitiveBytes(value: unknown): number {
  if (typeof value === 'string') return 16 + value.length * 2;
  if (typeof value === 'number') return 8;
  if (typeof value === 'boolean' || value === null) return 4;
  return 0;
}

function immutableShared(
  candidate: unknown,
  previous: unknown,
  visited: WeakMap<object, unknown>,
): unknown {
  if (!isObject(candidate)) return candidate;
  const owned = objectInfo.has(candidate);
  if (owned && candidate === previous) return candidate;
  if (visited.has(candidate)) return visited.get(candidate);
  const array = Array.isArray(candidate);
  const prior =
    isObject(previous) && Array.isArray(previous) === array
      ? previous
      : undefined;
  if (owned && !prior) return candidate;
  const keys = Object.keys(candidate);
  const result: Record<string, unknown> = array
    ? ([] as unknown as Record<string, unknown>)
    : {};
  const children: object[] = [];
  let bytes = array ? 24 : 32;
  let equal = !!prior && keys.length === Object.keys(prior).length;
  let unchanged = owned;
  visited.set(candidate, result);
  for (const key of keys) {
    const value = immutableShared(candidate[key], prior?.[key], visited);
    if (!prior || !Object.hasOwn(prior, key) || value !== prior[key])
      equal = false;
    if (value !== candidate[key]) unchanged = false;
    if (key === '__proto__') {
      Object.defineProperty(result, key, { value, enumerable: true });
    } else {
      result[key] = value;
    }
    // 对象与指针采用保守固定开销；字符串按 UTF-16 估算，不当作精确堆大小。
    bytes += 8 + (array ? 0 : key.length * 2);
    if (isObject(value)) children.push(value);
    else bytes += primitiveBytes(value);
  }
  if (equal) {
    visited.set(candidate, prior);
    return prior;
  }
  if (unchanged) {
    visited.set(candidate, candidate);
    return candidate;
  }
  Object.freeze(result);
  objectInfo.set(result, { bytes, children });
  return result;
}

/** 归并值相同的分支，返回独立于调用者可变对象的递归冻结模型。 */
export function shareEditorModel(
  previous: WorkspaceEditor,
  candidate: WorkspaceEditor,
): WorkspaceEditor {
  const baseline = objectInfo.has(previous)
    ? previous
    : immutableShared(previous, undefined, new WeakMap());
  return immutableShared(candidate, baseline, new WeakMap()) as WorkspaceEditor;
}

function limit(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(0, Math.floor(value));
}

/** 估算包含 current、past、future 的唯一共享对象图，预算裁剪只移除历史。 */
export function createEditorHistory(
  initial: WorkspaceEditor,
  limits: EditorHistoryLimits = {},
): EditorHistory {
  const maxEntries = limit(limits.maxEntries, 100);
  const maxBytes = limit(limits.maxBytes, 64 * 1024 * 1024);
  const past: WorkspaceEditor[] = [];
  const future: WorkspaceEditor[] = [];
  const references = new Map<object, number>();
  let bytes = 0;
  let current = immutableShared(
    initial,
    undefined,
    new WeakMap(),
  ) as WorkspaceEditor;
  let message: string | undefined;
  let group: { key: string; time: number } | undefined;

  function retain(value: object) {
    const count = references.get(value) ?? 0;
    references.set(value, count + 1);
    if (count) return;
    const info = objectInfo.get(value)!;
    bytes += info.bytes;
    for (const child of info.children) retain(child);
  }

  function release(value: object) {
    const count = references.get(value)!;
    if (count > 1) {
      references.set(value, count - 1);
      return;
    }
    references.delete(value);
    const info = objectInfo.get(value)!;
    bytes -= info.bytes;
    for (const child of info.children) release(child);
  }

  function clear(states: WorkspaceEditor[]) {
    for (const state of states) release(state);
    states.length = 0;
  }

  function trim() {
    while (
      past.length &&
      (past.length + future.length > maxEntries || bytes > maxBytes)
    ) {
      release(past.shift()!);
    }
    while (
      future.length &&
      (past.length + future.length > maxEntries || bytes > maxBytes)
    ) {
      release(future.shift()!);
    }
  }

  retain(current);

  return {
    get current() {
      return current;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    get undoCount() {
      return past.length;
    },
    get redoCount() {
      return future.length;
    },
    get estimatedBytes() {
      return bytes;
    },
    get message() {
      return message;
    },
    peekUndo: () => past.at(-1),
    peekRedo: () => future.at(-1),
    commit(candidate, options = {}) {
      const next = shareEditorModel(current, candidate);
      const time = options.time ?? Date.now();
      const sameGroup =
        !!options.group &&
        group?.key === options.group &&
        time >= group.time &&
        time - group.time < 300;
      if (next === current) {
        if (!sameGroup) group = undefined;
        return current;
      }
      // 图层选择只属于编辑上下文，不属于项目内容事务。
      if (
        next.template === current.template &&
        next.workspace === current.workspace
      ) {
        retain(next);
        release(current);
        current = next;
        group = undefined;
        trim();
        return current;
      }
      const merge = sameGroup && past.length > 0 && future.length === 0;
      retain(next);
      clear(future);
      if (merge) release(current);
      else past.push(current);
      current = next;
      message = undefined;
      const overBudget = bytes > maxBytes;
      trim();
      if (overBudget && past.length === 0) {
        message = '此操作超过编辑历史内存预算，已保留当前结果；该步无法撤销。';
      }
      group =
        options.group && past.length > 0
          ? { key: options.group, time }
          : undefined;
      return current;
    },
    undo() {
      group = undefined;
      const previous = past.pop();
      if (!previous) return undefined;
      future.push(current);
      current = previous;
      message = undefined;
      return current;
    },
    redo() {
      group = undefined;
      const next = future.pop();
      if (!next) return undefined;
      past.push(current);
      current = next;
      message = undefined;
      return current;
    },
    reset(model) {
      const next = shareEditorModel(current, model);
      retain(next);
      release(current);
      clear(past);
      clear(future);
      current = next;
      group = undefined;
      message = undefined;
      return current;
    },
  };
}
