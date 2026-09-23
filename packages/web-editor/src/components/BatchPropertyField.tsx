import type { BatchField } from '../state/batch-property-fields.js';
import type { PlotSlot, Axis, FigureTemplate } from '@plot-fig/figure-schema';
import { F5BatchField } from './F5BatchField.js';
import { F4BatchField } from './F4BatchField.js';
import { DataViewBatchField } from './DataViewBatchField.js';
import { LineExtrasBatchField } from './LineExtrasBatchField.js';
import { MarkerShapeBatchField } from './MarkerShapeBatchField.js';
import { MarkerMappingBatchField } from './MarkerMappingBatchField.js';
import { MarkerDetailBatchField } from './MarkerDetailBatchField.js';
import { batchFieldText, customDashDraft } from './batch-field-drafts.js';

export function BatchPropertyField({
  field,
  common,
  text,
  onChange,
  onReset,
  disabled,
  plots,
  template,
  axis,
}: {
  field: BatchField;
  common: { mixed: boolean; value?: unknown };
  text: string | undefined;
  onChange: (value: string) => void;
  onReset: () => void;
  disabled: boolean;
  plots?: readonly PlotSlot[] | undefined;
  template?: FigureTemplate | undefined;
  axis?: Axis | undefined;
}) {
  const mixed = text === undefined && common.mixed;
  if (field.type === 'f5-object')
    return (
      <F5BatchField
        {...{
          field,
          common,
          text,
          disabled,
          onChange,
          onReset,
          template,
          axis,
        }}
      />
    );
  if (field.type === 'f4-object')
    return (
      <F4BatchField
        {...{ field, common, text, disabled, onChange, onReset, plots }}
      />
    );
  if (field.type === 'marker-details')
    return (
      <MarkerDetailBatchField
        {...{ field, common, text, disabled, onChange, onReset }}
      />
    );
  if (field.type === 'marker-mapping' || field.type === 'point-overrides')
    return (
      <MarkerMappingBatchField
        {...{ field, common, text, disabled, onChange, onReset }}
      />
    );
  if (field.type === 'row-range' || field.type === 'series-sampling')
    return (
      <DataViewBatchField
        {...{ field, common, text, disabled, onChange, onReset }}
      />
    );
  if (field.type === 'marker-shape')
    return (
      <MarkerShapeBatchField
        {...{ field, common, text, disabled, onChange, onReset }}
      />
    );
  if (field.type === 'curve-arrows' || field.type === 'drop-line')
    return (
      <LineExtrasBatchField
        {...{ field, common, text, disabled, onChange, onReset }}
      />
    );
  const value = text ?? batchFieldText(field, common.value);
  const numeric = field.type === 'number' || field.type === 'opacity';
  if (field.type === 'custom-dash') {
    const draft =
      text !== undefined
        ? text
          ? (JSON.parse(text) as ReturnType<typeof customDashDraft>)
          : customDashDraft(undefined)
        : customDashDraft(mixed ? undefined : common.value);
    return (
      <fieldset className="batch-field">
        <legend>{field.label}</legend>
        <label>
          虚线序列 (pt)
          <input
            type="text"
            disabled={disabled}
            value={draft.pattern}
            placeholder={mixed ? '多个值，请填写完整序列' : '预设线型'}
            onChange={(event) =>
              onChange(
                JSON.stringify({ ...draft, pattern: event.target.value }),
              )
            }
          />
        </label>
        <label>
          虚线偏移 (pt)
          <input
            type="text"
            role="spinbutton"
            inputMode="decimal"
            disabled={disabled}
            value={draft.offset}
            placeholder={mixed ? '多个值' : '0'}
            onChange={(event) =>
              onChange(JSON.stringify({ ...draft, offset: event.target.value }))
            }
          />
        </label>
        <p className="property-hint">
          序列与偏移整体应用。序列需 2–16 个数，线段、间隔交替填写。
        </p>
        <button
          type="button"
          className="property-auto"
          disabled={disabled}
          onClick={() => onChange('')}
        >
          清除自定义虚线
        </button>
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
  const options =
    field.type === 'boolean' ? { true: '是', false: '否' } : field.options;
  return (
    <div className="batch-field">
      <label>
        {field.label}
        {options ? (
          <select
            disabled={disabled}
            value={mixed ? '__mixed' : value}
            onChange={(e) => onChange(e.target.value)}
          >
            {mixed && (
              <option value="__mixed" disabled>
                多个值
              </option>
            )}
            {field.optional && <option value="">默认</option>}
            {Object.entries(options).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            disabled={disabled}
            inputMode={numeric ? 'decimal' : undefined}
            role={numeric ? 'spinbutton' : undefined}
            value={mixed ? '' : value}
            placeholder={mixed ? '多个值' : field.optional ? '默认' : undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </label>
      {text !== undefined && (
        <button
          className="property-auto"
          type="button"
          aria-label={'保留各自值：' + field.label}
          onClick={onReset}
        >
          保留各自值
        </button>
      )}
    </div>
  );
}
