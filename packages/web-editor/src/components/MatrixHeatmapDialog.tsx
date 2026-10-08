import { useState } from 'react';
import type { DataTable, DataWorkspace } from '@plot-fig/data-binding';
import {
  MAX_MATRIX_CELLS,
  type MatrixHeatmapSelection,
} from '../state/matrix-heatmap.js';
import { WorkspaceDialog } from './WorkspaceDialog.js';
import { ColorFields } from './ColorFields.js';
import { defaultColorScale } from '../state/chart-defaults.js';
import './batch-y-dialog.css';
import './matrix-heatmap-dialog.css';

type Props = {
  panelId: string;
  workspace: DataWorkspace;
  applyError?: string | undefined;
  onApply: (selection: MatrixHeatmapSelection) => boolean | void;
  onClose: () => void;
};
function MatrixSelection({ table, ...props }: Props & { table: DataTable }) {
  const numeric = table.columns.filter((c) => c.settings.type === 'number');
  const [coordinateId, setCoordinateId] = useState(numeric[0]?.columnId ?? '');
  const [selected, setSelected] = useState(
    () => new Set(numeric.slice(1).map((c) => c.columnId)),
  );
  const [query, setQuery] = useState('');
  const [layout, setLayout] =
    useState<MatrixHeatmapSelection['layout']>('y-columns');
  const [mode, setMode] =
    useState<MatrixHeatmapSelection['coordinates']['mode']>('index');
  const [custom, setCustom] = useState('');
  const [coordinateRow, setCoordinateRow] = useState('1');
  const [start, setStart] = useState('1');
  const rowCount = table.rows.length - table.region.dataStartRow;
  const [end, setEnd] = useState(String(rowCount));
  const [error, setError] = useState('');
  const [colorScale, setColorScale] = useState(() => defaultColorScale('强度'));
  const candidates = numeric.filter((c) => c.columnId !== coordinateId);
  const visible = candidates.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const ids = candidates
    .filter((c) => selected.has(c.columnId))
    .map((c) => c.columnId);
  const rows = Number(end) - Number(start) + 1;
  const validRange =
    Number.isInteger(Number(start)) &&
    Number.isInteger(Number(end)) &&
    Number(start) >= 1 &&
    Number(end) <= rowCount &&
    rows > 0;
  const cells = validRange ? rows * ids.length : 0;
  return (
    <>
      <p className="workspace-hint">
        选择一列坐标和多列强度，按原列顺序组成热图。生成独立图层，原始数据和已有曲线保留。
      </p>
      <div className="matrix-heatmap-fields">
        <label>
          数据布局
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as typeof layout)}
          >
            <option value="y-columns">Y 数据跨列（每列是一行热图）</option>
            <option value="x-columns">X 数据跨列（每列是一列热图）</option>
          </select>
        </label>
        <label>
          {layout === 'y-columns' ? 'X 坐标列' : 'Y 坐标列'}
          <select
            value={coordinateId}
            onChange={(e) => {
              const id = e.target.value;
              setCoordinateId(id);
              setSelected((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
              });
            }}
          >
            {!numeric.length && <option value="">无数值列</option>}
            {numeric.map((c) => (
              <option key={c.columnId} value={c.columnId}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          跨列坐标来源
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="index">列序号（1、2、3…）</option>
            <option value="name">数值列名</option>
            <option value="unit">数值单位行</option>
            <option value="row">指定工作表行</option>
            <option value="custom">自定义数值</option>
          </select>
        </label>
        {mode === 'row' && (
          <label>
            坐标标签所在工作表行
            <input
              type="number"
              min="1"
              max={table.rows.length}
              value={coordinateRow}
              onChange={(e) => setCoordinateRow(e.target.value)}
            />
          </label>
        )}
        <label>
          起始数据行
          <input
            type="number"
            min="1"
            max={rowCount}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          结束数据行
          <input
            type="number"
            min="1"
            max={rowCount}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      {mode === 'custom' && (
        <label>
          自定义列坐标
          <textarea
            rows={3}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="按所选列的原始顺序填写，用逗号或空格分隔，如 10, 20, 35"
          />
        </label>
      )}
      <p className="workspace-hint">
        数据行从数据区第 1 行计数，共 {rowCount}{' '}
        行。列坐标须为互不重复的数值；文本列标签可改用列序号。空强度单元保持空白。
      </p>
      <label>
        搜索强度列
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
          {query.trim() ? '全选搜索结果' : '全选强度列'}
        </button>
        <button
          type="button"
          disabled={!ids.length}
          onClick={() => setSelected(new Set())}
        >
          清空选择
        </button>
        <span>
          已选 {ids.length} / {candidates.length} 列
        </span>
      </div>
      <fieldset className="batch-y-columns matrix-heatmap-columns">
        <legend>强度 Z 数据列</legend>
        {!visible.length && (
          <p className="workspace-hint">没有符合条件的数值列。</p>
        )}
        {visible.map((c) => (
          <label className="batch-y-column" key={c.columnId}>
            <input
              type="checkbox"
              checked={selected.has(c.columnId)}
              onChange={(e) => {
                const checked = e.target.checked;
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.add(c.columnId);
                  else next.delete(c.columnId);
                  return next;
                });
              }}
            />
            <span>{c.name}</span>
          </label>
        ))}
      </fieldset>
      <p
        role="status"
        className={
          cells > MAX_MATRIX_CELLS || !validRange
            ? 'workspace-error'
            : 'workspace-hint'
        }
      >
        {validRange
          ? `${rows} 行 × ${ids.length} 列 = ${cells.toLocaleString()} 个单元`
          : '请填写有效的数据行范围'}
        ；最多 {MAX_MATRIX_CELLS.toLocaleString()} 个单元。
      </p>
      <p className="workspace-hint">
        热图使用本次选择的数据快照。修改原表后，请重新生成热图。
      </p>
      <div className="matrix-heatmap-colors">
        <ColorFields value={colorScale} onChange={setColorScale} />
      </div>
      {error && (
        <p role="alert" className="workspace-error">
          {error === '生成未完成'
            ? props.applyError || '生成未完成，请检查图形设置中的提示。'
            : error}
        </p>
      )}
      <div className="batch-y-actions batch-y-submit">
        <button type="button" onClick={props.onClose}>
          取消
        </button>
        <button
          type="button"
          className="primary-action"
          disabled={
            !coordinateId ||
            !ids.length ||
            !validRange ||
            cells > MAX_MATRIX_CELLS
          }
          onClick={() => {
            try {
              let coordinates: MatrixHeatmapSelection['coordinates'];
              if (mode === 'custom') {
                const tokens = custom.trim().split(/[\s,，;；]+/);
                if (
                  !custom.trim() ||
                  tokens.some(
                    (t) =>
                      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
                        t,
                      ) || !Number.isFinite(Number(t)),
                  )
                )
                  throw new Error('请填写有效的自定义数值坐标');
                coordinates = { mode, values: tokens.map(Number) };
              } else if (mode === 'row')
                coordinates = { mode, row: Number(coordinateRow) };
              else coordinates = { mode };
              if (
                props.onApply({
                  panelId: props.panelId,
                  tableId: table.tableId,
                  coordinateColumnId: coordinateId,
                  valueColumnIds: ids,
                  layout,
                  coordinates,
                  startRow: Number(start),
                  endRow: Number(end),
                  colorScale,
                }) === false
              ) {
                setError('生成未完成');
                return;
              }
              props.onClose();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : '无法生成热图');
            }
          }}
        >
          生成热图
        </button>
      </div>
    </>
  );
}
export function MatrixHeatmapDialog(props: Props) {
  const [tableId, setTableId] = useState(
    props.workspace.activeTableId ?? props.workspace.tables[0]?.tableId ?? '',
  );
  const table = props.workspace.tables.find((t) => t.tableId === tableId);
  return (
    <WorkspaceDialog title="矩阵热图" onClose={props.onClose}>
      <div className="batch-y-body">
        <label>
          数据表
          <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            {props.workspace.tables.map((t) => (
              <option key={t.tableId} value={t.tableId}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {table ? (
          <MatrixSelection key={table.tableId} {...props} table={table} />
        ) : (
          <p>请先导入数据。</p>
        )}
      </div>
    </WorkspaceDialog>
  );
}
