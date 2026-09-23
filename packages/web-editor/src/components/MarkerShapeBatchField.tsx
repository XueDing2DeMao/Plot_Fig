import type { BatchField } from '../state/batch-property-fields.js';
import { markerShapeOptions } from '../state/marker-shape-options.js';
import { markerShapeDraft } from './marker-shape-draft.js';

export function MarkerShapeBatchField({
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
  const mixed = text === undefined && common.mixed;
  const draft =
    text === undefined
      ? markerShapeDraft(mixed ? undefined : common.value)
      : (JSON.parse(text) as ReturnType<typeof markerShapeDraft>);
  return (
    <fieldset className="batch-field">
      <legend>{field.label}</legend>
      <label>
        符号形状
        <select
          disabled={disabled}
          value={mixed ? '__mixed' : draft.shape}
          onChange={(event) => {
            const shape = event.target.value;
            onChange(
              JSON.stringify({
                shape,
                vertices:
                  shape === 'custom'
                    ? draft.vertices || '0, -1\n1, 1\n-1, 1'
                    : '',
              }),
            );
          }}
        >
          {mixed && (
            <option value="__mixed" disabled>
              多个值
            </option>
          )}
          {Object.entries(markerShapeOptions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {!mixed && draft.shape === 'custom' && (
        <>
          <label>
            自定义符号顶点
            <textarea
              rows={5}
              disabled={disabled}
              value={draft.vertices}
              onChange={(event) =>
                onChange(
                  JSON.stringify({ ...draft, vertices: event.target.value }),
                )
              }
            />
          </label>
          <p className="property-hint">
            每行填写一对坐标，范围 -1 至 1，共 3–64 点。形状和顶点整体应用。
          </p>
        </>
      )}
      {text !== undefined && (
        <button
          type="button"
          className="property-auto"
          disabled={disabled}
          aria-label={'保留各自值：' + field.label}
          onClick={onReset}
        >
          保留各自值
        </button>
      )}
    </fieldset>
  );
}
