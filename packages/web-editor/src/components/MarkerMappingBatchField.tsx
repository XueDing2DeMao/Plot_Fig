import { useRef } from 'react';
import type { MarkerMapping, MarkerOverrides } from '@plot-fig/figure-schema';
import type { BatchField } from '../state/batch-property-fields.js';
import { MarkerMappingFields } from './MarkerMappingFields.js';
import { PropertyNumberDraftContext } from './PropertyInputs.js';

export function MarkerMappingBatchField({
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
  const mixed = text === undefined && common.mixed;
  const draft = text
    ? JSON.parse(text)
    : {
        value: text === undefined && !mixed ? common.value : undefined,
        texts: {},
      };
  texts.current = draft.texts ?? {};
  const key = field.key as keyof MarkerMapping;
  return (
    <fieldset className="batch-field" disabled={disabled}>
      <legend>{field.label}</legend>
      {mixed && <p>多个值，修改后将统一所选曲线的此项规则。</p>}
      {field.type === 'marker-mapping' ? (
        <>
          <p className="property-hint">
            保留各条曲线的数据列。请先在曲线的“符号映射”页选择所需列。
          </p>
          <PropertyNumberDraftContext.Provider
            value={{
              texts: texts.current,
              setText: (label, raw) => {
                texts.current = { ...texts.current, [label]: raw };
              },
            }}
          >
            <MarkerMappingFields
              value={{
                mapping: draft.value ? { [key]: draft.value } : {},
                columns: {},
              }}
              properties={[key]}
              showColumns={false}
              columns={[]}
              onChange={(next) =>
                onChange(
                  next.mapping[key]
                    ? JSON.stringify({
                        value: next.mapping[key],
                        texts: texts.current,
                      })
                    : '',
                )
              }
            />
          </PropertyNumberDraftContext.Provider>
        </>
      ) : (
        <>
          <p>
            已设置{' '}
            {(common.value as MarkerOverrides | undefined)?.points.length ?? 0}{' '}
            个点。使用“复制属性”可复制至同源 XY
            曲线；单独编辑请使用“单点样式”页。
          </p>
          <button type="button" onClick={() => onChange('')}>
            清除所选曲线单点覆盖
          </button>
        </>
      )}
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
