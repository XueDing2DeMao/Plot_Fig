import type { Axis } from '@plot-fig/figure-schema';
import { PropertyNumber } from './PropertyInputs.js';
export function SymLogValueFields({
  value,
  onChange,
  prefix = '',
}: {
  value: NonNullable<Axis['symLog']>;
  onChange: (value: NonNullable<Axis['symLog']>) => void;
  prefix?: string;
}) {
  return (
    <>
      <PropertyNumber
        label={`${prefix}线性范围阈值`}
        fieldPath="details.symLog.threshold"
        value={value.threshold}
        min={0}
        step="any"
        onChange={(threshold) => onChange({ ...value, threshold })}
      />
      <PropertyNumber
        label={`${prefix}线性段长度`}
        fieldPath="details.symLog.linearLength"
        value={value.linearLength}
        min={0}
        step="any"
        onChange={(linearLength) => onChange({ ...value, linearLength })}
      />
      <p className="property-hint">
        阈值以内线性变化；长度表示从零到正阈值占多少个对数单位，负侧对称。阈值须大于
        0，长度范围 (0,100]。
      </p>
    </>
  );
}
