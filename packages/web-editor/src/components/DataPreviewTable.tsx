import type { DataBindingSet, DataValue } from '@plot-fig/data-binding';

type Props = {
  data: DataBindingSet | undefined;
  fileName?: string | undefined;
};

function formatValue(value: DataValue): string {
  return value === null ? '—' : String(value);
}

export function DataPreviewTable({ data, fileName }: Props) {
  const rowCount = data?.source.rowCount ?? 0;
  const columns = data?.columns ?? [];
  const previewRows = Math.min(8, rowCount);

  return (
    <section className="panel data-preview-panel" aria-label="数据表预览">
      <div className="file-bar">
        <div className="file-meta">
          <span className="file-icon">CSV</span>
          <div>
            <strong>{fileName ?? '等待数据文件'}</strong>
            <small>
              {data
                ? `${data.source.rowCount.toLocaleString()} 行 · ${columns.length} 个字段`
                : '导入文件后显示数据识别结果'}
            </small>
          </div>
        </div>
        <span className={data ? 'ready' : 'file-state'}>
          {data ? '● 已准备' : '等待导入'}
        </span>
      </div>
      <div className="data-preview-body">
        <div className="panel-head compact-head">
          <div>
            <h2>数据表预览</h2>
            <small>展示数据区前 {previewRows || 0} 行</small>
          </div>
          <span className="preview-count">
            {data ? `${rowCount.toLocaleString()} rows` : 'No data'}
          </span>
        </div>
        {data ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map((column) => (
                    <th key={column.columnId}>
                      {column.name || `列 ${column.index + 1}`}
                      <span>{column.valueType}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: previewRows }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>{rowIndex + 1}</td>
                    {columns.map((column) => (
                      <td key={column.columnId}>
                        {formatValue(column.values[rowIndex] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty">
            <strong>导入数据后查看表格</strong>
            <span>系统会先识别编码、表头和数据类型。</span>
          </div>
        )}
        {data && (
          <div className="table-note">
            <span>
              共 {rowCount.toLocaleString()} 行 · {columns.length} 个字段
            </span>
            <span>仅展示前 {previewRows} 行</span>
          </div>
        )}
      </div>
    </section>
  );
}
