import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  plotBindingEntries,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import type { ChangeEvent } from 'react';
import './binding-panel.css';

export type BindingChange = { dataSlotId: string; columnId: string };

type Props = {
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  overrides: Record<string, string>;
  onBindingChange: (change: BindingChange) => void;
  onAddSeries: () => void;
  onDuplicateSeries: (plotSlotId: string) => void;
  onRemoveSeries: (plotSlotId: string) => void;
  onMoveSeries: (plotSlotId: string, direction: 'up' | 'down') => void;
};
function slotBinding(data: DataBindingSet, slotId: string) {
  return data.bindings.find((binding) => binding.dataSlotId === slotId);
}
function slotError(
  slot: FigureTemplate['dataSlots'][number],
  data: DataBindingSet,
  columnId: string,
): string | undefined {
  const binding = slotBinding(data, slot.dataSlotId);
  if (binding?.status === 'invalid') {
    const column = data.columns.find((item) => item.columnId === columnId);
    return `${slot.name} 需要 number 类型的列，当前为 ${column?.valueType ?? '未知'}。`;
  }
  if (!binding) return `${slot.name} 没有自动匹配的列，请选择一个可用列。`;
  return undefined;
}
function SlotSelect({
  slot,
  data,
  seriesLabel,
  selectedId,
  currentColumn,
  bindingValid,
  errorId,
  error,
  onChange,
}: {
  slot: FigureTemplate['dataSlots'][number];
  data: DataBindingSet;
  seriesLabel: string;
  selectedId: string;
  currentColumn: DataBindingSet['columns'][number] | undefined;
  bindingValid: boolean;
  errorId: string;
  error: string | undefined;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  const id = `${slot.dataSlotId}-column`;
  return (
    <>
      <label className="slot-label" htmlFor={id}>
        {seriesLabel} {slot.name} 数据列
      </label>
      <select
        id={id}
        className="slot-select"
        value={selectedId}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
      >
        <option value="">
          自动匹配
          {currentColumn && bindingValid ? `（${currentColumn.name}）` : ''}
        </option>
        {data.columns.map((column) => (
          <option key={column.columnId} value={column.columnId}>
            {column.name} · {column.valueType}
          </option>
        ))}
      </select>
    </>
  );
}

function SlotRow({
  seriesLabel,
  slot,
  data,
  overrides,
  onBindingChange,
}: {
  seriesLabel: string;
  slot: FigureTemplate['dataSlots'][number];
  data: DataBindingSet;
  overrides: Record<string, string>;
  onBindingChange: (change: BindingChange) => void;
}) {
  const binding = slotBinding(data, slot.dataSlotId);
  const selectedId = overrides[slot.dataSlotId] ?? '';
  const currentId = selectedId || binding?.columnId || '';
  const currentColumn = data.columns.find(
    (column) => column.columnId === currentId,
  );
  const error = slotError(slot, data, currentId);
  const errorId = `${slot.dataSlotId}-binding-error`;
  const onChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onBindingChange({
      dataSlotId: slot.dataSlotId,
      columnId: event.target.value,
    });

  return (
    <div className="slot-row">
      <div className="slot-heading">
        <div>
          <strong>{slot.name}</strong>
          <span className="slot-role">
            {slot.role} · {slot.valueType}
          </span>
        </div>
        <span className={error ? 'slot-status invalid' : 'slot-status'}>
          {error ? '需要修复' : '已绑定'}
        </span>
      </div>
      <SlotSelect
        slot={slot}
        data={data}
        seriesLabel={seriesLabel}
        selectedId={selectedId}
        currentColumn={currentColumn}
        bindingValid={binding?.status === 'valid'}
        errorId={errorId}
        error={error}
        onChange={onChange}
      />
      <span className="slot-meta">
        {currentColumn
          ? `${currentColumn.valueType} · ${currentColumn.values.length} 行`
          : '尚未选择数据列'}
      </span>
      {error && (
        <span id={errorId} className="slot-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function SeriesActions({
  plotSlotId,
  seriesLabel,
  index,
  count,
  actions,
}: {
  plotSlotId: string;
  seriesLabel: string;
  index: number;
  count: number;
  actions: SeriesBindingCardProps['actions'];
}) {
  return (
    <div className="series-actions">
      <button
        type="button"
        aria-label={`上移${seriesLabel}`}
        disabled={index === 0}
        onClick={() => actions.onMoveSeries?.(plotSlotId, 'up')}
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={`下移${seriesLabel}`}
        disabled={index === count - 1}
        onClick={() => actions.onMoveSeries?.(plotSlotId, 'down')}
      >
        ↓
      </button>
      <button
        type="button"
        aria-label={`复制${seriesLabel}`}
        onClick={() => actions.onDuplicateSeries?.(plotSlotId)}
      >
        复制
      </button>
      <button
        type="button"
        aria-label={`删除${seriesLabel}`}
        disabled={count === 1}
        onClick={() => actions.onRemoveSeries?.(plotSlotId)}
      >
        删除
      </button>
    </div>
  );
}

type SeriesBindingCardProps = {
  plot: FigureTemplate['panels'][number]['plotSlots'][number];
  index: number;
  count: number;
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  overrides: Record<string, string>;
  onBindingChange: (change: BindingChange) => void;
  actions: {
    onDuplicateSeries: Props['onDuplicateSeries'];
    onRemoveSeries: Props['onRemoveSeries'];
    onMoveSeries: Props['onMoveSeries'];
  };
};

function SeriesBindingCard({
  plot,
  index,
  count,
  template,
  data,
  overrides,
  onBindingChange,
  actions,
}: SeriesBindingCardProps) {
  const seriesLabel = `曲线 ${index + 1}`;
  const slots = plotBindingEntries(plot)
    .map((entry) => entry.slotId)
    .map((slotId) =>
      template.dataSlots.find((slot) => slot.dataSlotId === slotId),
    )
    .filter((slot): slot is FigureTemplate['dataSlots'][number] =>
      Boolean(slot),
    );
  return (
    <fieldset className="series-card" aria-label={`${seriesLabel} 数据绑定`}>
      <legend>{seriesLabel}</legend>
      <SeriesActions
        plotSlotId={plot.plotSlotId}
        seriesLabel={seriesLabel}
        index={index}
        count={count}
        actions={actions}
      />
      {data ? (
        <div className="slot-list">
          {slots.map((slot) => (
            <SlotRow
              key={slot.dataSlotId}
              seriesLabel={seriesLabel}
              slot={slot}
              data={data}
              overrides={overrides}
              onBindingChange={onBindingChange}
            />
          ))}
        </div>
      ) : (
        <p className="empty-copy">导入数据后即可配置 X / Y 数据列。</p>
      )}
    </fieldset>
  );
}

export function BindingPanel({
  template,
  data,
  overrides,
  onBindingChange,
  onAddSeries,
  onDuplicateSeries,
  onRemoveSeries,
  onMoveSeries,
}: Props) {
  const plots = template.panels[0]?.plotSlots ?? [];
  return (
    <section className="card binding-card" aria-label="数据绑定">
      <p className="section-kicker">02 · 数据绑定</p>
      <div className="series-list">
        {plots.map((plot, index) => (
          <SeriesBindingCard
            key={plot.plotSlotId}
            plot={plot}
            index={index}
            count={plots.length}
            template={template}
            data={data}
            overrides={overrides}
            onBindingChange={onBindingChange}
            actions={{ onDuplicateSeries, onRemoveSeries, onMoveSeries }}
          />
        ))}
      </div>
      <button className="add-series" type="button" onClick={onAddSeries}>
        新增曲线
      </button>
    </section>
  );
}
