import type { BatchField } from '../state/batch-property-fields.js';
import {
  dataViewBatchDraft,
  type DataViewKind,
  type DataViewDraft,
} from './data-view-batch-draft.js';
export function DataViewBatchField({
  field,
  common,
  text,
  disabled,
  onChange,
  onReset,
}: {
  field: BatchField;
  common: { mixed: boolean; value?: unknown };
  text: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}) {
  const kind = field.type as DataViewKind,
    mixed = text === undefined && common.mixed;
  const d: DataViewDraft = text
    ? JSON.parse(text)
    : dataViewBatchDraft(kind, mixed ? undefined : common.value);
  const update = (patch: DataViewDraft) =>
    onChange(JSON.stringify({ ...d, ...patch }));
  const number = (key: string, label: string) => (
    <label>
      {label}
      <input
        type="text"
        role="spinbutton"
        inputMode="numeric"
        disabled={disabled}
        value={d[key] ?? ''}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </label>
  );
  return (
    <fieldset className="batch-field">
      <legend>{field.label}</legend>
      <label>
        {field.label}
        <select
          disabled={disabled}
          value={mixed ? '__mixed' : d.mode}
          onChange={(e) =>
            update({
              mode: e.target.value,
              ...(kind === 'series-sampling'
                ? { amount: e.target.value === 'count' ? '100' : '2' }
                : {}),
            })
          }
        >
          {mixed && (
            <option disabled value="__mixed">
              多个值
            </option>
          )}
          <option value="none">
            {kind === 'row-range' ? '全部数据行' : '不抽样'}
          </option>
          {kind === 'row-range' ? (
            <option value="range">指定行范围</option>
          ) : (
            <>
              <option value="every">每隔若干点</option>
              <option value="count">按总点数</option>
            </>
          )}
        </select>
      </label>
      {!mixed &&
        d.mode !== 'none' &&
        (kind === 'row-range' ? (
          <>
            {number('from', '起始数据行')}
            {number('to', '结束数据行')}
          </>
        ) : (
          <>
            {number('amount', d.mode === 'every' ? '抽样步长' : '抽样总点数')}
            {(['keepFirst', 'keepLast'] as const).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={d[key] === 'true'}
                  onChange={(e) => update({ [key]: String(e.target.checked) })}
                />
                {key === 'keepFirst' ? '保留每段首点' : '保留每段尾点'}
              </label>
            ))}
          </>
        ))}
      <p className="property-hint">
        {kind === 'row-range'
          ? '起止行按原始数据区计数，整体应用。'
          : '点数和端点设置整体应用，抽样不参与计算。'}
      </p>
      {text !== undefined && (
        <button
          type="button"
          className="property-auto"
          aria-label={'保留各自值：' + field.label}
          onClick={onReset}
        >
          保留各自值
        </button>
      )}
    </fieldset>
  );
}
