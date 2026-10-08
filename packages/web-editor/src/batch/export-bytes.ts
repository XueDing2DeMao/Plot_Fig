import type { ExportFormat } from '../browser/figure-export.js';
import { createSvgBlob } from '../browser/figure-export.js';
import { createPublicationPng } from '../browser/publication-export.js';
export async function exportBatchBytes(
  svg: string,
  format: ExportFormat,
  options: { dpi: number; signal: AbortSignal },
) {
  options.signal.throwIfAborted();
  if (format !== 'svg' && format !== 'png')
    throw new Error('仅支持 SVG 和 PNG 导出');
  const blob =
    format === 'svg'
      ? createSvgBlob(svg)
      : await createPublicationPng(svg, options.dpi);
  options.signal.throwIfAborted();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  options.signal.throwIfAborted();
  return bytes;
}
