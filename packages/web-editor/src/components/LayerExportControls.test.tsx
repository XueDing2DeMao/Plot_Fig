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
import { createLayerBatch } from '../state/layer-batch.js';
import { LayerExportControls } from './LayerExportControls.js';
import { downloadBlob } from '../browser/figure-export.js';
import { unzipSync } from 'fflate';
import { rasterizePng } from '../browser/figure-export.js';
import { appendPanelFrom } from '../state/panel-operations.js';

vi.mock('../browser/figure-export.js', async (original) => ({
  ...(await original<object>()),
  downloadBlob: vi.fn(),
  rasterizePng: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function fixture() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { name: 'a.csv', kind: 'csv' },
        rows: [
          ['X', 'Y'],
          ['0', '1'],
          ['1', '2'],
        ],
      }),
    ],
  );
  return createLayerBatch(model, model, {
    mode: 'count',
    count: 1,
    keepExisting: true,
  });
}
it('downloads a real ZIP in one action while reporting an unconfigured layer separately', async () => {
  render(<LayerExportControls model={fixture()} />);
  fireEvent.click(screen.getByRole('button', { name: '批量导出…' }));
  fireEvent.change(screen.getByLabelText('图像类型'), {
    target: { value: 'svg' },
  });
  fireEvent.change(screen.getByLabelText('文件名'), {
    target: { value: 'Graph1' },
  });
  fireEvent.click(screen.getByRole('button', { name: '导出并下载 ZIP' }));
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
  const blob = vi.mocked(downloadBlob).mock.calls[0]![0];
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
  const files = unzipSync(new Uint8Array(bytes));
  expect(Object.keys(files).filter((f) => f.endsWith('.svg'))).toEqual([
    'Graph1-01.svg',
  ]);
  expect(vi.mocked(downloadBlob).mock.calls[0]!.slice(1)).toEqual([
    'Graph1.zip',
    'zip',
  ]);
  expect(
    JSON.parse(new TextDecoder().decode(files['manifest.json']!)).records.map(
      (r: { status: string }) => r.status,
    ),
  ).toEqual(['success', 'failed']);
});
it('does not trigger a download when every selected layer is unconfigured', async () => {
  const model = fixture();
  render(<LayerExportControls model={model} />);
  fireEvent.click(screen.getByRole('button', { name: '批量导出…' }));
  fireEvent.click(screen.getByLabelText('图层 1'));
  fireEvent.click(screen.getByRole('button', { name: '导出并下载 ZIP' }));
  await screen.findByText(/没有可导出的文件/);
  expect(downloadBlob).not.toHaveBeenCalled();
});

it('does not download late results after the user stops an export', async () => {
  let release!: (blob: Blob) => void;
  vi.mocked(rasterizePng).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  render(<LayerExportControls model={fixture()} />);
  fireEvent.click(screen.getByRole('button', { name: '批量导出…' }));
  fireEvent.click(screen.getByRole('button', { name: '导出并下载 ZIP' }));
  await waitFor(() => expect(rasterizePng).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole('button', { name: '停止导出' }));
  await act(async () =>
    release({ arrayBuffer: async () => new ArrayBuffer(0) } as Blob),
  );
  await screen.findByText(/导出已取消/);
  expect(downloadBlob).not.toHaveBeenCalled();
});
it('exports the selected layers in document order with matching planned filenames', async () => {
  const initial = fixture();
  const model = appendPanelFrom(
    initial,
    initial,
    initial.template.panels[0]!.panelId,
  );
  model.template.panels[2]!.name = '副本层';
  render(<LayerExportControls model={model} />);
  fireEvent.click(screen.getByRole('button', { name: '批量导出…' }));
  fireEvent.change(screen.getByLabelText('图像类型'), {
    target: { value: 'svg' },
  });
  fireEvent.change(screen.getByLabelText('文件名'), {
    target: { value: 'Graph.v1.png' },
  });
  fireEvent.click(screen.getByRole('button', { name: '清空选择' }));
  expect(screen.getByRole('button', { name: '导出并下载 ZIP' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('副本层', { exact: true }));
  fireEvent.click(screen.getByLabelText('图层 1', { exact: true }));
  expect(
    screen.getByText('Graph.v1-02.svg', { exact: true }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '导出并下载 ZIP' }));
  await waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
  const blob = vi.mocked(downloadBlob).mock.calls[0]![0];
  const buffer = await new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
  const files = unzipSync(new Uint8Array(buffer));
  expect(Object.keys(files).filter((f) => f.endsWith('.svg'))).toEqual([
    'Graph.v1-01.svg',
    'Graph.v1-02.svg',
  ]);
  const manifest = JSON.parse(
    new TextDecoder().decode(files['manifest.json']!),
  );
  expect(manifest.records.map((r: { id: string }) => r.id)).toEqual([
    model.template.panels[0]!.panelId,
    model.template.panels[2]!.panelId,
  ]);
});
