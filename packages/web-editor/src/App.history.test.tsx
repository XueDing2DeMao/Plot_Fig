// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import App from './App.js';
import { confirmDataImport, confirmPlot } from './test-utils/import-data.js';

afterEach(cleanup);

async function importDraft() {
  const csv = 'X,Y\n0,1\n1,3\n2,2';
  const file = new File([csv], 'history.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
}

function controls() {
  const history = within(screen.getByRole('group', { name: '编辑历史' }));
  return {
    undo: history.getByRole('button', { name: '撤销' }),
    redo: history.getByRole('button', { name: '重做' }),
    status: history.getByRole('status'),
  };
}

function preview() {
  return screen.getByTestId('svg-preview');
}

function renderedSvg() {
  // 空预览重新生成时会挂载新的 SVG；只统一 useId 前缀，完整比较其余内容。
  return preview().innerHTML.replace(/preview-\w+-/g, 'preview-instance-');
}

it('导入草稿不入历史，生成和确认样式各为一步，撤销重做精确恢复 SVG', async () => {
  render(<App />);
  expect(controls().undo).toBeDisabled();
  expect(controls().redo).toBeDisabled();

  await importDraft();
  expect(preview().querySelector('svg')).toBeNull();
  expect(controls().undo).toBeDisabled();
  expect(controls().redo).toBeDisabled();
  confirmPlot();
  const generated = renderedSvg();
  const generatedDom = preview().innerHTML;
  expect(preview().querySelector('svg')).not.toBeNull();
  expect(controls().undo).toBeEnabled();

  fireEvent.click(screen.getByRole('radio', { name: '线型：虚线' }));
  expect(renderedSvg()).toBe(generated);
  confirmPlot();
  const styled = renderedSvg();
  expect(styled).not.toBe(generated);

  fireEvent.click(controls().undo);
  expect(renderedSvg()).toBe(generated);
  expect(preview().innerHTML).toBe(generatedDom);
  expect(controls().undo).toBeEnabled();
  expect(screen.getByRole('button', { name: '重置待绘图设置' })).toBeDisabled();
  fireEvent.click(controls().undo);
  expect(preview().querySelector('svg')).toBeNull();
  expect(controls().undo).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: '预览文件 history.csv' }),
  ).not.toBeInTheDocument();

  fireEvent.click(controls().redo);
  expect(renderedSvg()).toBe(generated);
  fireEvent.click(controls().redo);
  expect(renderedSvg()).toBe(styled);
  expect(controls().redo).toBeDisabled();
});

it('撤销保留复制的图层格式，同时清除旧图形对象菜单', async () => {
  render(<App />);
  await importDraft();
  confirmPlot();
  fireEvent.click(screen.getByRole('button', { name: '复制格式' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '所有样式格式' }));
  expect(screen.getByRole('button', { name: '粘贴格式' })).toBeEnabled();
  fireEvent.click(screen.getByRole('radio', { name: '线型：虚线' }));
  confirmPlot();
  const curve = preview().querySelector('[data-role="plot-slot"] path')!;
  fireEvent.contextMenu(curve);
  expect(
    screen.getByRole('menu', { name: '图形对象菜单' }),
  ).toBeInTheDocument();

  fireEvent.click(controls().undo);
  expect(screen.getByRole('button', { name: '粘贴格式' })).toBeEnabled();
  expect(
    screen.queryByRole('menu', { name: '图形对象菜单' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '粘贴格式' }));
  expect(screen.getByRole('menuitem', { name: '所有样式格式' })).toBeEnabled();
});

it('待绘图草稿阻止按钮和快捷键撤销，重置草稿后保留原历史', async () => {
  render(<App />);
  await importDraft();
  confirmPlot();
  const generated = renderedSvg();
  const { undo, status } = controls();
  const dashed = screen.getByRole('radio', { name: '线型：虚线' });
  fireEvent.click(dashed);

  fireEvent.click(undo);
  expect(status).toHaveTextContent('请先生成图形或重置待绘图设置');
  expect(renderedSvg()).toBe(generated);
  fireEvent.keyDown(preview(), { key: 'z', ctrlKey: true });
  expect(renderedSvg()).toBe(generated);
  expect(dashed).toBeChecked();
  expect(undo).toBeEnabled();

  fireEvent.click(screen.getByRole('button', { name: '重置待绘图设置' }));
  fireEvent.click(undo);
  expect(preview().querySelector('svg')).toBeNull();
  expect(controls().undo).toBeDisabled();
});

it('属性窗口的未应用草稿阻止全局历史，提示出现在窗口内且取消后可撤销', async () => {
  render(<App />);
  await importDraft();
  confirmPlot();
  const generated = renderedSvg();
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Y 轴…' }));
  const dialog = screen.getByRole('dialog', { name: '坐标轴属性' });
  const fields = within(dialog);
  fireEvent.click(fields.getByRole('tab', { name: '标题' }));
  fireEvent.change(fields.getByLabelText('Y 轴标题'), {
    target: { value: '未应用标题' },
  });
  const cancel = fields.getByRole('button', { name: '取消' });
  fireEvent.keyDown(cancel, { key: 'z', ctrlKey: true });
  expect(
    fields
      .getAllByRole('status')
      .some((status) => status.textContent?.includes('请先应用或关闭当前窗口')),
  ).toBe(true);
  expect(fields.getByLabelText('Y 轴标题')).toHaveValue('未应用标题');
  expect(renderedSvg()).toBe(generated);

  fireEvent.click(cancel);
  expect(
    screen.queryByRole('dialog', { name: '坐标轴属性' }),
  ).not.toBeInTheDocument();
  fireEvent.click(controls().undo);
  expect(preview().querySelector('svg')).toBeNull();
  expect(controls().undo).toBeDisabled();
});
