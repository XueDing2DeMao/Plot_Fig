import {
  DATA_LIMITS,
  detectDelimiter,
  parseDelimited,
  type Delimiter,
} from '@plot-fig/data-binding';
import type { ImportSheet } from './xlsx-import.js';

export type TextEncoding = 'auto' | 'utf-8' | 'gb18030' | 'utf-16le';
export type TextInputOptions = {
  encoding: TextEncoding;
  delimiter: Delimiter | 'auto';
};

export async function readFileBytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('无法读取文件'));
    reader.readAsArrayBuffer(file);
  });
}
export async function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new TextDecoder().decode(await readFileBytes(file));
}

export function decodeInput(bytes: ArrayBuffer, encoding: TextEncoding) {
  const prefix = new Uint8Array(bytes, 0, Math.min(3, bytes.byteLength));
  if (encoding !== 'auto')
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (prefix[0] === 0xff && prefix[1] === 0xfe)
    return new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
  if (prefix[0] === 0xfe && prefix[1] === 0xff)
    return new TextDecoder('utf-16be', { fatal: true }).decode(bytes);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('gb18030', { fatal: true }).decode(bytes);
  }
}

export function textSheet(
  text: string,
  name: string,
  options: TextInputOptions & { clipboard?: boolean },
): ImportSheet {
  const delimiter =
    options.delimiter === 'auto' ? detectDelimiter(text) : options.delimiter;
  return {
    source: {
      kind: options.clipboard
        ? 'clipboard'
        : /\.csv$/i.test(name)
          ? 'csv'
          : 'txt',
      name,
    },
    rows: parseDelimited(text, delimiter),
    hints: {},
    diagnostics: [],
  };
}

export async function readImportFile(
  file: File,
  options: TextInputOptions,
): Promise<ImportSheet[]> {
  if (file.size > DATA_LIMITS.fileBytes) throw new Error('数据文件超过 10 MiB');
  if (!/\.(csv|tsv|txt|xlsx)$/i.test(file.name))
    throw new Error('请选择 CSV、TXT、TSV 或 XLSX 文件');
  if (/\.xlsx$/i.test(file.name)) {
    const { readWorkbook } = await import('./xlsx-import.js');
    return readWorkbook(await readFileBytes(file), file.name);
  }
  const text =
    typeof file.arrayBuffer !== 'function' && typeof file.text === 'function'
      ? await file.text()
      : decodeInput(await readFileBytes(file), options.encoding);
  return [textSheet(text, file.name, options)];
}
