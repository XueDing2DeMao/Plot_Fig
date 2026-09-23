import type { ExportFormat } from '../browser/export-service-client.js';
import type { VectorOptions } from '../browser/export-service-client.js';
import { createSvgBlob } from '../browser/figure-export.js';
import { createPublicationPng } from '../browser/publication-export.js';
import { exportVector } from '../browser/export-service-client.js';
export async function exportBatchBytes(
  svg: string,
  format: ExportFormat,
  options: VectorOptions & { signal: AbortSignal },
) {
  const blob =
    format === 'svg'
      ? createSvgBlob(svg)
      : format === 'png'
        ? await createPublicationPng(svg, options.dpi)
        : await exportVector(svg, format, options);
  return new Uint8Array(await blob.arrayBuffer());
}
