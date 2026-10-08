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
  const index = item ? items.indexOf(item) : -1;
  const preview = useMemo(() => {
    try {
      return item ? previewBatchItem(item, options) : undefined;
    } catch (e) {
      return {
        svg: undefined,
        error: e instanceof Error ? e.message : '无法预览',
      };
    }
  }, [
    item,
    options.template,
    options.mode,
    options.columnNames,
    options.columnMappings,
    options.autoXY,
    options.formatScopes,
  ]);
  return (
    <section className="dataset-batch-preview" aria-label="批量预览区">
      <header className="dataset-batch-preview-toolbar">
        <h3>图形预览</h3>
        <div className="dataset-batch-preview-navigation">
          <label>
            预览项目
            <select
              disabled={!items.length}
              value={item?.id ?? ''}
              onChange={(e) => setId(e.target.value)}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <div className="dataset-batch-preview-pager">
            <button
              type="button"
              aria-label="上一项"
              title="上一项"
              disabled={index <= 0}
              onClick={() => setId(items[index - 1]!.id)}
            >
              ‹
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
            <button
              type="button"
              aria-label="下一项"
              title="下一项"
              disabled={index < 0 || index >= items.length - 1}
              onClick={() => setId(items[index + 1]!.id)}
            >
              ›
            </button>
          </div>
        </div>
      </header>
      <div className="dataset-batch-preview-stage">
        {preview?.svg ? (
          <SvgSurface svg={preview.svg} label="批量模板预览" />
        ) : (
          <p className="dataset-batch-preview-empty">
            {preview?.error ?? '选择数据表后显示预览'}
          </p>
        )}
      </div>
    </section>
  );
}
