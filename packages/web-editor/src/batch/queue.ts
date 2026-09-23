import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { BatchItem } from './items.js';
import type { ExportFormat } from '../browser/export-service-client.js';
import { bindWorkspace } from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';

import { serializeWorkspaceProject } from '../state/workspace-project.js';
import { applyTemplateStyle } from '../templates/styles.js';
import { applyFullTemplate } from '../templates/mapping.js';
import { BATCH_LIMITS } from './items.js';
export type BatchOptions = {
  textToPath?: boolean;
  flattenTransparency?: boolean;
  formats: ExportFormat[];
  dpi: number;
  includeProject: boolean;
  template?: FigureTemplate;
  mode?: 'style' | 'full';
  columnNames?: Record<string, string>;
};
export type BatchRecord = {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  files: string[];
  messages: string[];
};
export type BatchResult = {
  files: Record<string, Uint8Array<ArrayBuffer>>;
  records: BatchRecord[];
};
export type BatchRuntime = {
  signal?: AbortSignal;
  onProgress?: (records: BatchRecord[]) => void;
  previous?: BatchResult;
  exporter: (
    svg: string,
    format: ExportFormat,
  ) => Promise<Uint8Array<ArrayBuffer>>;
};
export function prepare(item: BatchItem, options: BatchOptions) {
  if (!item.model || item.error) throw new Error(item.error ?? '项目为空');
  const model = structuredClone(item.model);
  if (!options.template) return model;
  if (options.mode !== 'full')
    return {
      ...model,
      template: applyTemplateStyle(model.template, options.template),
    };
  const mapping = Object.fromEntries(
    options.template.dataSlots.flatMap((slot) => {
      const refs = model.workspace.tables.flatMap((t) =>
        t.columns
          .filter((c) => c.name === options.columnNames?.[slot.dataSlotId])
          .map((c) => ({ tableId: t.tableId, columnId: c.columnId })),
      );
      return refs.length === 1 ? [[slot.dataSlotId, refs[0]!]] : [];
    }),
  );
  return applyFullTemplate(model, options.template, mapping);
}
const filename = (name: string, index: number) =>
  String(index + 1).padStart(3, '0') +
  '-' +
  (name
    .replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .slice(0, 100) || 'Figure');
function addFile(
  result: BatchResult,
  name: string,
  bytes: Uint8Array<ArrayBuffer>,
) {
  const total = Object.entries(result.files).reduce(
    (n, [key, v]) => n + (key === name ? 0 : v.byteLength),
    bytes.byteLength,
  );
  if (total > BATCH_LIMITS.outputBytes)
    throw new Error('批次输出超过 200 MiB，请分批导出');
  result.files[name] = bytes;
}
async function exportItem(
  context: {
    item: BatchItem;
    index: number;
    result: BatchResult;
    record: BatchRecord;
  },
  options: BatchOptions,
  runtime: BatchRuntime,
) {
  const { item, index, result, record } = context,
    model = prepare(item, options),
    data = bindWorkspace(model.template, model.workspace),
    rendered = renderFigureSvg(model.template, data, { purpose: 'export' });
  const diagnostics = [...data.diagnostics, ...rendered.diagnostics];
  record.messages = diagnostics.map((d) => d.message);
  if (!rendered.ok || diagnostics.some((d) => d.severity === 'error'))
    throw new Error(record.messages.join('; ') || '无法渲染');
  const base = filename(item.name, index);
  for (const format of options.formats) {
    runtime.signal?.throwIfAborted();
    const name = base + '.' + format;
    try {
      const bytes = await runtime.exporter(rendered.svg, format);
      runtime.signal?.throwIfAborted();
      addFile(result, name, bytes);
      record.files.push(name);
    } catch (e) {
      if (runtime.signal?.aborted) throw e;
      record.status = 'failed';
      record.messages.push(
        format + ': ' + (e instanceof Error ? e.message : '导出失败'),
      );
    }
  }
  if (options.includeProject) {
    const name = base + '.plotfig.json';
    addFile(
      result,
      name,
      new TextEncoder().encode(
        serializeWorkspaceProject(model.template, model.workspace),
      ),
    );
    record.files.push(name);
  }
  if (record.status === 'running') record.status = 'success';
}
export async function runBatch(
  items: BatchItem[],
  options: BatchOptions,
  runtime: BatchRuntime,
): Promise<BatchResult> {
  validateBatch(items, options);
  const result = initialResult(items, runtime.previous);
  for (const [index, item] of items.entries()) {
    const record = result.records[index]!;
    if (record.status === 'success') continue;
    if (runtime.signal?.aborted) {
      record.status = 'cancelled';
      continue;
    }
    record.status = 'running';
    runtime.onProgress?.(structuredClone(result.records));
    try {
      await exportItem({ item, index, result, record }, options, runtime);
    } catch (e) {
      record.status = runtime.signal?.aborted ? 'cancelled' : 'failed';
      record.messages.push(
        runtime.signal?.aborted
          ? '用户取消了此项'
          : e instanceof Error
            ? e.message
            : '导出失败',
      );
    }
    runtime.onProgress?.(structuredClone(result.records));
  }
  runtime.onProgress?.(structuredClone(result.records));
  return result;
}

export function previewBatchItem(item: BatchItem, options: BatchOptions) {
  const model = prepare(item, options),
    data = bindWorkspace(model.template, model.workspace),
    r = renderFigureSvg(model.template, data, { purpose: 'export' });
  const errors = [...data.diagnostics, ...r.diagnostics].filter(
    (d) => d.severity === 'error',
  );
  if (!r.ok || errors.length)
    throw new Error(errors.map((d) => d.message).join('; ') || '无法预览');
  return { svg: r.svg, error: '' };
}

function validateBatch(items: BatchItem[], options: BatchOptions) {
  if (
    !items.length ||
    items.length > BATCH_LIMITS.items ||
    !options.formats.length
  )
    throw new Error('请选择 1–50 个项目和至少一种导出格式');
  if (
    new TextEncoder().encode(JSON.stringify(items)).byteLength >
    BATCH_LIMITS.inputBytes
  )
    throw new Error('批次输入超过 100 MiB');
}

function initialResult(
  items: BatchItem[],
  previous?: BatchResult,
): BatchResult {
  const result: BatchResult = {
    files: {},
    records: items.map(
      (i) =>
        previous?.records.find(
          (r) => r.id === i.id && r.status === 'success',
        ) ?? {
          id: i.id,
          name: i.name,
          status: 'pending',
          files: [],
          messages: [],
        },
    ),
  };

  for (const record of result.records)
    for (const name of record.files) {
      const bytes = previous?.files[name];
      if (bytes) result.files[name] = bytes;
    }
  return result;
}
