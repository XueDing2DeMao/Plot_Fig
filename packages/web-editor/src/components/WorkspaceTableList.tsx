import { useState } from 'react';
import type { DataTable, DataWorkspace } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { RemoveTableDialog } from './RemoveTableDialog.js';

type Props = {
  workspace: DataWorkspace;
  template: FigureTemplate;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};
function TableItem({
  table,
  active,
  onSelect,
  onDelete,
}: {
  table: DataTable;
  active: boolean;
  onSelect: Props['onSelect'];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="workspace-table-item">
      <button
        type="button"
        aria-label={`预览表 ${table.name}`}
        aria-current={active}
        onClick={() => onSelect(table.tableId)}
      >
        {table.name} · {table.source.kind.toUpperCase()}
      </button>
      <button
        type="button"
        className="workspace-table-delete"
        aria-label={`删除表 ${table.name}`}
        title="删除数据表"
        onClick={() => onDelete(table.tableId)}
      >
        ×
      </button>
    </div>
  );
}
export function WorkspaceTableList(props: Props) {
  const [removingId, setRemovingId] = useState<string>();
  const removing = props.workspace.tables.find(
    (table) => table.tableId === removingId,
  );
  return (
    <>
      <div className="workspace-table-list">
        {props.workspace.tables.map((table) => (
          <TableItem
            key={table.tableId}
            table={table}
            active={props.workspace.activeTableId === table.tableId}
            onSelect={props.onSelect}
            onDelete={setRemovingId}
          />
        ))}
      </div>
      {removing && (
        <RemoveTableDialog
          {...props}
          table={removing}
          onClose={() => setRemovingId(undefined)}
        />
      )}
    </>
  );
}
