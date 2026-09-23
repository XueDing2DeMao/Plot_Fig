import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { TemplateEntry } from './catalog.js';
import { loadFigurePayload } from '@plot-fig/figure-migrations';

const DB_NAME = 'plot-fig-template-library',
  STORE = 'templates',
  MAX_TEMPLATE_BYTES = 2 * 1024 * 1024;
export function parseLibraryTemplate(text: string): FigureTemplate {
  if (new TextEncoder().encode(text).length > MAX_TEMPLATE_BYTES)
    throw new Error('模板文件超过 2 MiB');
  const result = loadFigurePayload(JSON.parse(text));
  if (!result.ok || result.value.kind !== 'figure-template')
    throw new Error('模板无效或版本不受支持');
  return result.value;
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('浏览器无法使用模板存储，请导出模板 JSON'));
      return;
    }
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE))
        r.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    r.onerror = () => reject(new Error('模板库无法打开'));
    r.onblocked = () => reject(new Error('请关闭其他正在升级模板库的标签页'));
    r.onsuccess = () => resolve(r.result);
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode),
      request = action(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(new Error('模板存储失败，请检查浏览器存储空间或导出 JSON'));
    };
  });
}
export async function listTemplates(): Promise<TemplateEntry[]> {
  const values = await transaction('readonly', (store) => store.getAll());
  return values.map((value) => {
    if (value.version !== '1.0.0' || typeof value.id !== 'string')
      throw new Error('模板库记录版本无效');
    const template = parseLibraryTemplate(JSON.stringify(value.template));
    return {
      id: value.id,
      name: template.metadata.name,
      tags: template.metadata.tags,
      template,
      builtIn: false,
    };
  });
}
export async function saveTemplate(
  template: FigureTemplate,
  id = 'custom-' + crypto.randomUUID(),
): Promise<string> {
  const valid = parseLibraryTemplate(JSON.stringify(template));
  await transaction('readwrite', (store) =>
    store.put({ id, version: '1.0.0', template: valid }),
  );
  return id;
}
export async function deleteTemplate(id: string): Promise<void> {
  if (!id.startsWith('custom-')) throw new Error('内置模板不可删除');
  await transaction('readwrite', (store) => store.delete(id));
}
