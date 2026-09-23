import type { DataWorkspace } from '@plot-fig/data-binding';

export function WorkspaceFiles({
  workspace,
  onPreview,
}: {
  workspace: DataWorkspace;
  onPreview: (tableId: string) => void;
}) {
  const active =
    workspace.tables.find(
      (table) => table.tableId === workspace.activeTableId,
    ) ?? workspace.tables[0];
  return (
    <section className="workspace-files" aria-label="已导入文件">
      <div className="workspace-files-head">
        <button
          type="button"
          disabled={!active}
          aria-haspopup="dialog"
          onClick={() => active && onPreview(active.tableId)}
        >
          数据表预览
        </button>
        <span>{workspace.tables.length} 张表</span>
      </div>
      {workspace.tables.length ? (
        <ul className="workspace-file-list">
          {workspace.tables.map((table) => {
            const filename = table.source.name;
            const details = [
              ...new Set(
                [
                  table.source.sheetName,
                  table.name !== filename ? table.name : undefined,
                ].filter(Boolean),
              ),
            ].join(' · ');
            return (
              <li key={table.tableId}>
                <button
                  type="button"
                  aria-label={`预览文件 ${filename}${details ? ` · ${details}` : ''}`}
                  aria-haspopup="dialog"
                  title={[filename, details].filter(Boolean).join(' · ')}
                  onClick={() => onPreview(table.tableId)}
                >
                  <strong>{filename}</strong>
                  {details && <span>{details}</span>}
                  <small>
                    {Math.max(0, table.rows.length - table.region.dataStartRow)}{' '}
                    行 · {table.columns.length} 列
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="workspace-files-empty">
          导入文件后，点击文件名快速预览。
        </p>
      )}
    </section>
  );
}
