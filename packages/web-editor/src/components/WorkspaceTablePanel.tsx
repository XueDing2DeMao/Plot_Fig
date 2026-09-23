import { useMemo, useState } from 'react';
import {
  organizeTable,
  type DataTable,
  type DataWorkspace,
  type TableRegion,
} from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { ColumnSettingsDialog } from './ColumnSettingsDialog.js';
import { RemoveTableDialog } from './RemoveTableDialog.js';
import {
  TABLE_PAGE_SIZE,
  TableRows,
  TableMetadata,
  TableToolbar,
  TablePagination,
} from './WorkspaceTableParts.js';
import { TableImportSettingsDialog } from './TableImportSettingsDialog.js';

type Props = {
  workspace: DataWorkspace;
  template: FigureTemplate;
  onSelect: (id: string) => void;
  onTableChange: (table: DataTable) => void;
  onImportOptions: (tableId: string, region: TableRegion) => boolean | void;
  onRemove: (id: string) => void;
};
function useTableView(table: DataTable) {
  const [page, setPage] = useState(0),
    [columnId, setColumnId] = useState<string>();
  const [name, setName] = useState(table.name),
    [removing, setRemoving] = useState(false),
    [adjustingImport, setAdjustingImport] = useState(false);
  const organized = useMemo(() => organizeTable(table), [table]);
  const column = table.columns.find((c) => c.columnId === columnId);
  const pages = Math.max(1, Math.ceil(organized.rowCount / TABLE_PAGE_SIZE));
  return {
    page: Math.min(page, pages - 1),
    setPage,
    setColumnId,
    name,
    setName,
    removing,
    setRemoving,
    adjustingImport,
    setAdjustingImport,
    organized,
    column,
    pages,
  };
}
function ActiveTable({ table, props }: { table: DataTable; props: Props }) {
  const view = useTableView(table);
  return (
    <>
      <TableMetadata table={table} count={view.organized.rowCount} />
      <TableToolbar
        name={view.name}
        onName={view.setName}
        onRename={() =>
          props.onTableChange({ ...table, name: view.name.trim() })
        }
        onImportOptions={() => view.setAdjustingImport(true)}
        onRemove={() => view.setRemoving(true)}
      />
      <TableRows
        organized={view.organized}
        page={view.page}
        onSettings={view.setColumnId}
      />
      <TablePagination
        page={view.page}
        pages={view.pages}
        count={view.organized.rowCount}
        onChange={view.setPage}
      />
      {view.column && (
        <ColumnSettingsDialog
          table={table}
          column={view.column}
          onApply={props.onTableChange}
          onClose={() => view.setColumnId(undefined)}
        />
      )}
      {view.removing && (
        <RemoveTableDialog
          {...props}
          table={table}
          onClose={() => view.setRemoving(false)}
        />
      )}
      {view.adjustingImport && (
        <TableImportSettingsDialog
          table={table}
          onApply={props.onImportOptions}
          onClose={() => view.setAdjustingImport(false)}
        />
      )}
    </>
  );
}
export function WorkspaceTablePanel(props: Props) {
  const table = props.workspace.tables.find(
    (t) => t.tableId === props.workspace.activeTableId,
  );
  return (
    <section className="panel data-preview-panel" aria-label="数据表预览">
      <div className="panel-head">
        <div>
          <h2>数据表</h2>
          <small>{props.workspace.tables.length} 张表 · 点击列头整理数据</small>
        </div>
      </div>
      {props.workspace.tables.length > 0 && (
        <label className="table-selector">
          当前数据表
          <select
            value={props.workspace.activeTableId ?? ''}
            onChange={(e) => props.onSelect(e.target.value)}
          >
            {props.workspace.tables.map((t) => (
              <option key={t.tableId} value={t.tableId}>
                {t.name} · {t.source.kind.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      )}
      {table ? (
        <ActiveTable
          key={JSON.stringify([table.tableId, table.name])}
          table={table}
          props={props}
        />
      ) : (
        <div className="table-empty">
          <strong>导入数据后查看表格</strong>
          <span>CSV、TXT、XLSX 或从剪贴板粘贴</span>
        </div>
      )}
    </section>
  );
}
