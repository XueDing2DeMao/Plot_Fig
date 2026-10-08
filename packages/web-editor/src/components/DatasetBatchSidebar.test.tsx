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
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { DatasetBatchDialog } from './DatasetBatchDialog.js';

vi.mock('../templates/library-storage.js', () => ({
  listTemplates: async () => [],
}));
afterEach(cleanup);

function showDialog() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { kind: 'csv', name: 'a.csv' },
        rows: [
          ['x', 'y'],
          [1, 2],
          [2, 3],
        ],
      }),
      createDataTable({
        tableId: 'b',
        source: { kind: 'csv', name: 'b.csv' },
        rows: [
          ['position', 'signal'],
          [10, 20],
          [20, 40],
        ],
      }),
    ],
  );
  render(<DatasetBatchDialog model={model} onDismiss={() => {}} />);
}

async function toggleDetails(details: HTMLElement) {
  await act(async () => {
    fireEvent.click(details.querySelector('summary')!);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

it('keeps tables and essential switches visible while optional mapping and output controls start collapsed', () => {
  showDialog();
  expect(screen.queryByLabelText('批处理来源')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'a.csv' })).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'b.csv' })).toBeVisible();
  expect(screen.getByLabelText('绘图依据')).toBeVisible();
  expect(screen.getByLabelText('复用格式')).toBeVisible();
  expect(
    screen.getByRole('checkbox', { name: '自动识别两列 XY' }),
  ).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'SVG' })).toBeVisible();
  expect(screen.getByRole('checkbox', { name: 'PNG' })).toBeVisible();
  const mapping = screen.getByLabelText('手动列映射');
  expect(mapping.tagName).toBe('DETAILS');
  expect(mapping).not.toHaveAttribute('open');
  expect(mapping.querySelector('summary')).toHaveTextContent(
    '检查与调整列映射',
  );
  expect(within(mapping).getByLabelText('映射项目')).not.toBeVisible();
  const output = screen.getByLabelText('更多输出设置');
  expect(output.tagName).toBe('DETAILS');
  expect(output).not.toHaveAttribute('open');
  expect(output.querySelector('summary')).toBeVisible();
  expect(output.querySelector('summary')).toHaveTextContent(/含.*项目/);
  expect(output.querySelector('summary')).not.toHaveTextContent('DPI');
  expect(screen.getByLabelText('PNG 分辨率')).not.toBeVisible();
  expect(screen.getByLabelText('包含可重开的项目文件')).not.toBeVisible();
  expect(screen.getByRole('button', { name: '开始批处理' })).toBeEnabled();
});

it('opens mapping at the first invalid item and keeps a batch-wide warning after manually selecting a valid item and collapsing', async () => {
  showDialog();
  fireEvent.click(screen.getByRole('checkbox', { name: '自动识别两列 XY' }));
  const mapping = screen.getByLabelText('手动列映射');
  expect(mapping).toHaveAttribute('open');
  expect(within(mapping).getByLabelText('映射项目')).toHaveValue('b');
  const summary = mapping.querySelector('summary')!;
  expect(summary).toHaveTextContent(/1.*待配置|待配置.*1/);
  fireEvent.change(within(mapping).getByLabelText('映射项目'), {
    target: { value: 'a' },
  });
  expect(summary).toHaveTextContent(/1.*待配置|待配置.*1/);
  await toggleDetails(mapping);
  expect(mapping).not.toHaveAttribute('open');
  expect(summary).toBeVisible();
  expect(summary).toHaveTextContent(/1.*待配置|待配置.*1/);
  fireEvent.change(screen.getByLabelText('复用格式'), {
    target: { value: 'styles' },
  });
  expect(mapping).not.toHaveAttribute('open');
  expect(within(mapping).getByLabelText('映射项目')).toHaveValue('a');
  expect(summary).toHaveTextContent('待配置');
});

it('summarizes changed output options when collapsed, hides inactive DPI and explains an empty format selection', async () => {
  showDialog();
  const output = screen.getByLabelText('更多输出设置');
  const summary = output.querySelector('summary')!;
  fireEvent.click(screen.getByRole('checkbox', { name: 'PNG' }));
  expect(summary).toHaveTextContent('300 DPI');
  await toggleDetails(output);
  expect(output).toHaveAttribute('open');
  fireEvent.change(screen.getByLabelText('PNG 分辨率'), {
    target: { value: '600' },
  });
  fireEvent.click(
    screen.getByRole('checkbox', { name: '包含可重开的项目文件' }),
  );
  await toggleDetails(output);
  expect(output).not.toHaveAttribute('open');
  expect(summary).toBeVisible();
  expect(summary).toHaveTextContent('600 DPI');
  expect(summary).toHaveTextContent(/不含.*项目|仅图片/);
  fireEvent.click(screen.getByRole('checkbox', { name: 'PNG' }));
  expect(summary).not.toHaveTextContent('DPI');
  expect(summary).toHaveTextContent(/不含.*项目|仅图片/);
  fireEvent.click(screen.getByRole('checkbox', { name: 'SVG' }));
  expect(screen.getByRole('button', { name: '开始批处理' })).toBeDisabled();
  expect(
    screen.getByText(/(?:至少|请选择|选择).*(?:格式|SVG|PNG)|未选择.*格式/),
  ).toBeVisible();
});
