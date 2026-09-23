import type { BatchResult } from './queue.js';
import type { BatchOptions } from './queue.js';
import { zip, strToU8 } from 'fflate';

export function batchArchive(
  result: BatchResult,
  options: BatchOptions,
): Promise<Blob> {
  const manifest = {
    kind: 'plot-fig-batch-manifest',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    formats: options.formats,
    dpi: options.dpi,
    textToPath: options.textToPath ?? false,
    flattenTransparency: options.flattenTransparency ?? false,
    templateId: options.template?.templateId,
    preset: options.template?.publicationPreset,
    records: result.records,
  };
  return new Promise((resolve, reject) =>
    zip(
      {
        ...result.files,
        'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
      },
      { level: 6 },
      (error, data) =>
        error
          ? reject(error)
          : resolve(
              new Blob([data as Uint8Array<ArrayBuffer>], {
                type: 'application/zip',
              }),
            ),
    ),
  );
}
