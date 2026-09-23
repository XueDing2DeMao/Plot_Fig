import { useRef } from 'react';
import type {
  Axis,
  AxisAdvanced,
  FigureTemplate,
} from '@plot-fig/figure-schema';
import {
  AxisAdvancedFields,
  AxisScaleOptionFields,
} from './AxisAdvancedFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import type { BatchField } from '../state/batch-property-fields.js';
export function F5BatchField({
  field,
  common,
  text,
  disabled,
  onChange,
  onReset,
  template,
  axis,
}: {
  field: BatchField;
  common: { mixed: boolean; value?: unknown };
  text: string | undefined;
  disabled: boolean;
  onChange: (text: string) => void;
  onReset: () => void;
  template?: FigureTemplate | undefined;
  axis?: Axis | undefined;
}) {
  const texts = useRef<Record<string, string>>({}),
    paths = useRef<Record<string, string[]>>({}),
    pending = useRef<string | undefined>(undefined),
    mixed = text === undefined && common.mixed;
  const draft = text
    ? JSON.parse(text)
    : {
        value: text === undefined && !mixed ? common.value : undefined,
        texts: {},
      };
  texts.current = draft.texts ?? {};
  paths.current = draft.paths ?? {};
  const update = (value: unknown) => {
    for (const [label, path] of Object.entries(paths.current)) {
      if (label === pending.current) continue;
      let old = draft.value,
        next = value,
        changed = false;
      for (const part of path) {
        if (
          Array.isArray(old) &&
          Array.isArray(next) &&
          old.length !== next.length
        )
          changed = true;
        old = old?.[part];
        next =
          next && typeof next === 'object'
            ? (next as Record<string, unknown>)[part]
            : undefined;
      }
      if (changed || JSON.stringify(old) !== JSON.stringify(next)) {
        delete texts.current[label];
        delete paths.current[label];
      }
    }
    pending.current = undefined;
    onChange(
      value === undefined
        ? ''
        : JSON.stringify({ value, texts: texts.current, paths: paths.current }),
    );
  };
  const key = field.key as keyof AxisAdvanced;
  return (
    <fieldset className="batch-field" disabled={disabled}>
      <legend>{field.label}</legend>
      {mixed && <p>多个值；修改后统一所选轴的此项设置。</p>}
      <PropertyNumberDraftContext.Provider
        value={{
          texts: texts.current,
          setText: (label, raw, path) => {
            texts.current = { ...texts.current, [label]: raw };
            paths.current = {
              ...paths.current,
              [label]: (path ?? []).slice(field.key === 'scaleOptions' ? 2 : 3),
            };
            pending.current = label;
          },
        }}
      >
        {field.key === 'scaleOptions' ? (
          <AxisScaleOptionFields value={draft.value} onChange={update} />
        ) : (
          <AxisAdvancedFields
            features={[key]}
            value={
              draft.value === undefined ? undefined : { [key]: draft.value }
            }
            onChange={(value) => update(value?.[key])}
            template={template}
            axis={axis}
          />
        )}
      </PropertyNumberDraftContext.Provider>
      <button type="button" onClick={() => update(undefined)}>
        清除此项设置
      </button>
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
