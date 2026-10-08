// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditorHistoryControls } from './EditorHistoryControls.js';

afterEach(cleanup);

function setup(
  options: {
    canUndo?: boolean;
    canRedo?: boolean;
    blocked?: () => string | undefined;
    message?: string;
  } = {},
) {
  const props = {
    canUndo: true,
    canRedo: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    ...options,
  };
  return { ...render(<EditorHistoryControls {...props} />), props };
}

function shortcut(init: KeyboardEventInit, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => target.dispatchEvent(event));
  return event;
}

it('显示撤销和重做按钮，并暴露可访问历史状态', () => {
  setup({ message: '已撤销坐标轴修改' });
  expect(screen.queryAllByRole('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: '撤销' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '重做' })).toBeEnabled();
  expect(screen.getByRole('status')).toHaveTextContent('已撤销坐标轴修改');
});

it.each([
  [{ key: 'z', ctrlKey: true }, 'onUndo'],
  [{ key: 'z', metaKey: true }, 'onUndo'],
  [{ key: 'y', ctrlKey: true }, 'onRedo'],
  [{ key: 'y', metaKey: true }, 'onRedo'],
  [{ key: 'Z', ctrlKey: true, shiftKey: true }, 'onRedo'],
  [{ key: 'Z', metaKey: true, shiftKey: true }, 'onRedo'],
] as const)('快捷键 %j 触发 %s', (keys, action) => {
  const { props } = setup();
  const event = shortcut(keys);
  expect(props[action]).toHaveBeenCalledTimes(1);
  expect(
    props[action === 'onUndo' ? 'onRedo' : 'onUndo'],
  ).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(true);
});

it('按钮调用对应历史操作', () => {
  const { props } = setup();
  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  fireEvent.click(screen.getByRole('button', { name: '重做' }));
  expect(props.onUndo).toHaveBeenCalledTimes(1);
  expect(props.onRedo).toHaveBeenCalledTimes(1);
});

it('没有历史时禁用按钮和快捷键', () => {
  const { props } = setup({ canUndo: false, canRedo: false });
  const undo = screen.getByRole('button', { name: '撤销' });
  const redo = screen.getByRole('button', { name: '重做' });
  expect(undo).toBeDisabled();
  expect(redo).toBeDisabled();
  fireEvent.click(undo);
  fireEvent.click(redo);
  shortcut({ key: 'z', ctrlKey: true });
  shortcut({ key: 'y', ctrlKey: true });
  expect(props.onUndo).not.toHaveBeenCalled();
  expect(props.onRedo).not.toHaveBeenCalled();
});

it.each([
  { key: 'z' },
  { key: 'z', ctrlKey: true, altKey: true },
  { key: 'z', ctrlKey: true, isComposing: true },
  { key: 'y', ctrlKey: true, shiftKey: true },
  { key: 'x', ctrlKey: true },
])('忽略组合键或输入法事件 %j', (keys) => {
  const { props } = setup();
  expect(shortcut(keys).defaultPrevented).toBe(false);
  expect(props.onUndo).not.toHaveBeenCalled();
  expect(props.onRedo).not.toHaveBeenCalled();
});

it('忽略已经被其他控件处理的事件', () => {
  const { props } = setup();
  const event = new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    cancelable: true,
  });
  event.preventDefault();
  act(() => window.dispatchEvent(event));
  expect(props.onUndo).not.toHaveBeenCalled();
});

it.each(['input', 'textarea', 'select', 'contenteditable', 'textbox'])(
  '%s 保留原生撤销，不触发全局历史或草稿提示',
  (kind) => {
    const blocked = vi.fn(() => '请先应用草稿');
    const { props } = setup({ blocked });
    const target = document.createElement(
      ['contenteditable', 'textbox'].includes(kind) ? 'div' : kind,
    );
    if (kind === 'contenteditable')
      target.setAttribute('contenteditable', 'true');
    if (kind === 'textbox') target.setAttribute('role', 'textbox');
    document.body.append(target);
    const nested = ['contenteditable', 'textbox'].includes(kind)
      ? target.appendChild(document.createElement('span'))
      : target;
    expect(shortcut({ key: 'z', ctrlKey: true }, nested).defaultPrevented).toBe(
      false,
    );
    expect(
      shortcut({ key: 'Z', metaKey: true, shiftKey: true }, nested)
        .defaultPrevented,
    ).toBe(false);
    expect(props.onUndo).not.toHaveBeenCalled();
    expect(props.onRedo).not.toHaveBeenCalled();
    expect(blocked).not.toHaveBeenCalled();
    target.remove();
  },
);

it('未应用草稿阻止按钮和快捷键，并在解除后恢复历史操作', () => {
  const { props, rerender } = setup({ blocked: () => '请先应用或取消草稿' });
  fireEvent.click(screen.getByRole('button', { name: '撤销' }));
  expect(screen.getByRole('status')).toHaveTextContent('请先应用或取消草稿');
  expect(shortcut({ key: 'y', ctrlKey: true }).defaultPrevented).toBe(true);
  expect(props.onUndo).not.toHaveBeenCalled();
  expect(props.onRedo).not.toHaveBeenCalled();
  rerender(
    <EditorHistoryControls
      {...props}
      blocked={() => undefined}
      message="草稿已应用"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '重做' }));
  expect(props.onRedo).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('status')).toHaveTextContent('草稿已应用');
});

it('打开的模态框内也显示被阻止的历史操作提示', () => {
  const { props } = setup({ blocked: () => '请先关闭属性对话框' });
  render(
    <dialog open aria-label="属性">
      <button>确定</button>
    </dialog>,
  );
  const dialog = screen.getByRole('dialog', { name: '属性' });
  const button = within(dialog).getByRole('button', { name: '确定' });
  shortcut({ key: 'z', ctrlKey: true }, button);
  expect(within(dialog).getByRole('status')).toHaveTextContent(
    '请先关闭属性对话框',
  );
  expect(props.onUndo).not.toHaveBeenCalled();
});

it('快捷键遵守更新后的状态，并在组件卸载后移除监听', () => {
  const { props, rerender, unmount } = setup();
  rerender(<EditorHistoryControls {...props} canUndo={false} />);
  shortcut({ key: 'z', ctrlKey: true });
  expect(props.onUndo).not.toHaveBeenCalled();
  unmount();
  shortcut({ key: 'y', ctrlKey: true });
  expect(props.onRedo).not.toHaveBeenCalled();
});
