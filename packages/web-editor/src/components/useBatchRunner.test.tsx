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

vi.mock('../browser/figure-export.js', async (original) => ({
  ...(await original<object>()),
  downloadBlob: vi.fn(),
}));
vi.mock('../batch/archive.js', () => ({ batchArchive: vi.fn() }));
vi.mock('../batch/export-bytes.js', () => ({
  exportBatchBytes: async (svg: string) => new TextEncoder().encode(svg),
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
    const hook = renderHook(() =>
      useBatchRunner(items, options, {
        dpi: 300,
        token: '',
        textToPath: false,
        flattenTransparency: false,
      }),
    );
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
