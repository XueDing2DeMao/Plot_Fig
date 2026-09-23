import { useRef } from 'react';
import type { PlotSlot } from '@plot-fig/figure-schema';
import type { BatchField } from '../state/batch-property-fields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';
import { LineMappingFields } from './LineMappingFields.js';
import { DataLabelFields } from './DataLabelFields.js';
import { ErrorDetailFields } from './ErrorDetailFields.js';
import { SubsetFields } from './SubsetFields.js';
import {
  CurveTransformFields,
  PanelStackFields,
} from './CurveTransformFields.js';
import { CurveGroupFields } from './CurveGroupFields.js';
export function F4BatchField({
  field,
  common,
  text,
  disabled,
  onChange,
  onReset,
  plots = [],
}: {
  field: BatchField;
  common: { mixed: boolean; value?: unknown };
  text: string | undefined;
  disabled: boolean;
  onChange: (text: string) => void;
  onReset: () => void;
  plots?: readonly PlotSlot[] | undefined;
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
  const update = (value: unknown) =>
    onChange(
      value === undefined
        ? ''
        : JSON.stringify({ value, texts: texts.current }),
    );
  return (
    <fieldset className="batch-field" disabled={disabled}>
      <legend>{field.label}</legend>
      {mixed && <p>多个值；修改后统一所选对象的此项设置。</p>}
      <p className="property-hint">
        数据列由各曲线单独绑定。组和堆叠成员按目标图层的曲线顺序对应。
      </p>
      <PropertyNumberDraftContext.Provider
        value={{
          texts: texts.current,
          setText: (label, raw) => {
            texts.current = { ...texts.current, [label]: raw };
          },
        }}
      >
        {field.key === 'lineMapping' && (
          <LineMappingFields value={draft.value} onChange={update} />
        )}
        {field.key === 'dataLabels' && (
          <DataLabelFields value={draft.value} onChange={update} />
        )}
        {field.key === 'errorDetails' && (
          <ErrorDetailFields
            value={draft.value ?? {}}
            directions={plots[0]?.kind === 'bar' ? ['value'] : ['x', 'y']}
            onChange={(v) => update(Object.keys(v).length ? v : undefined)}
          />
        )}
        {field.key === 'subset' && (
          <SubsetFields value={draft.value} onChange={update} />
        )}
        {field.key === 'transform' && (
          <CurveTransformFields
            value={draft.value}
            plots={plots}
            onChange={update}
          />
        )}
        {field.key === 'groups' && (
          <CurveGroupFields
            value={draft.value}
            plots={plots}
            onChange={update}
          />
        )}
        {field.key === 'stack' && (
          <PanelStackFields
            value={draft.value}
            plots={plots}
            onChange={update}
          />
        )}
        {field.key === 'labelOverrides' && (
          <>
            <p>
              使用“应用于…”复制到同源曲线，单点文字和位置在“数据标签”页编辑。
            </p>
            <button type="button" onClick={() => update(undefined)}>
              清除所选标签单点覆盖
            </button>
          </>
        )}
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
