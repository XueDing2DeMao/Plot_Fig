import { useContext } from 'react';
import type { AxisDetails } from '../state/figure-details.js';
import {
  PropertyCheck,
  PropertySelect,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';
import { SymLogValueFields } from './SymLogValueFields.js';
import { AxisScaleOptionFields } from './AxisAdvancedFields.js';
export function changeAxisScale(
  value: AxisDetails,
  scale: AxisDetails['scale'],
): AxisDetails {
  const next = { ...value, scale };
  if (!['log10', 'ln', 'log2'].includes(scale)) {
    delete next.symLog;
    delete next.logTicks;
  } else if (scale !== 'log10' && next.logTicks?.mode === 'origin-log10')
    delete next.logTicks;
  if (scale !== 'offset-reciprocal' && scale !== 'custom')
    delete next.scaleOptions;
  if (scale === 'offset-reciprocal')
    next.scaleOptions = { offset: value.scaleOptions?.offset ?? 273.14 };
  if (scale === 'custom')
    next.scaleOptions = {
      formula: value.scaleOptions?.formula ?? {
        forward: 'x',
        inverse: 'x',
        min: 0,
        max: 100,
      },
    };
  return next;
}
export function AxisAdvancedScaleFields({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: AxisDetails;
  onChange: (next: AxisDetails) => void;
}) {
  const draft = useContext(PropertyNumberDraftContext);
  if (value.scale === 'custom' || value.scale === 'offset-reciprocal')
    return (
      <>
        <AxisScaleOptionFields
          scale={value.scale}
          value={value.scaleOptions}
          onChange={(scaleOptions) => {
            const next = { ...value };
            if (scaleOptions) next.scaleOptions = scaleOptions;
            else delete next.scaleOptions;
            onChange(next);
          }}
        />
        <p className="property-hint">
          公式使用
          x、四则运算、^、sqrt、ln、log10、log2、exp、abs；正逆公式须在整个定义域内单调且互相还原。
        </p>
      </>
    );
  if (!['log10', 'ln', 'log2'].includes(value.scale)) return null;
  return (
    <>
      <PropertyCheck
        label={`${prefix}对称对数（SymLog）`}
        checked={!!value.symLog}
        onChange={(enabled) => {
          const next = { ...value };
          if (enabled) {
            next.symLog = { threshold: 1, linearLength: 1 };
            delete next.logTicks;
            draft?.setText(`${prefix}线性范围阈值`, '1', [
              'details',
              'symLog',
              'threshold',
            ]);
            draft?.setText(`${prefix}线性段长度`, '1', [
              'details',
              'symLog',
              'linearLength',
            ]);
          } else delete next.symLog;
          onChange(next);
        }}
      />
      {value.symLog ? (
        <SymLogValueFields
          prefix={prefix}
          value={value.symLog}
          onChange={(symLog) => onChange({ ...value, symLog })}
        />
      ) : (
        <>
          <PropertySelect
            label={`${prefix}对数刻度策略`}
            value={value.logTicks?.mode ?? 'legacy'}
            options={
              {
                legacy: '原有等距细分',
                logarithmic: '真实对数细分',
                ...(value.scale === 'log10'
                  ? { 'origin-log10': 'Origin 窄区间兼容' }
                  : {}),
              } as Record<string, string>
            }
            onChange={(mode) => {
              const next = { ...value };
              if (mode === 'legacy') delete next.logTicks;
              else
                next.logTicks = {
                  mode: mode as 'logarithmic' | 'origin-log10',
                };
              onChange(next);
            }}
          />
          <p className="property-hint">
            真实对数细分按原值生成次刻度；Log10 次刻度数量 8 对应
            2…9。窄区间在不超过一个数量级时使用线性刻度值，位置仍按对数映射。
          </p>
        </>
      )}
    </>
  );
}
