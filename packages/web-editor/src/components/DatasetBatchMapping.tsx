import { useEffect, useState } from 'react';
import {
  hasMultipleBatchSources,
  inspectBatchColumns,
} from '../batch/column-mapping.js';
import { batchXYTemplate } from '../batch/xy-template.js';
import type { DatasetBatchState } from './useDatasetBatch.js';

export function DatasetBatchMapping({ state }: { state: DatasetBatchState }) {
  const [selected, setSelected] = useState('');
  const [open, setOpen] = useState(false);
  const pending = state.preflight.filter((entry) => entry.error);
  const attentionKey = pending.length ? JSON.stringify(pending) : '';
  useEffect(() => {
    if (attentionKey) setOpen(true);
  }, [attentionKey]);
  const item =
    state.items.find((i) => i.id === selected) ??
    state.items.find((i) => i.id === pending[0]?.id) ??
    state.items[0];
  if (!item) return null;
  const table = state.base.workspace.tables.find((t) => t.tableId === item.id);
  const workspace = {
    tables: table ? [table] : [],
    slotBindings: {},
    activeTableId: item.id,
  };
  const sourceTemplate = state.full ? state.chosen! : state.base.template;
  const overrides = state.mappings[item.id] ?? {};
  const autoXY = state.autoXY;
  const multipleSources =
    sourceTemplate === state.base.template &&
    hasMultipleBatchSources(sourceTemplate, state.base.workspace);
  const template = batchXYTemplate(
    sourceTemplate,
    workspace,
    state.names,
    overrides,
    autoXY && !multipleSources,
  );
  const rows = inspectBatchColumns(
    template,
    workspace,
    state.names,
    overrides,
    state.full,
    autoXY && !multipleSources,
  );
  const columns = workspace.tables.flatMap((t) =>
    t.columns.map((c) => ({
      ref: { tableId: t.tableId, columnId: c.columnId },
      label: `${t.name} / ${c.name} [第 ${c.index + 1} 列，${c.settings.type}]`,
    })),
  );
  return (
    <fieldset className="publication-fields">
      <legend>列映射</legend>
      <label className="property-check">
        <input
          type="checkbox"
          checked={state.autoXY}
          onChange={(e) => state.setAutoXY(e.target.checked)}
        />
        自动识别两列 XY
      </label>
      <details
        className="dataset-batch-settings-details"
        aria-label="手动列映射"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary>
          <span>检查与调整列映射</span>
          <span
            className={`dataset-batch-setting-summary${pending.length ? ' dataset-batch-error' : ''}`}
          >
            {pending.length
              ? `${pending.length} 项待配置`
              : `${state.items.length} 项可运行`}
          </span>
        </summary>
        <div className="dataset-batch-settings-content">
          <label className="dataset-batch-field-row">
            映射项目
            <select
              value={item.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {state.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                  {pending.some((entry) => entry.id === i.id)
                    ? '（待配置）'
                    : ''}
                </option>
              ))}
            </select>
          </label>
          {item.error && <p role="alert">{item.error}</p>}
          {template !== sourceTemplate && (
            <p>
              此表只有两列，已自动简化为一条曲线，沿用原图第一条曲线的样式。
            </p>
          )}
          {rows.map(({ slot, ref, error }) => (
            <label key={slot.dataSlotId}>
              {slot.name} · {slot.role}
              {slot.required ? '（必需）' : '（可选）'}
              <select
                aria-label={`映射 ${slot.name} (${slot.role})`}
                value={
                  Object.hasOwn(overrides, slot.dataSlotId)
                    ? overrides[slot.dataSlotId]
                      ? JSON.stringify(overrides[slot.dataSlotId])
                      : 'none'
                    : 'auto'
                }
                onChange={(e) => {
                  const next = { ...overrides };
                  if (e.target.value === 'auto') delete next[slot.dataSlotId];
                  else
                    next[slot.dataSlotId] =
                      e.target.value === 'none'
                        ? null
                        : JSON.parse(e.target.value);
                  state.setMappings({ ...state.mappings, [item.id]: next });
                }}
              >
                <option value="auto">
                  自动匹配
                  {ref
                    ? `：${columns.find((c) => JSON.stringify(c.ref) === JSON.stringify(ref))?.label}`
                    : '（未匹配）'}
                </option>
                <option value="none">不绑定</option>
                {columns.map((c) => (
                  <option
                    key={JSON.stringify(c.ref)}
                    value={JSON.stringify(c.ref)}
                  >
                    {c.label}
                  </option>
                ))}
              </select>
              {error && <small className="dataset-batch-error">{error}</small>}
            </label>
          ))}
          <details className="dataset-batch-help">
            <summary>列匹配规则</summary>
            <p>
              {autoXY
                ? '优先使用手动选择和同名列；两列表可识别 X/Y 表头，否则按第一列 X、第二列 Y。适用于单图层 XY 图；重复列名和类型不兼容仍需手动调整。'
                : '按完整列名匹配；重复列和跨表同名列需要显式选择。'}
              修改只用于当前批次。
            </p>
          </details>
        </div>
      </details>
    </fieldset>
  );
}
