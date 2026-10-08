import { useEffect, useState, type ReactNode } from 'react';
import type { BatchItem } from '../batch/items.js';
import type { BatchRecord } from '../batch/queue.js';

const statusLabels = {
  pending: '等待',
  running: '处理中',
  success: '成功',
  failed: '失败',
  cancelled: '已取消',
};

function BatchDisclosure({
  label,
  title,
  summary,
  attentionKey,
  running = false,
  initiallyOpen = false,
  children,
}: {
  label: string;
  title: string;
  summary: ReactNode;
  attentionKey: string;
  running?: boolean;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen || !!attentionKey);
  useEffect(() => {
    if (attentionKey) setOpen(true);
  }, [attentionKey]);
  useEffect(() => {
    if (running) setOpen(true);
  }, [running]);
  return (
    <details
      className="dataset-batch-report"
      aria-label={label}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span className="dataset-batch-chevron" aria-hidden="true">
          ›
        </span>
        <strong>{title}</strong>
        <span className="dataset-batch-report-summary">{summary}</span>
      </summary>
      <div className="dataset-batch-report-content">{children}</div>
    </details>
  );
}

export function DatasetBatchPreflight({
  items,
  preflight,
}: {
  items: BatchItem[];
  preflight: { id: string; error: string }[];
}) {
  const errors = new Map(
    preflight.filter((item) => item.error).map((item) => [item.id, item.error]),
  );
  const ready = items.length - errors.size;
  return (
    <BatchDisclosure
      label="任务预检"
      title="任务预检"
      attentionKey={errors.size ? JSON.stringify([...errors]) : ''}
      summary={
        <>
          <span className="dataset-batch-ready">
            {ready} / {items.length} 项可运行
          </span>
          {errors.size > 0 && (
            <span className="dataset-batch-error">{errors.size} 项待配置</span>
          )}
        </>
      }
    >
      <p>待配置项单独记录失败，其他项目照常输出。修改设置后需重新运行。</p>
      <ul className="dataset-batch-checks">
        {items.map((item) => (
          <li key={item.id}>
            <strong title={item.name}>{item.name}</strong>
            <span
              className={
                errors.has(item.id)
                  ? 'dataset-batch-error'
                  : 'dataset-batch-ready'
              }
            >
              {errors.has(item.id) ? '待配置' : '可运行'}
            </span>
            {errors.has(item.id) && (
              <p className="dataset-batch-error">{errors.get(item.id)}</p>
            )}
          </li>
        ))}
      </ul>
      {!items.length && <p>选择数据表后显示预检结果。</p>}
    </BatchDisclosure>
  );
}

export function DatasetBatchResults({
  records,
  running,
}: {
  records: BatchRecord[];
  running: boolean;
}) {
  const success = records.filter(
    (record) => record.status === 'success',
  ).length;
  const failed = records.filter((record) => record.status === 'failed').length;
  const cancelled = records.filter(
    (record) => record.status === 'cancelled',
  ).length;
  const attention = records
    .filter(
      (record) => record.status === 'failed' || record.status === 'cancelled',
    )
    .map((record) => [record.id, record.status]);
  return (
    <section
      className="dataset-batch-results"
      aria-label="批次结果"
      aria-live="polite"
    >
      <BatchDisclosure
        label="批次明细"
        title="批次结果"
        initiallyOpen
        running={running}
        attentionKey={attention.length ? JSON.stringify(attention) : ''}
        summary={
          <>
            <span>
              {success + failed + cancelled} / {records.length} 已完成
            </span>
            <span className="dataset-batch-ready">成功 {success}</span>
            {failed > 0 && (
              <span className="dataset-batch-error">失败 {failed}</span>
            )}
            {cancelled > 0 && <span>取消 {cancelled}</span>}
          </>
        }
      >
        <table>
          <thead>
            <tr>
              <th>项目</th>
              <th>状态</th>
              <th>文件与说明</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.name}</td>
                <td
                  className={
                    record.status === 'failed'
                      ? 'dataset-batch-error'
                      : record.status === 'success'
                        ? 'dataset-batch-ready'
                        : undefined
                  }
                >
                  {statusLabels[record.status]}
                </td>
                <td>
                  {record.files.join('、')}
                  {record.messages.map((message, index) => (
                    <p key={index}>{message}</p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </BatchDisclosure>
    </section>
  );
}
