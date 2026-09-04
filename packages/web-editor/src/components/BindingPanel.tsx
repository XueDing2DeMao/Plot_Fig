import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { ChangeEvent } from 'react';
import './binding-panel.css';

export type BindingChange = { dataSlotId: string; columnId: string };

type Props = {
  template: FigureTemplate;
  data: DataBindingSet | undefined;
  overrides: Record<string, string>;
  onBindingChange: (change: BindingChange) => void;
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
  if (!binding)
    return `${slot.name} 没有自动匹配的列，请选择一个可用列。`;
  return undefined;
}

function SlotRow({
  slot,
  data,
  overrides,
  onBindingChange,
}: {
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
      <label className="slot-label" htmlFor={`${slot.dataSlotId}-column`}>
        {slot.name} 数据列
      </label>
      <select
        id={`${slot.dataSlotId}-column`}
        className="slot-select"
        value={selectedId}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : undefined}
        onChange={onChange}
      >
        <option value="">
          自动匹配
          {currentColumn && binding?.status === 'valid'
            ? `（${currentColumn.name}）`
            : ''}
        </option>
        {data.columns.map((column) => (
          <option key={column.columnId} value={column.columnId}>
            {column.name} · {column.valueType}
          </option>
        ))}
      </select>
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

export function BindingPanel({
  template,
  data,
  overrides,
  onBindingChange,
}: Props) {
  return (
    <section className="card binding-card" aria-label="数据绑定">
      <p className="section-kicker">02 · 数据绑定</p>
      {data ? (
        <div className="slot-list">
          {template.dataSlots.map((slot) => (
            <SlotRow
              key={slot.dataSlotId}
              slot={slot}
              data={data}
              overrides={overrides}
              onBindingChange={onBindingChange}
            />
          ))}
        </div>
      ) : (
        <p className="empty-copy">选择文件后，这里会显示图形需要的数据角色。</p>
      )}
    </section>
  );
}
