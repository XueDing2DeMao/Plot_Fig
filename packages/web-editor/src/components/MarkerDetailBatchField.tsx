import { useRef } from 'react';
import type { MarkerDetails } from '@plot-fig/figure-schema';
import type { BatchField } from '../state/batch-property-fields.js';
import { MarkerDetailFields } from './MarkerDetailFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
export function MarkerDetailBatchField({
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
  onChange: (text: string) => void;
  onReset: () => void;
}) {
  const texts = useRef<Record<string, string>>({});
  const mixed = text === undefined && common.mixed,
    draft = text
      ? JSON.parse(text)
      : {
          value: text === undefined && !mixed ? common.value : undefined,
          texts: {},
        };
  texts.current = draft.texts ?? {};
  const key = field.key as keyof MarkerDetails;
  return (
    <fieldset className="batch-field" disabled={disabled}>
      <legend>{field.label}</legend>
      {mixed && <p>多个值，修改后统一所选曲线的此项设置。</p>}
      <PropertyNumberDraftContext.Provider
        value={{
          texts: texts.current,
          setText: (label, raw) => {
            texts.current = { ...texts.current, [label]: raw };
          },
        }}
      >
        <MarkerDetailFields
          properties={[key]}
          value={draft.value === undefined ? {} : { [key]: draft.value }}
          onChange={(next) =>
            onChange(
              next[key] === undefined
                ? ''
                : JSON.stringify({ value: next[key], texts: texts.current }),
            )
          }
        />
      </PropertyNumberDraftContext.Provider>
      {text !== undefined && (
        <button
          type="button"
          aria-label={'保留各自值：' + field.label}
          onClick={onReset}
        >
          保留各自值
        </button>
      )}
    </fieldset>
  );
}
