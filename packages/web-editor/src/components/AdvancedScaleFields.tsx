import { useContext } from 'react';
import { SymLogValueFields } from './SymLogValueFields.js';
import type {
  NumericScaleKind,
  NumericScaleSpec,
} from '../../../svg-renderer/src/advanced-scale.js';
import type { NumericTickOptions } from '../../../svg-renderer/src/advanced-scale-ticks.js';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';
export type AdvancedScaleFieldsProps = {
  value: NumericScaleSpec;
  onChange: (value: NumericScaleSpec) => void;
  ticks: NumericTickOptions;
  onTicksChange: (value: NumericTickOptions) => void;
};
export function AdvancedScaleFields({
  value,
  onChange,
  ticks,
  onTicksChange,
}: AdvancedScaleFieldsProps) {
  const draft = useContext(PropertyNumberDraftContext);
  const generation = ticks.major;
  const changeKind = (kind: NumericScaleKind) => {
    onChange(kind === 'linear' ? { kind } : { ...value, kind });
    if (
      kind === 'linear' ||
      (kind !== 'log10' && ticks.logPolicy === 'origin-log10')
    )
      onTicksChange({ ...ticks, logPolicy: 'legacy' });
  };
  const changeSym = (enabled: boolean) => {
    if (enabled) {
      draft?.setText('线性范围阈值', '1');
      draft?.setText('线性段长度', '1');
      onChange({ ...value, symLog: { threshold: 1, linearLength: 1 } });
      onTicksChange({ ...ticks, logPolicy: 'legacy' });
    } else {
      const next = { ...value };
      delete next.symLog;
      onChange(next);
    }
  };
  return (
    <>
      <fieldset className="property-group">
        <legend>尺度</legend>
        <PropertySelect
          label="数值尺度"
          value={String(value.kind)}
          options={{ linear: '线性', log10: 'Log10', ln: 'Ln', log2: 'Log2' }}
          onChange={(kind) => changeKind(kind as NumericScaleKind)}
        />
        {value.kind !== 'linear' ? (
          <PropertyCheck
            label="对称对数（SymLog）"
            checked={!!value.symLog}
            onChange={changeSym}
          />
        ) : null}
        {value.symLog ? (
          <SymLogValueFields
            value={value.symLog}
            onChange={(symLog) => onChange({ ...value, symLog })}
          />
        ) : null}
      </fieldset>
      <fieldset className="property-group">
        <legend>主次刻度</legend>
        <PropertySelect
          label="主刻度方式"
          value={generation?.mode ?? 'auto'}
          options={{
            auto: '自动',
            increment: '按增量',
            count: '按数量',
            endpoints: '仅端点',
          }}
          onChange={(mode) => {
            draft?.setText('主刻度锚点', '');
            draft?.setText('主刻度增量', '1');
            draft?.setText('主刻度数量', '6');
            onTicksChange({
              ...ticks,
              major:
                mode === 'increment'
                  ? { mode, step: 1 }
                  : mode === 'count'
                    ? { mode, count: 6 }
                    : mode === 'endpoints'
                      ? { mode }
                      : { mode: 'auto' },
            });
          }}
        />
        {generation?.mode === 'increment' ? (
          <PropertyNumber
            label="主刻度增量"
            value={generation.step}
            min={0}
            step="any"
            onChange={(step) =>
              onTicksChange({ ...ticks, major: { ...generation, step } })
            }
          />
        ) : null}
        {generation?.mode === 'count' ? (
          <PropertyNumber
            label="主刻度数量"
            value={generation.count}
            min={2}
            step={1}
            onChange={(count) =>
              onTicksChange({ ...ticks, major: { ...generation, count } })
            }
          />
        ) : null}
        {generation?.mode === 'increment' || generation?.mode === 'count' ? (
          <>
            <PropertyInput
              label="主刻度锚点"
              type="text"
              inputMode="decimal"
              placeholder={
                value.kind === 'linear' || value.symLog
                  ? '自动（0）'
                  : '自动（1）'
              }
              value={
                draft?.texts['主刻度锚点'] ??
                (generation.anchor === undefined
                  ? ''
                  : String(generation.anchor))
              }
              onChange={(event) => {
                const text = event.target.value;
                draft?.setText('主刻度锚点', text);
                const next = { ...generation };
                if (!text.trim()) delete next.anchor;
                else
                  next.anchor =
                    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
                      text.trim(),
                    )
                      ? Number(text)
                      : NaN;
                onTicksChange({ ...ticks, major: next });
              }}
            />
            <p className="property-hint">
              普通对数与 SymLog
              的增量按变换后的尺度单位计算；锚点填写原始数据值。
            </p>
          </>
        ) : null}
        {value.kind !== 'linear' && !value.symLog ? (
          <PropertySelect<string>
            label="对数刻度策略"
            value={ticks.logPolicy ?? 'legacy'}
            options={{
              legacy: '原有等距细分',
              logarithmic: '真实对数细分',
              ...(value.kind === 'log10'
                ? { 'origin-log10': 'Origin 窄区间兼容' }
                : {}),
            }}
            onChange={(logPolicy) =>
              onTicksChange({
                ...ticks,
                logPolicy: logPolicy as NonNullable<
                  NumericTickOptions['logPolicy']
                >,
              })
            }
          />
        ) : null}
        <PropertyNumber
          label="次刻度数量"
          value={ticks.minorCount ?? 0}
          min={0}
          step={1}
          onChange={(minorCount) => onTicksChange({ ...ticks, minorCount })}
        />
        <p className="property-hint">
          原有策略在相邻主刻度之间等距细分；真实对数细分在每个对数单位内按数值细分，Log10
          数量 8 对应
          2…9。窄区间兼容在不超过一个数量级时采用线性刻度值，位置仍按对数映射。主次刻度合计最多
          10,000。
        </p>
      </fieldset>
    </>
  );
}
