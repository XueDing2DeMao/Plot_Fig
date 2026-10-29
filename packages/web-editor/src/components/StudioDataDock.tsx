import { useId, useState } from 'react';
import type { ComponentProps } from 'react';
import { WorkspaceTablePanel } from './WorkspaceTablePanel.js';

type TableProps = ComponentProps<typeof WorkspaceTablePanel>;

export function StudioDataDock(props: Omit<TableProps, 'onSelect'>) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const bodyId = useId();
  const table =
    props.workspace.tables.find((item) => item.tableId === selectedTable) ??
    props.workspace.tables.find(
      (item) => item.tableId === props.workspace.activeTableId,
    ) ??
    props.workspace.tables[0];
  return (
    <div className="studio-data-dock">
      <div className="studio-dock-header">
        <button
          type="button"
          aria-label={expanded ? '收起数据表' : '展开数据表'}
          aria-expanded={expanded}
          aria-controls={bodyId}
          disabled={!table}
          onClick={() => setExpanded((value) => !value)}
        >
          <span aria-hidden="true">▦</span> 数据表
          <span aria-hidden="true">{expanded ? '⌄' : '⌃'}</span>
        </button>
        <span>
          {table
            ? `${table.name} · ${Math.max(0, table.rows.length - table.region.dataStartRow)} 行`
            : '导入后可查看数据'}
        </span>
      </div>
      {expanded && table && (
        <section id={bodyId} aria-label="画布数据表">
          <WorkspaceTablePanel
            {...props}
            workspace={{ ...props.workspace, activeTableId: table.tableId }}
            onSelect={setSelectedTable}
          />
        </section>
      )}
    </div>
  );
}
