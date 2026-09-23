import type {
  DataBindingSet,
  DataWorkspace,
  DataTable,
} from '@plot-fig/data-binding';
import {
  plotBindingEntries,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import './binding-panel.css';
import { useId, useRef } from 'react';
import { seriesBindingSummary } from './series-binding-summary.js';
import {
  useSeriesDisclosure,
  type SeriesRevealRequest,
} from './use-series-disclosure.js';

type Plot = FigureTemplate['panels'][number]['plotSlots'][number];
type Props = {
  revealRequest?: SeriesRevealRequest | undefined;
  activePanelId?: string | undefined;
  template: FigureTemplate;
  workspace: DataWorkspace;
  data: DataBindingSet | undefined;
  onTable: (plotSlotId: string, tableId: string) => void;
  onColumn: (slotId: string, tableId: string, columnId: string) => void;
  onName: (plotSlotId: string, name: string) => void;
  onSeries: (
    action: 'add' | 'duplicate' | 'remove' | 'up' | 'down',
    plotSlotId?: string,
  ) => void;
};
function ColumnOptions({ table }: { table: DataTable }) {
  return table.columns.map((column) => (
    <option key={column.columnId} value={column.columnId}>
      {column.name}
      {column.settings.unit ? ` · ${column.settings.unit}` : ''}
    </option>
  ));
}
function SlotSelect({
  slotId,
  table,
  label,
  props,
}: {
  slotId: string;
  table: DataTable;
  label: string;
  props: Props;
}) {
  const slot = props.template.dataSlots.find((s) => s.dataSlotId === slotId)!;
  const binding = props.data?.bindings.find((b) => b.dataSlotId === slotId);
  const ref = props.workspace.slotBindings[slotId];
  const column = table.columns.find((c) => c.columnId === ref?.columnId);
  const error =
    binding?.status !== 'valid' && (slot.required || Boolean(ref))
      ? `${slot.name} ${slot.role === 'category' ? '需要数值、类别或文本列' : slot.role === 'group' || slot.role === 'split' ? '需要类别或文本列' : '需要 number 类型的列'}${slot.role === 'x' ? '（XY/Area 也可选择日期）' : ''}，当前为 ${column?.settings.type ?? '未绑定'}。`
      : '';
  const id = `${slotId}-workspace-column`,
    errorId = `${id}-error`;
  return (
    <div className="slot-row">
      <label htmlFor={id}>
        {label} {slot.name} 数据列
      </label>
      <select
        id={id}
        value={ref?.columnId ?? (slot.required ? '' : '__none__')}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => props.onColumn(slotId, table.tableId, e.target.value)}
      >
        {!slot.required && (
          <option value="__none__">
            {slot.role === 'group'
              ? '不分组'
              : slot.role === 'split'
                ? '不分裂'
                : '不绑定'}
          </option>
        )}
        <option value="">自动匹配</option>
        <ColumnOptions table={table} />
      </select>
      {column && ['date', 'datetime'].includes(column.settings.type) && (
        <span className="workspace-hint">X 使用 UTC 时间戳（毫秒）</span>
      )}
      {error && (
        <span id={errorId} className="slot-error">
          {error}
        </span>
      )}
    </div>
  );
}
function SeriesButtons({
  plot,
  index,
  count,
  props,
}: {
  plot: Plot;
  index: number;
  count: number;
  props: Props;
}) {
  const label = `曲线 ${index + 1}`;
  return (
    <div className="series-actions">
      <button
        type="button"
        aria-label={`上移${label}`}
        disabled={index === 0}
        onClick={() => props.onSeries('up', plot.plotSlotId)}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`下移${label}`}
        disabled={index === count - 1}
        onClick={() => props.onSeries('down', plot.plotSlotId)}
      >
        ↓
      </button>
      <button
        type="button"
        aria-label={`复制${label}`}
        onClick={() => props.onSeries('duplicate', plot.plotSlotId)}
      >
        复制
      </button>
      <button
        type="button"
        aria-label={`删除${label}`}
        disabled={count === 1}
        onClick={() => props.onSeries('remove', plot.plotSlotId)}
      >
        删除
      </button>
    </div>
  );
}
function SeriesTableSelect({
  label,
  tableId,
  plot,
  props,
  errorId,
}: {
  label: string;
  tableId: string;
  plot: Plot;
  props: Props;
  errorId: string;
}) {
  return (
    <label>
      {label} 数据表
      <select
        value={tableId}
        aria-invalid={!tableId}
        aria-describedby={!tableId ? errorId : undefined}
        onChange={(e) => props.onTable(plot.plotSlotId, e.target.value)}
      >
        <option value="">未选择数据表</option>
        {props.workspace.tables.map((table) => (
          <option key={table.tableId} value={table.tableId}>
            {table.name} · {table.source.kind.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
function SeriesCard({
  plot,
  index,
  props,
  count,
  expanded,
  onToggle,
}: {
  plot: Plot;
  index: number;
  props: Props;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const editorId = useId();
  const nameEdited = useRef(false);
  const entries = plotBindingEntries(plot);
  const tableId =
    entries
      .map((e) => props.workspace.slotBindings[e.slotId]?.tableId)
      .find(Boolean) ?? '';
  const table = props.workspace.tables.find((t) => t.tableId === tableId);
  const label = `曲线 ${index + 1}`;
  const summary = seriesBindingSummary(
    plot,
    props.template,
    props.workspace,
    props.data,
  );
  return (
    <div
      className="series-card"
      role="group"
      aria-label={`${label} 数据绑定`}
      data-series-id={plot.plotSlotId}
    >
      <button
        type="button"
        className="series-summary"
        aria-label={`${expanded ? '收起' : '展开'}${label} 数据绑定`}
        aria-expanded={expanded}
        aria-controls={editorId}
        onClick={onToggle}
      >
        <span
          className="series-color"
          style={{ backgroundColor: summary.color }}
          aria-hidden="true"
        />
        <span className="series-summary-text">
          <span className="series-summary-title">
            <strong>{label}</strong>
            <span className="series-name" title={summary.name}>
              {summary.name}
            </span>
            {summary.invalid && (
              <span className="series-binding-error">待绑定</span>
            )}
          </span>
          <span className="series-binding-summary">{summary.text}</span>
        </span>
        <span className="series-chevron" aria-hidden="true">
          ›
        </span>
      </button>
      <div id={editorId} className="series-editor" hidden={!expanded}>
        {expanded && (
          <>
            <div className="series-name-field">
              <label htmlFor={`${editorId}-name`}>{label} 名称</label>
              <input
                key={plot.legendEntry.text}
                id={`${editorId}-name`}
                type="text"
                name={`curve-name-${plot.plotSlotId}`}
                defaultValue={plot.legendEntry.text}
                maxLength={1024}
                autoComplete="off"
                placeholder="输入曲线名称…"
                aria-describedby={`${editorId}-name-help`}
                onFocus={() => {
                  nameEdited.current = false;
                }}
                onChange={() => {
                  nameEdited.current = true;
                }}
                onBlur={(event) => {
                  // 保留旧项目中的多行图例，单纯聚焦和离开不应改写原文。
                  if (!nameEdited.current) return;
                  nameEdited.current = false;
                  const value = event.currentTarget.value.trim();
                  event.currentTarget.value = value;
                  if (value !== plot.legendEntry.text)
                    props.onName(plot.plotSlotId, value);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    nameEdited.current = false;
                    event.currentTarget.value = plot.legendEntry.text;
                    event.currentTarget.blur();
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
              <span id={`${editorId}-name-help`} className="workspace-hint">
                用于图例，应用修改后更新图形。
              </span>
            </div>
            <SeriesTableSelect
              label={label}
              tableId={tableId}
              plot={plot}
              props={props}
              errorId={`${editorId}-error`}
            />
            {table ? (
              <div className="slot-list">
                {entries.map(({ slotId }) => (
                  <SlotSelect
                    key={slotId}
                    slotId={slotId}
                    label={label}
                    table={table}
                    props={props}
                  />
                ))}
              </div>
            ) : (
              <p id={`${editorId}-error`} className="empty-copy">
                选择数据表后绑定图表所需的数据列。
              </p>
            )}
            <SeriesButtons
              plot={plot}
              index={index}
              count={count}
              props={props}
            />
          </>
        )}
      </div>
    </div>
  );
}
export function WorkspaceBindingPanel(props: Props) {
  const panel =
    props.template.panels.find(
      (item) => item.panelId === props.activePanelId,
    ) ?? props.template.panels[0]!;
  const plots = panel.plotSlots;
  const disclosure = useSeriesDisclosure(
    panel.panelId,
    plots.map((plot) => plot.plotSlotId),
    props.revealRequest,
  );
  const invalid = plots.filter(
    (plot) =>
      seriesBindingSummary(plot, props.template, props.workspace, props.data)
        .invalid,
  ).length;
  const activeIndex = plots.findIndex(
    (plot) => plot.plotSlotId === disclosure.expanded,
  );
  return (
    <section
      className="card binding-card binding-accordion"
      aria-label="数据绑定"
    >
      <div className="binding-panel-heading">
        <div>
          <h2>
            数据绑定 <span>{plots.length}</span>
          </h2>
          <p className="workspace-hint">
            {plots.length - invalid} 条已绑定
            {invalid > 0 && ` · ${invalid} 条待补充`}
          </p>
        </div>
        <button
          type="button"
          className="add-series"
          onClick={() => props.onSeries('add')}
        >
          新增曲线
        </button>
      </div>
      {props.template.panels.length > 1 && (
        <p className="binding-active-layer">
          <span>当前图层</span>
          <strong
            title={
              panel.name ?? `图层 ${props.template.panels.indexOf(panel) + 1}`
            }
          >
            {panel.name ?? `图层 ${props.template.panels.indexOf(panel) + 1}`}
          </strong>
        </p>
      )}
      <div className="series-list" ref={disclosure.listRef}>
        {plots.map((plot, index) => (
          <SeriesCard
            key={plot.plotSlotId}
            plot={plot}
            index={index}
            props={props}
            count={plots.length}
            expanded={disclosure.expanded === plot.plotSlotId}
            onToggle={() => disclosure.toggle(plot.plotSlotId)}
          />
        ))}
      </div>
      <div className="binding-panel-footer">
        <span>
          {activeIndex >= 0
            ? `当前编辑：曲线 ${activeIndex + 1}`
            : plots.length
              ? '选择曲线以编辑'
              : '点击「新增曲线」开始'}
        </span>
        <span>{plots.length} 条曲线</span>
      </div>
    </section>
  );
}
