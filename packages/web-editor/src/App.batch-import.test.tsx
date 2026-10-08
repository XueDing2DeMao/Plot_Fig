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
it('stages a whole batch, appends without replacing old files and undoes only the latest batch', async () => {
  render(<App />);
  const imported = () =>
    within(screen.getByRole('region', { name: '已导入文件' }));
  const history = () => within(screen.getByRole('group', { name: '编辑历史' }));
  async function upload(names: string[]) {
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: names.map((name) => new File(['X,Y\n0,1\n1,2'], name)) },
    });
    await confirmDataImport();
  }
  await upload(['existing.csv']);
  confirmPlot();
  expect(imported().getByText('1 张表')).toBeInTheDocument();
  await upload(['a.csv', 'b.csv']);
  expect(imported().getByText('3 张表')).toBeInTheDocument();
  // 草稿一次重置移除整个新批次，保留此前已生成图形的数据。
  fireEvent.click(screen.getByRole('button', { name: '重置待绘图设置' }));
  expect(imported().getByText('1 张表')).toBeInTheDocument();
  await upload(['a.csv', 'b.csv']);
  confirmPlot();
  expect(imported().getByText('3 张表')).toBeInTheDocument();
  fireEvent.click(history().getByRole('button', { name: '撤销' }));
  expect(imported().getByText('1 张表')).toBeInTheDocument();
  expect(
    imported().getByRole('button', { name: '预览文件 existing.csv' }),
  ).toBeInTheDocument();
  fireEvent.click(history().getByRole('button', { name: '重做' }));
  expect(imported().getByText('3 张表')).toBeInTheDocument();
  expect(
    imported().getByRole('button', { name: '预览文件 a.csv' }),
  ).toBeInTheDocument();
  expect(
    imported().getByRole('button', { name: '预览文件 b.csv' }),
  ).toBeInTheDocument();
});
