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
import {
  confirmDataImport,
  openCurveBinding,
} from './test-utils/import-data.js';

afterEach(cleanup);
async function importData(
  name = 'setup.csv',
  text = 'X,Y,Time,Signal\n0,1,10,7\n1,2,20,5',
) {
  const file = new File([text], name, { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => text });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
}
function confirmPlot() {
  fireEvent.click(
    within(screen.getByRole('region', { name: '图形设置' })).getByRole(
      'button',
      { name: /生成图形|应用修改/ },
    ),
  );
}

it('opens the data table from the workspace and restores focus when closed', async () => {
  render(<App />);
  expect(
    screen.queryByRole('region', { name: '数据表预览' }),
  ).not.toBeInTheDocument();
  const preview = screen.getByRole('button', { name: '数据表预览' });
  expect(preview.closest('.app-sidebar')).not.toBeNull();
  expect(screen.getByRole('region', { name: '导入数据' })).not.toContainElement(
    preview,
  );
  await importData();
  preview.focus();
  fireEvent.click(preview);
  expect(
    screen.getByRole('dialog', { name: '数据表预览' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'X' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭数据表预览' }));
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(preview).toHaveFocus();
});

it('previews each imported filename directly without changing bindings or pending drawing settings', async () => {
  render(<App />);
  await importData('first.csv', 'X,Y\n0,1\n1,2');
  await importData('second.csv', 'X,Y\n10,20\n20,30');
  const files = screen.getByRole('region', { name: '已导入文件' });
  expect(
    within(files).getByRole('button', { name: '预览文件 first.csv' }),
  ).toBeInTheDocument();
  const second = within(files).getByRole('button', {
    name: '预览文件 second.csv',
  });
  confirmPlot();
  const svg = screen.getByTestId('svg-preview').innerHTML;
  const boundTable = (
    screen.getByLabelText('曲线 1 数据表') as HTMLSelectElement
  ).value;
  second.focus();
  fireEvent.click(second);
  expect(screen.getByLabelText('当前数据表')).toHaveValue('table-1-1');
  expect(
    within(screen.getByRole('table')).getByRole('cell', { name: '30' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭数据表预览' }));
  expect(second).toHaveFocus();
  fireEvent.click(
    within(files).getByRole('button', { name: '预览文件 first.csv' }),
  );
  expect(screen.getByLabelText('当前数据表')).toHaveValue('table-1');
  fireEvent.click(screen.getByRole('button', { name: '关闭数据表预览' }));
  expect(screen.getByTestId('svg-preview').innerHTML).toBe(svg);
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue(boundTable);
  expect(screen.getByRole('button', { name: '重置待绘图设置' })).toBeDisabled();
});

it('binds independent XY groups and waits for confirmation before drawing or exporting', async () => {
  render(<App />);
  await importData();
  const preview = screen.getByTestId('svg-preview');
  expect(preview.querySelector('svg')).toBeNull();
  expect(screen.getByRole('button', { name: '导出图形' })).toBeDisabled();
  expect(
    screen.queryByRole('dialog', { name: '导出图形' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('曲线 2 X 数据列'), {
    target: { value: 'time' },
  });
  fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
    target: { value: 'signal' },
  });
  expect(
    within(screen.getByRole('region', { name: '数据绑定' })).queryByLabelText(
      /图表类型/,
    ),
  ).not.toBeInTheDocument();
  confirmPlot();
  expect(preview.querySelectorAll('[data-role="plot-slot"]')).toHaveLength(2);
  openCurveBinding(1);
  expect(screen.getByLabelText('曲线 1 X 数据列')).toHaveValue('x');
  openCurveBinding(2);
  expect(screen.getByLabelText('曲线 2 X 数据列')).toHaveValue('time');
  expect(screen.getByLabelText('曲线 2 Y 数据列')).toHaveValue('signal');
  expect(screen.getByRole('button', { name: '导出图形' })).toBeEnabled();
  const previous = preview.innerHTML;
  fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
    target: { value: 'y' },
  });
  expect(preview.innerHTML).toBe(previous);
  confirmPlot();
  expect(preview.innerHTML).not.toBe(previous);
});

it('changes all groups to one chart type and commits them together', async () => {
  render(<App />);
  await importData();
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
    target: { value: 'signal' },
  });
  confirmPlot();
  const preview = screen.getByTestId('svg-preview');
  const previous = preview.innerHTML;
  fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
    target: { value: 'bar' },
  });
  expect(preview.innerHTML).toBe(previous);
  confirmPlot();
  expect(preview.querySelectorAll('[data-kind="bar"]')).toHaveLength(2);
  expect(preview.querySelectorAll('[data-kind="xy"]')).toHaveLength(0);
});

it('keeps the last confirmed graph when a pending group has no data table', async () => {
  render(<App />);
  await importData();
  confirmPlot();
  const preview = screen.getByTestId('svg-preview');
  const previous = preview.innerHTML;
  fireEvent.change(screen.getByLabelText('曲线 1 数据表'), {
    target: { value: '' },
  });
  confirmPlot();
  expect(preview.innerHTML).toBe(previous);
  expect(
    within(screen.getByRole('region', { name: '图形设置' })).getByRole('alert'),
  ).toBeInTheDocument();
});
