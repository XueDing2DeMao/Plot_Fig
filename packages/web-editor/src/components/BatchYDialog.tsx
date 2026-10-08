import { useId, useState } from 'react';
import type { DataTable, DataWorkspace } from '@plot-fig/data-binding';
import { roleAcceptsType, type Panel } from '@plot-fig/figure-schema';
import {
  batchYBindings,
  type BatchYSelection,
} from '../state/batch-y-columns.js';
import { WorkspaceDialog } from './WorkspaceDialog.js';
import './batch-y-dialog.css';

type Props = {
  applyError?: string | undefined;
  panel: Panel;
  workspace: DataWorkspace;
  onApply: (selection: BatchYSelection) => boolean | void;
  onClose: () => void;
};

function ColumnSelection({
  table,
  panel,
  workspace,
  onApply,
  onClose,
  applyError,
}: Props & { table: DataTable }) {
  const roles = batchYBindings(panel.plotSlots.at(-1)!);
  const xColumns = table.columns.filter((c) =>
    roles?.category
      ? roleAcceptsType('category', c.settings.type)
      : ['number', 'date', 'datetime'].includes(c.settings.type),
  );
  const currentX = roles && workspace.slotBindings[roles.x!];
  const [xId, setXId] = useState(() =>
    currentX?.tableId === table.tableId &&
    xColumns.some((c) => c.columnId === currentX.columnId)
      ? currentX.columnId
      : (xColumns[0]?.columnId ?? ''),
  );
  const [selected, setSelected] = useState(
    () =>
      new Set(
        table.columns
          .filter((c) => c.settings.type === 'number' && c.columnId !== xId)
          .map((c) => c.columnId),
      ),
  );
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const helpId = useId();
  const candidates = table.columns.filter(
    (c) => c.settings.type === 'number' && c.columnId !== xId,
  );
  const visible = candidates.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const selectedIds = candidates
    .filter((c) => selected.has(c.columnId))
    .map((c) => c.columnId);
  return (
    <>
      <label className="batch-y-field">
        共用 X 数据列
        <select
          value={xId}
          onChange={(event) => {
            const id = event.target.value;
            setXId(id);
            setSelected((current) => {
              const next = new Set(current);
              next.delete(id);
              return next;
            });
            setError('');
          }}
        >
          {!xColumns.length && <option value="">无兼容列</option>}
          {xColumns.map((c) => (
            <option key={c.columnId} value={c.columnId}>
              {c.name}
              {c.settings.unit && ` · ${c.settings.unit}`}
            </option>
          ))}
        </select>
      </label>
      <label className="batch-y-field">
        搜索 Y 列
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="按列名筛选…"
        />
      </label>
      <div className="batch-y-actions">
        <button
          type="button"
          disabled={!visible.length}
          onClick={() =>
            setSelected(
              (current) =>
                new Set([...current, ...visible.map((c) => c.columnId)]),
            )
          }
        >
          {query.trim() ? '全选搜索结果' : '全选 Y 列'}
        </button>
        <button
          type="button"
          disabled={!selectedIds.length}
          onClick={() => setSelected(new Set())}
        >
          清空选择
        </button>
        <span role="status">
          已选 {selectedIds.length} / {candidates.length} 列
        </span>
      </div>
      <fieldset className="batch-y-columns" aria-describedby={helpId}>
        <legend>Y 数据列</legend>
        {!visible.length && (
          <p className="workspace-hint">没有符合条件的数值列。</p>
        )}
        {visible.map((column) => (
          <label className="batch-y-column" key={column.columnId}>
            <input
              type="checkbox"
              checked={selected.has(column.columnId)}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.add(column.columnId);
                  else next.delete(column.columnId);
                  return next;
                });
              }}
            />
            <span>
              {column.name}
              {column.settings.unit && ` · ${column.settings.unit}`}
            </span>
          </label>
        ))}
      </fieldset>
      <p className="workspace-hint" id={helpId}>
        按原列顺序添加到当前图层，图例使用列名。保留已有曲线，跳过相同 X/Y
        绑定。添加后点击“生成图形”或“应用修改”。
      </p>
      {error && (
        <p role="alert" className="workspace-error">
          {applyError || error}
        </p>
      )}
      <div className="batch-y-actions batch-y-submit">
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={!xId || !selectedIds.length}
          onClick={() => {
            try {
              if (
                onApply({
                  panelId: panel.panelId,
                  tableId: table.tableId,
                  xColumnId: xId,
                  yColumnIds: selectedIds,
                }) === false
              ) {
                setError('批量添加未完成，请检查图形设置中的提示。');
                return;
              }
              onClose();
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : '无法批量添加曲线',
              );
            }
          }}
        >
          添加所选曲线（{selectedIds.length}）
        </button>
      </div>
    </>
  );
}

export function BatchYDialog(props: Props) {
  const { panel, workspace } = props;
  const roles =
    panel.plotSlots.at(-1) && batchYBindings(panel.plotSlots.at(-1)!);
  const [tableId, setTableId] = useState(
    () =>
      (roles && workspace.slotBindings[roles.x!]?.tableId) ??
      workspace.activeTableId ??
      workspace.tables[0]?.tableId ??
      '',
  );
  const table = workspace.tables.find((t) => t.tableId === tableId);
  return (
    <WorkspaceDialog title="批量选择 Y 列" onClose={props.onClose}>
      <div className="batch-y-body">
        <label className="batch-y-field">
          数据表
          <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            {workspace.tables.map((t) => (
              <option value={t.tableId} key={t.tableId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {table && roles ? (
          <ColumnSelection key={table.tableId} {...props} table={table} />
        ) : (
          <p className="workspace-hint">
            请先导入数据并选择折线、散点、柱形或面积图。
          </p>
        )}
      </div>
    </WorkspaceDialog>
  );
}
