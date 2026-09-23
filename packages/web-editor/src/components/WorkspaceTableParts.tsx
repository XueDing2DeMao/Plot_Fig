import type { DataTable, OrganizedTable } from '@plot-fig/data-binding';
export const TABLE_PAGE_SIZE = 50;
type RowsProps = {
  organized: OrganizedTable;
  page: number;
  onSettings: (id: string) => void;
};

function TableHead({
  organized,
  onSettings,
}: Pick<RowsProps, 'organized' | 'onSettings'>) {
  return (
    <thead>
      <tr>
        <th scope="col">#</th>
        {organized.columns.map((column) => (
          <th key={column.columnId} scope="col" aria-label={column.name}>
            <button
              type="button"
              className="column-settings-trigger"
              aria-label={`设置 ${column.name} 列`}
              onClick={() => onSettings(column.columnId)}
            >
              {column.name}
              <span>{column.settings.unit} ⚙</span>
            </button>
          </th>
        ))}
      </tr>
    </thead>
  );
}
export function TableRows({ organized, page, onSettings }: RowsProps) {
  const count = Math.max(
    0,
    Math.min(TABLE_PAGE_SIZE, organized.rowCount - page * TABLE_PAGE_SIZE),
  );
  return (
    <div className="table-wrap">
      <table>
        <TableHead organized={organized} onSettings={onSettings} />
        <tbody>
          {Array.from({ length: count }, (_, index) => (
            <tr key={index}>
              <th scope="row">{page * TABLE_PAGE_SIZE + index + 1}</th>
              {organized.columns.map((column) => (
                <td key={column.columnId}>
                  {column.values[page * TABLE_PAGE_SIZE + index] === null
                    ? '—'
                    : String(
                        column.values[page * TABLE_PAGE_SIZE + index] ?? '',
                      )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function TableMetadata({
  table,
  count,
}: {
  table: DataTable;
  count: number;
}) {
  return (
    <div className="file-bar">
      <div className="file-meta">
        <span className="file-icon">{table.source.kind.toUpperCase()}</span>
        <div>
          <strong>{table.name}</strong>
          <small>
            {count.toLocaleString()} 行 · {table.columns.length} 个字段 ·{' '}
            {table.source.sheetName ?? table.source.name}
          </small>
        </div>
      </div>
      <span className="ready">已导入</span>
    </div>
  );
}
export function TableToolbar({
  name,
  onName,
  onRename,
  onImportOptions,
  onRemove,
}: {
  name: string;
  onName: (value: string) => void;
  onRename: () => void;
  onImportOptions: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="workspace-table-tools">
      <label>
        表名称
        <input
          maxLength={256}
          value={name}
          onChange={(e) => onName(e.target.value)}
        />
      </label>
      <button type="button" disabled={!name.trim()} onClick={onRename}>
        重命名
      </button>
      <button type="button" onClick={onImportOptions}>
        调整导入参数
      </button>
      <button type="button" onClick={onRemove}>
        移除数据表
      </button>
    </div>
  );
}
export function TablePagination({
  page,
  pages,
  count,
  onChange,
}: {
  page: number;
  pages: number;
  count: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="workspace-pagination">
      <span>
        第 {page + 1} / {pages} 页 · 共 {count.toLocaleString()} 行
      </span>
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        上一页
      </button>
      <button
        type="button"
        disabled={page + 1 >= pages}
        onClick={() => onChange(page + 1)}
      >
        下一页
      </button>
    </div>
  );
}
