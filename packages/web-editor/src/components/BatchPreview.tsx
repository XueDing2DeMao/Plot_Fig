import type { BatchOptions } from '../batch/queue.js';
import type { BatchItem } from '../batch/items.js';
import { useMemo, useState } from 'react';

import { previewBatchItem } from '../batch/queue.js';
import { SvgSurface } from './SvgSurface.js';
export function BatchPreview({
  items,
  options,
}: {
  items: BatchItem[];
  options: BatchOptions;
}) {
  const [id, setId] = useState('');
  const item = items.find((i) => i.id === id) ?? items[0];
  const preview = useMemo(() => {
    try {
      return item ? previewBatchItem(item, options) : undefined;
    } catch (e) {
      return {
        svg: undefined,
        error: e instanceof Error ? e.message : '无法预览',
      };
    }
  }, [item, options.template, options.mode, options.columnNames]);
  return (
    <section>
      <label>
        预览项目
        <select value={item?.id ?? ''} onChange={(e) => setId(e.target.value)}>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      {preview?.svg ? (
        <SvgSurface svg={preview.svg} label="批量模板预览" />
      ) : (
        <p>{preview?.error ?? '添加项目后预览'}</p>
      )}
    </section>
  );
}
