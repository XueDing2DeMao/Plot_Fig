import { afterEach, expect, it, vi } from 'vitest';
import type { ExportFormat } from '../browser/figure-export.js';
import { createPublicationPng } from '../browser/publication-export.js';
import { exportBatchBytes } from './export-bytes.js';

vi.mock('../browser/publication-export.js', () => ({
  createPublicationPng: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg"><text>科学图形</text></svg>';
const options = () => ({ dpi: 600, signal: new AbortController().signal });

it('exports the original SVG bytes without rasterizing', async () => {
  expect(
    new TextDecoder().decode(await exportBatchBytes(svg, 'svg', options())),
  ).toBe(svg);
  expect(createPublicationPng).not.toHaveBeenCalled();
});

it('preserves PNG encoder output and passes the requested DPI', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  vi.mocked(createPublicationPng).mockResolvedValue(new Blob([bytes]));
  expect(await exportBatchBytes(svg, 'png', options())).toEqual(bytes);
  expect(createPublicationPng).toHaveBeenCalledWith(svg, 600);
});

it.each(['pdf', 'eps'])(
  'rejects removed %s exports at runtime',
  async (format) => {
    vi.mocked(createPublicationPng).mockResolvedValue(new Blob(['png']));
    await expect(
      exportBatchBytes(svg, format as ExportFormat, options()),
    ).rejects.toThrow('仅支持 SVG 和 PNG');
    expect(createPublicationPng).not.toHaveBeenCalled();
  },
);

it('rejects cancellation before encoding starts', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    exportBatchBytes(svg, 'png', { dpi: 300, signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(createPublicationPng).not.toHaveBeenCalled();
});

it('discards PNG output when encoding completes after cancellation', async () => {
  const controller = new AbortController();
  let finish!: (blob: Blob) => void;
  vi.mocked(createPublicationPng).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const promise = exportBatchBytes(svg, 'png', {
    dpi: 300,
    signal: controller.signal,
  });
  controller.abort();
  finish(new Blob(['png']));
  await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
});
