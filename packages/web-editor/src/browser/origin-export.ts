import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { layerBatchItems } from '../batch/layer-items.js';
import {
  runBatch,
  type BatchRecord,
  type BatchResult,
} from '../batch/queue.js';
import { prepareFigureExport } from './figure-export-options.js';
import { rasterizePng } from './figure-export.js';
import { pngWithDpi } from './publication-export.js';

export type OriginExportSettings = {
  format: 'png' | 'svg';
  dpi: number;
  transparent: boolean;
  automatic: boolean;
  width: number;
  height: number;
};

export function exportFileBase(value: string) {
  const base = value
    .trim()
    .replace(/\.(png|svg|zip)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/, '')
    .slice(0, 120);
  if (!base) throw new Error('请输入文件名');
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base)
    ? '_' + base
    : base;
}

export function layerExportPlan(
  model: WorkspaceEditor,
  selected: string[],
  name: string,
  format: 'svg' | 'png',
) {
  const base = exportFileBase(name),
    ids = new Set(selected);
  return model.template.panels
    .filter((p) => ids.has(p.panelId))
    .map((p, i) => ({
      id: p.panelId,
      name: p.name ?? `图层 ${model.template.panels.indexOf(p) + 1}`,
      fileName: `${base}-${String(i + 1).padStart(2, '0')}.${format}`,
    }));
}

export function exportPhysicalSize(svg: string) {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml'),
    root = doc.documentElement;
  const box = root
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    doc.querySelector('parsererror') ||
    root.localName !== 'svg' ||
    !box ||
    box.length !== 4 ||
    !box.every(Number.isFinite) ||
    box[2]! <= 0 ||
    box[3]! <= 0
  )
    throw new Error('图形尺寸无效');
  const units: Record<string, number> = {
    in: 25.4,
    mm: 1,
    cm: 10,
    pt: 25.4 / 72,
    px: 25.4 / 96,
  };
  const mm = (value: string | null, fallback: number) => {
    const match = value?.match(/^(\d+(?:\.\d+)?)(in|mm|cm|pt|px)$/);
    return match
      ? Number(match[1]) * units[match[2]!]!
      : (fallback * 25.4) / 72;
  };
  const width = mm(root.getAttribute('width'), box[2]!),
    height = mm(root.getAttribute('height'), box[3]!);
  if (!(width > 0 && height > 0)) throw new Error('图形尺寸无效');
  return { width, height };
}

export function prepareOriginExport(
  svg: string,
  settings: OriginExportSettings,
) {
  const physical = exportPhysicalSize(svg);
  if (
    settings.format === 'png' &&
    (!Number.isInteger(settings.dpi) ||
      settings.dpi < 72 ||
      settings.dpi > 2400)
  )
    throw new Error('DPI 须为 72–2400 的整数');
  const automatic = settings.automatic || settings.format === 'svg';
  const dpi = settings.format === 'svg' ? 72 : settings.dpi;
  const width = automatic
    ? Math.round((physical.width / 25.4) * dpi)
    : settings.width;
  const height = automatic
    ? Math.round((physical.height / 25.4) * dpi)
    : settings.height;
  const output = prepareFigureExport(svg, {
    width,
    height,
    transparent: settings.transparent,
  });
  if (settings.format === 'svg' || !automatic) {
    const root = new DOMParser().parseFromString(
      output.svg,
      'image/svg+xml',
    ).documentElement;
    if (settings.format === 'svg') {
      root.setAttribute('width', `${Number(physical.width.toFixed(6))}mm`);
      root.setAttribute('height', `${Number(physical.height.toFixed(6))}mm`);
    } else {
      // 扩展页面而非拉伸图形，确保不同比例的像素输出也有完整的页面背景。
      const box = root
        .getAttribute('viewBox')!
        .split(/[\s,]+/)
        .map(Number);
      const ratio = width / height;
      const nextWidth = Math.max(box[2]!, box[3]! * ratio);
      const nextHeight = Math.max(box[3]!, box[2]! / ratio);
      const next = [
        box[0]! - (nextWidth - box[2]!) / 2,
        box[1]! - (nextHeight - box[3]!) / 2,
        nextWidth,
        nextHeight,
      ];
      root.setAttribute('viewBox', next.join(' '));
      root
        .querySelectorAll('[data-role="page-background"]')
        .forEach((background) => {
          ['x', 'y', 'width', 'height'].forEach((key, i) =>
            background.setAttribute(key, String(next[i])),
          );
        });
    }
    output.svg = new XMLSerializer().serializeToString(root);
  }
  return output;
}

export async function encodeOriginExport(
  svg: string,
  settings: OriginExportSettings,
): Promise<Uint8Array<ArrayBuffer>> {
  await document.fonts?.ready;
  const output = prepareOriginExport(svg, settings);
  if (settings.format === 'svg') return new TextEncoder().encode(output.svg);
  const blob = await rasterizePng(output);
  return pngWithDpi(new Uint8Array(await blob.arrayBuffer()), settings.dpi);
}

export async function runLayerExport(
  model: WorkspaceEditor,
  selected: string[],
  name: string,
  settings: OriginExportSettings,
  runtime: {
    signal?: AbortSignal;
    onProgress?: (records: BatchRecord[]) => void;
    encoder?: typeof encodeOriginExport;
  } = {},
): Promise<BatchResult> {
  const plan = layerExportPlan(model, selected, name, settings.format);
  const result = await runBatch(
    layerBatchItems(
      model,
      plan.map((p) => p.id),
    ),
    { formats: [settings.format], dpi: settings.dpi, includeProject: false },
    {
      ...(runtime.signal ? { signal: runtime.signal } : {}),
      ...(runtime.onProgress ? { onProgress: runtime.onProgress } : {}),
      exporter: (svg) => (runtime.encoder ?? encodeOriginExport)(svg, settings),
    },
  );
  const files: BatchResult['files'] = {};
  // 复用队列的失败隔离和取消机制，归档文件名统一按已选图层顺序生成。
  const records = result.records.map((record, i) => ({
    ...record,
    files: record.files.map((old) => {
      const fileName = plan[i]!.fileName;
      files[fileName] = result.files[old]!;
      return fileName;
    }),
  }));
  return { files, records };
}
