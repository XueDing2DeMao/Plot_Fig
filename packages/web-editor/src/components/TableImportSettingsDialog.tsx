import { useMemo, useState } from 'react';
import type { DataTable, TableRegion } from '@plot-fig/data-binding';
import { rebuildImportedTable } from '../state/table-import-settings.js';
import { RegionOptions } from './ImportOptions.js';
import { WorkspaceDialog } from './WorkspaceDialog.js';

const PREVIEW_ROWS = 100;

export function TableImportSettingsDialog({
  table,
  onApply,
  onClose,
}: {
  table: DataTable;
  onApply: (tableId: string, region: TableRegion) => boolean | void;
  onClose: () => void;
}) {
  const [region, setRegion] = useState<TableRegion>({ ...table.region });
  const error = useMemo(() => {
    try {
      rebuildImportedTable(table, region);
      return '';
    } catch (cause) {
      return cause instanceof Error ? cause.message : '导入参数无效';
    }
  }, [region, table]);
  return (
    <WorkspaceDialog
      title="调整导入参数"
      description={`${table.name} · 检查原始数据和字段起始位置`}
      className="table-import-settings-dialog"
      onClose={onClose}
    >
      <div className="table-import-settings-layout">
        <aside className="import-options-panel" aria-label="数据行设置">
          <h3>数据行设置</h3>
          <RegionOptions value={region} onChange={setRegion} />
          <p className="workspace-hint">
            行号从 1 开始，0 表示不使用表头或单位行。
          </p>
        </aside>
        <div className="table-wrap import-raw">
          <table>
            <caption>原始数据前 {PREVIEW_ROWS} 行 · 行号从 1 开始</caption>
            <tbody>
              {table.rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th scope="row">{rowIndex + 1}</th>
                  {row.map((cell, columnIndex) => (
                    <td key={columnIndex}>
                      {cell === null ? '—' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="workspace-hint">
        调整后会重新识别列名和单位，并按原列位置保留已有曲线绑定。
      </p>
      {error && (
        <p role="alert" className="workspace-error">
          {error}
        </p>
      )}
      <footer className="workspace-actions">
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={Boolean(error)}
          onClick={() => {
            if (onApply(table.tableId, region) !== false) onClose();
          }}
        >
          应用调整
        </button>
      </footer>
    </WorkspaceDialog>
  );
}
