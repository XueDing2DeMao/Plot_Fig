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

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

async function openFigure() {
  render(<App />);
  const csv = 'Time,Control,Treatment\n0,1,2\n1,3,5';
  const file = new File([csv], 'studio.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => csv });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  confirmPlot();
}

it('focuses the canvas without discarding pending data bindings', async () => {
  await openFigure();
  fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
    target: { value: 'treatment' },
  });
  const before = screen.getByTestId('svg-preview').innerHTML;
  const focus = screen.getByRole('button', { name: '专注画布' });
  fireEvent.click(focus);
  expect(focus).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('region', { name: '图形预览' })).toBeVisible();
  expect(
    screen.queryByRole('region', { name: '数据绑定' }),
  ).not.toBeInTheDocument();
  fireEvent.click(focus);
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('treatment');
  expect(screen.getByTestId('svg-preview').innerHTML).toBe(before);
});

it('opens the data dock alongside the figure and retains the file preview dialog', async () => {
  await openFigure();
  const dock = screen.getByRole('button', { name: '展开数据表' });
  expect(dock).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(dock);
  const region = screen.getByRole('region', { name: '画布数据表' });
  expect(within(region).getByRole('table')).toHaveTextContent('Time');
  expect(screen.getByRole('region', { name: '图形预览' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '收起数据表' }));
  expect(
    screen.queryByRole('region', { name: '画布数据表' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '预览文件 studio.csv' }));
  expect(screen.getByRole('dialog', { name: '数据表预览' })).toBeVisible();
});

it('reveals a side panel when a deep link is opened from focus mode', () => {
  window.history.replaceState(null, '', '#preview');
  render(<App />);
  const focus = screen.getByRole('button', { name: '专注画布' });
  fireEvent.click(focus);
  expect(focus).toHaveAttribute('aria-pressed', 'true');
  window.history.replaceState(null, '', '#binding');
  fireEvent(window, new HashChangeEvent('hashchange'));
  expect(focus).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('region', { name: '数据绑定' })).toBeVisible();
});

it('keeps graph shortcuts inactive while working in the data dock', async () => {
  await openFigure();
  fireEvent.click(screen.getByRole('button', { name: '展开数据表' }));
  const dock = screen.getByRole('region', { name: '画布数据表' });
  fireEvent.mouseDown(within(dock).getByRole('button', { name: '重命名' }));
  fireEvent.focus(within(dock).getByRole('button', { name: '重命名' }));
  fireEvent.keyDown(document, { key: 'F12' });
  expect(
    screen.queryByRole('dialog', { name: '图层内容' }),
  ).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('region', { name: '图形预览' }));
  fireEvent.keyDown(document, { key: 'F12' });
  expect(screen.getByRole('dialog', { name: '图层内容' })).toBeVisible();
});
