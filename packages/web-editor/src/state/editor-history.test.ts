// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import { createEditorHistory, shareEditorModel } from './editor-history.js';
import { useEditorHistory } from './use-editor-history.js';

afterEach(cleanup);

function editor(): WorkspaceEditor {
  const workspace = emptyWorkspace();
  workspace.tables = [
    createDataTable({
      tableId: 'measurements',
      source: { kind: 'csv', name: 'measurements.csv' },
      rows: [
        ['x', 'y'],
        ['0', '1'],
        ['1', '2'],
      ],
    }),
  ];
  return { template: defaultTemplate(), workspace };
}

function change(model: WorkspaceEditor, value: number): WorkspaceEditor {
  return {
    ...model,
    template: {
      ...model.template,
      metadata: { ...model.template.metadata, name: `change-${value}` },
    },
  };
}

describe('editor history', () => {
  it('连续撤销和重做三次完整事务', () => {
    const history = createEditorHistory(editor());
    const initial = history.current;
    const one = history.commit(change(initial, 1));
    const two = history.commit(change(one, 2));
    const three = history.commit(change(two, 3));
    expect(history.undoCount).toBe(3);
    expect(history.peekUndo()).toBe(two);
    expect(history.undo()).toBe(two);
    expect(history.undo()).toBe(one);
    expect(history.undo()).toBe(initial);
    expect(history.undo()).toBeUndefined();
    expect(history.canUndo).toBe(false);
    expect(history.redoCount).toBe(3);
    expect(history.peekRedo()).toBe(one);
    expect(history.redo()).toBe(one);
    expect(history.redo()).toBe(two);
    expect(history.redo()).toBe(three);
    expect(history.redo()).toBeUndefined();
    expect(history.canRedo).toBe(false);
  });

  it('撤销后有效的新提交截断重做分支', () => {
    const history = createEditorHistory(editor());
    history.commit(change(history.current, 1));
    history.commit(change(history.current, 2));
    history.undo();
    const branch = history.commit(change(history.current, 3));
    expect(history.redo()).toBeUndefined();
    expect(history.undoCount).toBe(2);
    history.undo();
    expect(history.redo()).toBe(branch);
  });

  it('值相同的深拷贝不增加历史或清除重做分支', () => {
    const history = createEditorHistory(editor());
    history.commit(change(history.current, 1));
    history.undo();
    const before = history.current;
    expect(history.commit(structuredClone(before))).toBe(before);
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(1);
  });

  it('来自其他控制器的相等冻结模型也视为无变化', () => {
    const history = createEditorHistory(editor());
    const initial = history.current;
    const peer = createEditorHistory(editor());
    expect(history.commit(peer.current)).toBe(initial);
    expect(history.undoCount).toBe(0);
  });

  it('预归并模型供验证阶段使用，重复提交复用相同的已冻结节点', () => {
    const history = createEditorHistory(editor());
    const next = shareEditorModel(history.current, change(history.current, 1));
    expect(next.workspace).toBe(history.current.workspace);
    expect(Object.isFrozen(next)).toBe(true);
    expect(history.commit(next)).toBe(next);
  });

  it('仅切换活动图层不生成历史且保留重做', () => {
    const history = createEditorHistory(editor());
    history.commit(change(history.current, 1));
    history.undo();
    history.commit({ ...history.current, activePanelId: 'panel-peer' });
    expect(history.current.activePanelId).toBe('panel-peer');
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(1);
  });

  it('同组连续操作在 300ms 内合并为最初状态到最终状态的一步', () => {
    const history = createEditorHistory(editor());
    const initial = history.current;
    history.commit(change(history.current, 1), { group: 'wheel', time: 0 });
    history.commit(change(history.current, 2), { group: 'wheel', time: 299 });
    const end = history.commit(change(history.current, 3), {
      group: 'wheel',
      time: 598,
    });
    expect(history.undoCount).toBe(1);
    expect(history.undo()).toBe(initial);
    expect(history.redo()).toBe(end);
  });

  it.each([300, -1])('达到 300ms 边界或时间回退时不合并（%s）', (time) => {
    const history = createEditorHistory(editor());
    history.commit(change(history.current, 1), { group: 'wheel', time: 0 });
    history.commit(change(history.current, 2), { group: 'wheel', time });
    expect(history.undoCount).toBe(2);
  });

  it.each(['ordinary', 'no-op', 'selection', 'other-group', 'undo-redo'])(
    '%s 打断原有连续操作组',
    (interrupt) => {
      const history = createEditorHistory(editor());
      history.commit(change(history.current, 1), { group: 'wheel', time: 0 });
      if (interrupt === 'ordinary') history.commit(change(history.current, 2));
      if (interrupt === 'no-op')
        history.commit(structuredClone(history.current));
      if (interrupt === 'selection')
        history.commit({ ...history.current, activePanelId: 'peer' });
      if (interrupt === 'other-group')
        history.commit(change(history.current, 2), { group: 'key', time: 1 });
      if (interrupt === 'undo-redo') {
        history.undo();
        history.redo();
      }
      const before = history.current;
      history.commit(change(before, 3), { group: 'wheel', time: 2 });
      expect(history.undo()).toBe(before);
    },
  );

  it('默认仅保留最近 100 次操作', () => {
    const history = createEditorHistory(editor());
    for (let n = 1; n <= 105; n++) history.commit(change(history.current, n));
    expect(history.undoCount).toBe(100);
    for (let n = 0; n < 100; n++) history.undo();
    expect(history.current.template.metadata.name).toBe('change-5');
    expect(history.undo()).toBeUndefined();
  });

  it('按共享对象图预算逐步移除最早历史', () => {
    const probe = createEditorHistory(editor());
    for (let n = 1; n <= 3; n++) probe.commit(change(probe.current, n));
    const budget = probe.estimatedBytes;
    const history = createEditorHistory(editor(), { maxBytes: budget });
    for (let n = 1; n <= 9; n++) history.commit(change(history.current, n));
    expect(history.estimatedBytes).toBeLessThanOrEqual(budget);
    expect(history.undoCount).toBeGreaterThan(0);
    expect(history.undoCount).toBeLessThan(9);
    expect(history.current.template.metadata.name).toBe('change-9');
  });

  it('单步无法纳入预算时保留结果、清除历史并提示无法撤销', () => {
    const base = editor();
    const probe = createEditorHistory(base);
    const history = createEditorHistory(base, {
      maxBytes: probe.estimatedBytes + 100,
    });
    const next = {
      ...history.current,
      template: {
        ...history.current.template,
        metadata: {
          ...history.current.template.metadata,
          name: 'x'.repeat(10000),
        },
      },
    };
    const committed = history.commit(next);
    expect(history.current).toBe(committed);
    expect(history.current.template.metadata.name).toHaveLength(10000);
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(0);
    expect(history.message).toMatch(/无法撤销/);
  });

  it('样式修改共享工作区与原始表格，深拷贝传入时也复用相等的数据', () => {
    const history = createEditorHistory(editor());
    const initial = history.current;
    const first = history.commit(change(initial, 1));
    const next = structuredClone(first);
    next.template.metadata.name = 'change-2';
    const second = history.commit(next);
    expect(first.workspace).toBe(initial.workspace);
    expect(second.workspace).toBe(initial.workspace);
    expect(second.workspace.tables[0]!.rows).toBe(
      initial.workspace.tables[0]!.rows,
    );
    expect(second.template.panels).toBe(initial.template.panels);
  });

  it('提交后修改调用者对象无法破坏当前或历史，历史对象递归冻结', () => {
    const original = editor();
    const history = createEditorHistory(original);
    original.template.metadata.name = 'mutated';
    original.workspace.tables[0]!.rows[0]![0] = 'mutated';
    expect(history.current.template.metadata.name).not.toBe('mutated');
    expect(history.current.workspace.tables[0]!.rows[0]![0]).not.toBe(
      'mutated',
    );
    const next = structuredClone(history.current);
    next.template.metadata.name = 'accepted';
    history.commit(next);
    next.template.metadata.name = 'later';
    next.workspace.tables[0]!.rows[0]![0] = 'later';
    expect(history.current.template.metadata.name).toBe('accepted');
    expect(Object.isFrozen(history.current)).toBe(true);
    expect(Object.isFrozen(history.current.workspace.tables[0]!.rows[0])).toBe(
      true,
    );
    expect(() => {
      history.current.workspace.tables[0]!.rows[0]![0] = 'illegal';
    }).toThrow();
    history.undo();
    expect(history.current.workspace.tables[0]!.rows[0]![0]).not.toBe('later');
  });

  it('大表只计入一次，样式历史开销不随原始行数增长', () => {
    const initial = editor();
    initial.workspace.tables[0]!.rows = Array.from(
      { length: 10000 },
      (_, n) => [String(n), String(n * 2)],
    );
    const history = createEditorHistory(initial);
    const bytes = history.estimatedBytes;
    for (let n = 1; n <= 10; n++) history.commit(change(history.current, n));
    expect(history.estimatedBytes - bytes).toBeLessThan(30000);
    const peak = history.estimatedBytes;
    history.undo();
    expect(history.estimatedBytes).toBe(peak);
    history.redo();
    expect(history.estimatedBytes).toBe(peak);
  });

  it('reset 清除两个方向的历史、合并上下文与旧数据估算', () => {
    const history = createEditorHistory(editor());
    history.commit(change(history.current, 1), { group: 'wheel', time: 0 });
    history.commit(change(history.current, 2));
    history.undo();
    const replacement = editor();
    replacement.workspace.tables = [];
    history.reset(replacement);
    expect(history.current).toEqual(replacement);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.estimatedBytes).toBe(
      createEditorHistory(replacement).estimatedBytes,
    );
    history.commit(change(history.current, 3), { group: 'wheel', time: 1 });
    expect(history.undo()).toEqual(replacement);
  });

  it('移除重做分支后释放不再使用的节点估算', () => {
    const history = createEditorHistory(editor());
    history.commit(change(history.current, 1));
    history.commit({
      ...history.current,
      template: {
        ...history.current.template,
        metadata: {
          ...history.current.template.metadata,
          name: 'large'.repeat(10000),
        },
      },
    });
    const peak = history.estimatedBytes;
    history.undo();
    history.commit(change(history.current, 3));
    const expected = createEditorHistory(editor());
    expected.commit(change(expected.current, 1));
    expected.commit(change(expected.current, 3));
    expect(history.estimatedBytes).toBeLessThan(peak);
    expect(history.estimatedBytes).toBe(expected.estimatedBytes);
  });
});

it('React hook 在提交、撤销、重做及重置后刷新状态并保持方法引用', () => {
  const { result, rerender } = renderHook(() => useEditorHistory(editor()));
  const commit = result.current.commit;
  act(() => {
    result.current.commit(change(result.current.current, 1));
    expect(result.current.undoCount).toBe(1);
    expect(result.current.current.template.metadata.name).toBe('change-1');
  });
  expect(result.current.canUndo).toBe(true);
  expect(result.current.undoCount).toBe(1);
  act(() => {
    result.current.undo();
  });
  expect(result.current.canRedo).toBe(true);
  act(() => {
    result.current.redo();
  });
  expect(result.current.current.template.metadata.name).toBe('change-1');
  rerender();
  expect(result.current.commit).toBe(commit);
  expect(result.current.undoCount).toBe(1);
  act(() => {
    result.current.reset(editor());
  });
  expect(result.current.canUndo).toBe(false);
});
