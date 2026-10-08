// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { DatasetBatchDialog } from './DatasetBatchDialog.js';
import { exportBatchBytes } from '../batch/export-bytes.js';
import { downloadBlob } from '../browser/figure-export.js';
import { listTemplates } from '../templates/library-storage.js';
import { DatasetBatchControls } from './DatasetBatchControls.js';
vi.mock('../templates/library-storage.js', () => ({
  listTemplates: vi.fn(async () => []),
}));
vi.mock('../browser/figure-export.js', async (original) => ({
  ...(await original<object>()),
  downloadBlob: vi.fn(),
}));
vi.mock('../batch/export-bytes.js', () => ({
  exportBatchBytes: vi.fn(async (svg: string) => new TextEncoder().encode(svg)),
}));
vi.mock('../batch/archive.js', () => ({
  batchArchive: async () => new Blob(['zip']),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function model() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    ['a', 'b'].map((id) =>
      createDataTable({
        tableId: id,
        source: { name: id + '.csv', kind: 'csv' },
        rows: [
          ['x', 'y'],
          ['1', '2'],
          ['2', '3'],
        ],
      }),
    ),
  );
}

it('requires required slots for a saved full template while allowing valid items to proceed', async () => {
  const m = model(),
    template = defaultTemplate();
  template.metadata.name = 'Saved';
  vi.mocked(listTemplates).mockResolvedValueOnce([
    { id: 'saved', name: 'Saved', tags: [], template, builtIn: false },
  ]);
  render(<DatasetBatchDialog model={m} onDismiss={() => {}} />);
  await screen.findByRole('option', { name: 'Saved' });
  fireEvent.click(screen.getByRole('checkbox', { name: '自动识别两列 XY' }));
  fireEvent.change(screen.getByLabelText('绘图依据'), {
    target: { value: 'saved' },
  });
  fireEvent.change(screen.getByLabelText('套用范围'), {
    target: { value: 'full' },
  });
  expect(screen.getByRole('button', { name: '开始批处理' })).toBeDisabled();
  for (const slot of template.dataSlots.filter((s) => s.required)) {
    const column = m.workspace.tables[0]!.columns.find(
      (c) => c.name === slot.role,
    )!;
    fireEvent.change(
      screen.getByLabelText(`映射 ${slot.name} (${slot.role})`),
      {
        target: {
          value: JSON.stringify({ tableId: 'a', columnId: column.columnId }),
        },
      },
    );
  }
  expect(screen.getByRole('button', { name: '开始批处理' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() => expect(screen.getByText('成功')).toBeInTheDocument());
  expect(screen.getByText('失败')).toBeInTheDocument();
});

it('blocks data table batching while there are unapplied plotting settings', () => {
  const m = model();
  const view = render(<DatasetBatchControls model={m} pending />);
  expect(screen.getByRole('button', { name: '数据表批绘' })).toBeDisabled();
  expect(screen.getByText(/请先生成图形或重置/)).toBeInTheDocument();
  view.rerender(<DatasetBatchControls model={m} pending={false} />);
  fireEvent.click(screen.getByRole('button', { name: '数据表批绘' }));
  expect(screen.getByRole('dialog', { name: '批量绘图' })).toBeInTheDocument();
});

it('exports independent table copies and clears stale results after settings change', async () => {
  const source = model(),
    before = structuredClone(source);
  render(<DatasetBatchDialog model={source} onDismiss={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
    ).toBeEnabled(),
  );
  expect(screen.getAllByText('成功')).toHaveLength(2);
  expect(source).toEqual(before);
  fireEvent.click(screen.getByRole('button', { name: '下载已完成文件 ZIP' }));
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole('checkbox', { name: 'PNG' }));
  expect(
    screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
  ).toBeDisabled();
  expect(screen.queryByText('成功')).not.toBeInTheDocument();
});

it('locks configuration, allows cancellation and retries without repeating successful items', async () => {
  let release!: (bytes: Uint8Array<ArrayBuffer>) => void;
  vi.mocked(exportBatchBytes)
    .mockImplementationOnce(async (svg) => new TextEncoder().encode(svg))
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
  render(<DatasetBatchDialog model={model()} onDismiss={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '开始批处理' }));
  await waitFor(() => expect(release).toBeTypeOf('function'));
  expect(screen.getByRole('checkbox', { name: 'PNG' })).toBeDisabled();
  expect(screen.getByLabelText('绘图依据')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消批次' }));
  await act(async () => release(new Uint8Array([1])));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: '重试失败或取消项' }),
    ).toBeEnabled(),
  );
  expect(
    screen.getByRole('button', { name: '下载已完成文件 ZIP' }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '重试失败或取消项' }));
  await waitFor(() => expect(screen.getAllByText('成功')).toHaveLength(2));
  expect(exportBatchBytes).toHaveBeenCalledTimes(3);
});

it('only exposes table batching and omits project batch inputs', () => {
  const m = model();
  render(<DatasetBatchControls model={m} pending={false} />);
  expect(
    screen.queryByRole('button', { name: '项目批处理' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '数据表批绘' }));
  expect(screen.getByRole('dialog', { name: '批量绘图' })).toBeInTheDocument();
  expect(screen.queryByLabelText('批处理来源')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('选择项目文件')).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'a.csv' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'b.csv' })).toBeChecked();
  expect(screen.getByRole('button', { name: '开始批处理' })).toBeEnabled();
});
