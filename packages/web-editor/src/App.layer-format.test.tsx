// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import App from './App.js';
import { confirmDataImport, confirmPlot } from './test-utils/import-data.js';
afterEach(cleanup);

it('immediately applies pasted formats together with pending target bindings and names', async () => {
  render(<App />);
  const text = 'X,Y,Z\n0,1,2\n1,3,4';
  const file = new File([text], 'format.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => text });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
  confirmPlot();
  fireEvent.click(screen.getByRole('radio', { name: '线型：虚线' }));
  fireEvent.click(screen.getByRole('button', { name: '复制格式' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '所有样式格式' }));
  fireEvent.click(screen.getByRole('button', { name: '新建图层' }));
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('曲线 1 数据表'), {
    target: { value: 'table-1' },
  });
  fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
    target: { value: 'z' },
  });
  fireEvent.change(screen.getByLabelText('曲线 1 名称'), {
    target: { value: '目标曲线' },
  });
  fireEvent.blur(screen.getByLabelText('曲线 1 名称'));
  const before = screen.getByTestId('svg-preview').innerHTML;
  fireEvent.click(screen.getByRole('button', { name: '粘贴格式' }));
  fireEvent.click(screen.getByRole('menuitem', { name: '所有样式格式' }));
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('z');
  expect(screen.getByLabelText('曲线 1 名称')).toHaveValue('目标曲线');
  expect(screen.getByRole('radio', { name: '线型：虚线' })).toBeChecked();
  expect(screen.getByTestId('svg-preview').innerHTML).not.toBe(before);
  expect(screen.getByText(/已粘贴并应用所有样式格式/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重置待绘图设置' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '导出图形' })).toBeEnabled();
  expect(
    screen.getByTestId('svg-preview').querySelector('[stroke-dasharray]'),
  ).not.toBeNull();
  fireEvent.click(screen.getAllByRole('tab')[0]!);
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('y');
  expect(screen.getByLabelText('曲线 1 名称')).toHaveValue('Y');
});
