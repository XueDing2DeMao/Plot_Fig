import type { BatchOptions } from '../batch/queue.js';
import type { BatchItem } from '../batch/items.js';
import type { VectorOptions } from '../browser/export-service-client.js';
import { useEffect, useRef, useState } from 'react';

import { downloadBlob } from '../browser/figure-export.js';
import { exportBatchBytes } from '../batch/export-bytes.js';
import {
  runBatch,
  type BatchRecord,
  type BatchResult,
} from '../batch/queue.js';

import { batchArchive } from '../batch/archive.js';
function useBatchResult() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [result, setResult] = useState<BatchResult>(),
    [records, setRecords] = useState<BatchRecord[]>([]);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '批次失败');
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    message,
    setMessage,
    result,
    setResult,
    records,
    setRecords,
    act,
  };
}
export function useBatchRunner(
  items: BatchItem[],
  options: BatchOptions,
  vector: VectorOptions,
) {
  const state = useBatchResult(),
    controller = useRef<AbortController | undefined>(undefined);
  const running = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    state.setResult(undefined);
    state.setRecords([]);
  }, [items, options]);
  const start = async (retry = false, downloadAfter = false) => {
    if (running.current || state.busy) return;
    running.current = true;
    try {
      await state.act(async () => {
        const c = new AbortController();
        controller.current = c;
        const result = await runBatch(items, options, {
          signal: c.signal,
          onProgress: state.setRecords,
          ...(retry && state.result ? { previous: state.result } : {}),
          exporter: (svg, format) =>
            exportBatchBytes(svg, format, { ...vector, signal: c.signal }),
        });
        state.setResult(result);
        if (downloadAfter && !c.signal.aborted) {
          if (!Object.keys(result.files).length) {
            state.setMessage('没有可导出的文件，请检查待配置或失败的图层。');
            return;
          }
          const archive = await batchArchive(result, options);
          if (c.signal.aborted) {
            state.setMessage('下载已取消，可重新下载已完成的文件与清单');
            return;
          }
          downloadBlob(archive, 'Plot-Fig-batch', 'zip');
          const failed = result.records.filter(
            (r) => r.status === 'failed',
          ).length;
          state.setMessage(
            failed
              ? `已发起 ZIP 下载，${failed} 个图层未完全导出，请查看下方原因。`
              : '已发起 ZIP 下载，每个图层独立保存为图片。',
          );
          return;
        }
        state.setMessage(
          c.signal.aborted
            ? '批次已取消，可下载已完成的文件与清单'
            : '批次处理结束，请查看每项状态',
        );
      });
    } finally {
      running.current = false;
    }
  };
  const download = async () => {
    if (!state.result || running.current || state.busy) return;
    const result = state.result;
    running.current = true;
    try {
      await state.act(async () => {
        const c = new AbortController();
        controller.current = c;
        const archive = await batchArchive(result, options);
        if (c.signal.aborted) {
          state.setMessage('下载已取消，可重新下载已完成的文件与清单');
          return;
        }
        downloadBlob(archive, 'Plot-Fig-batch', 'zip');
        state.setMessage('已发起 ZIP 下载（含 manifest.json）');
      });
    } finally {
      running.current = false;
    }
  };
  return {
    ...state,
    controller,
    start,
    startAndDownload: () => start(false, true),
    download,
  };
}
