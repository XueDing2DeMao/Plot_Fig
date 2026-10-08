// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { layerBatchItems } from '../batch/layer-items.js';
import { batchArchive } from '../batch/archive.js';
import { downloadBlob } from '../browser/figure-export.js';
import { useBatchRunner } from './useBatchRunner.js';
import { exportBatchBytes } from '../batch/export-bytes.js';

vi.mock('../browser/figure-export.js', async (original) => ({
  ...(await original<object>()),
  downloadBlob: vi.fn(),
}));
vi.mock('../batch/archive.js', () => ({ batchArchive: vi.fn() }));
vi.mock('../batch/export-bytes.js', () => ({
  exportBatchBytes: vi.fn(async (svg: string) => new TextEncoder().encode(svg)),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each(['automatic', 'repeat'] as const)(
  'cancels %s download during ZIP compression',
  async (mode) => {
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
    const items = layerBatchItems(
      model,
      model.template.panels.map((p) => p.panelId),
    );
    const options = {
      formats: ['svg'] as 'svg'[],
      dpi: 300,
      includeProject: false,
    };
    const hook = renderHook(() => useBatchRunner(items, options));
    if (mode === 'repeat')
      await act(async () => {
        await hook.result.current.start();
      });
    let release!: (blob: Blob) => void;
    vi.mocked(batchArchive).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    let run!: Promise<void>;
    act(() => {
      run =
        mode === 'automatic'
          ? hook.result.current.startAndDownload()
          : hook.result.current.download();
    });
    await waitFor(() => expect(batchArchive).toHaveBeenCalledOnce());
    act(() => hook.result.current.controller.current?.abort());
    await act(async () => {
      release(new Blob());
      await run;
    });
    expect(downloadBlob).not.toHaveBeenCalled();
    expect(hook.result.current.message).toContain('取消');
    expect(hook.result.current.busy).toBe(false);
  },
);

it('discards completion from an obsolete configuration while an export is pending', async () => {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { name: 'a', kind: 'csv' },
        rows: [
          ['x', 'y'],
          ['0', '1'],
          ['1', '2'],
        ],
      }),
    ],
  );
  const items = layerBatchItems(
    model,
    model.template.panels.map((p) => p.panelId),
  );
  const options = {
    formats: ['svg' as const],
    dpi: 300,
    includeProject: false,
  };
  let release!: (bytes: Uint8Array<ArrayBuffer>) => void;
  vi.mocked(exportBatchBytes).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const hook = renderHook(({ settings }) => useBatchRunner(items, settings), {
    initialProps: { settings: options },
  });
  let run!: Promise<void>;
  act(() => {
    run = hook.result.current.start();
  });
  await waitFor(() => expect(release).toBeTypeOf('function'));
  hook.rerender({ settings: { ...options, dpi: 600 } });
  await act(async () => {
    release(new Uint8Array([1]));
    await run;
  });
  expect(hook.result.current.result).toBeUndefined();
  expect(hook.result.current.records).toEqual([]);
  await act(() => hook.result.current.download());
  expect(downloadBlob).not.toHaveBeenCalled();
});
