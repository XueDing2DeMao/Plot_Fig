// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { exportBatchBytes } from '../batch/export-bytes.js';
import { DatasetBatchDialog } from './DatasetBatchDialog.js';

vi.mock('../templates/library-storage.js', () => ({
  listTemplates: async () => [],
}));
vi.mock('../batch/export-bytes.js', () => ({
  exportBatchBytes: vi.fn(async (svg: string) => new TextEncoder().encode(svg)),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fixture() {
  return importTables(
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
}

function showDialog() {
  render(<DatasetBatchDialog model={fixture()} onDismiss={() => {}} />);
}

it('collapses a valid preflight, opens it when an item needs configuration, and keeps counts in its summary', () => {
  showDialog();
  const preflight = screen.getByLabelText('任务预检');
  expect(preflight.tagName).toBe('DETAILS');
  expect(preflight).not.toHaveAttribute('open');
  const summary = preflight.querySelector('summary')!;
  expect(summary).toBeVisible();
  expect(summary).toHaveTextContent(/2.*可运行|可运行.*2/);

  fireEvent.click(screen.getByRole('checkbox', { name: '自动识别两列 XY' }));
  const errors = screen.getByLabelText('任务预检');
  expect(errors).toHaveAttribute('open');
  const errorSummary = errors.querySelector('summary')!;
  expect(errorSummary).toHaveTextContent(/1.*可运行|可运行.*1/);
  expect(errorSummary).toHaveTextContent(/1.*待配置|待配置.*1/);
  fireEvent.click(errorSummary);
  expect(errors).not.toHaveAttribute('open');
  expect(errorSummary).toBeVisible();
  expect(errorSummary).toHaveTextContent('待配置');
});

it('navigates preview items with boundary buttons and falls back when the current table is removed', () => {
  showDialog();
  const preview = within(screen.getByRole('region', { name: '批量预览区' }));
  const previous = preview.getByRole('button', { name: '上一项' });
  const next = preview.getByRole('button', { name: '下一项' });
  expect(preview.getByLabelText('预览项目')).toHaveValue('a');
  expect(previous).toBeDisabled();
  expect(next).toBeEnabled();
  const firstSvg = preview.getByLabelText('批量模板预览').innerHTML;
  fireEvent.click(next);
  expect(preview.getByLabelText('预览项目')).toHaveValue('b');
  expect(preview.getByLabelText('批量模板预览').innerHTML).not.toBe(firstSvg);
  expect(previous).toBeEnabled();
  expect(next).toBeDisabled();

  fireEvent.click(previous);
  expect(preview.getByLabelText('预览项目')).toHaveValue('a');
  expect(preview.getByLabelText('批量模板预览').innerHTML).toBe(firstSvg);
  fireEvent.change(preview.getByLabelText('预览项目'), {
    target: { value: 'b' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'b.csv' }));
  expect(preview.getByLabelText('预览项目')).toHaveValue('a');
  expect(preview.getByLabelText('批量模板预览').innerHTML).toBe(firstSvg);
  expect(previous).toBeDisabled();
  expect(next).toBeDisabled();
});

it('opens batch details for results and preserves success and failure summaries when collapsed', async () => {
  showDialog();
  fireEvent.click(screen.getByRole('checkbox', { name: '自动识别两列 XY' }));
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
    ).toBeEnabled(),
  );
  const results = within(screen.getByRole('region', { name: '批次结果' }));
  const details = results.getByLabelText('批次明细');
  expect(details.tagName).toBe('DETAILS');
  expect(details).toHaveAttribute('open');
  expect(within(details).getByRole('table')).toBeInTheDocument();
  const summary = details.querySelector('summary')!;
  expect(summary).toHaveTextContent(/1.*成功|成功.*1/);
  expect(summary).toHaveTextContent(/1.*失败|失败.*1/);
  fireEvent.click(summary);
  expect(details).not.toHaveAttribute('open');
  expect(summary).toBeVisible();
  expect(summary).toHaveTextContent('成功');
  expect(summary).toHaveTextContent('失败');
});

it('reopens collapsed results for a new run and respects a manual collapse through later progress', async () => {
  showDialog();
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
    ).toBeEnabled(),
  );
  expect(exportBatchBytes).toHaveBeenCalledTimes(2);
  const details = screen.getByLabelText('批次明细');
  const summary = details.querySelector('summary')!;
  const collapse = async () => {
    await act(async () => {
      fireEvent.click(summary);
      // 等待 details 的原生 toggle 事件同步受控展开状态。
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(details).not.toHaveAttribute('open');
  };
  await collapse();

  let releaseFirst = () => {};
  let releaseSecond = () => {};
  vi.mocked(exportBatchBytes)
    .mockImplementationOnce(
      (svg) =>
        new Promise((resolve) => {
          releaseFirst = () => resolve(new TextEncoder().encode(svg));
        }),
    )
    .mockImplementationOnce(
      (svg) =>
        new Promise((resolve) => {
          releaseSecond = () => resolve(new TextEncoder().encode(svg));
        }),
    );
  try {
    fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
    await waitFor(() => expect(exportBatchBytes).toHaveBeenCalledTimes(3));
    expect(details).toHaveAttribute('open');
    await collapse();

    await act(async () => releaseFirst());
    await waitFor(() => expect(exportBatchBytes).toHaveBeenCalledTimes(4));
    expect(details).not.toHaveAttribute('open');
    await act(async () => releaseSecond());
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
      ).toBeEnabled(),
    );
    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveTextContent('成功 2');
  } finally {
    const cancel = screen.queryByRole('button', { name: '取消批次' });
    if (cancel) fireEvent.click(cancel);
    await act(async () => {
      releaseFirst();
      releaseSecond();
    });
  }
});
