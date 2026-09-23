import type { AxisSettings } from '../state/figure-settings.js';
import { PropertyInput } from './PropertyInputs.js';

export function AxisFields({
  dimension,
  value,
  onChange,
}: {
  dimension: 'X' | 'Y';
  value: AxisSettings;
  onChange: (value: AxisSettings) => void;
}) {
  const prefix = `${dimension} 轴`;
  return (
    <fieldset className="property-group">
      <legend>{prefix}</legend>
      <PropertyInput
        label={`${prefix}标题`}
        value={value.title}
        maxLength={1024}
        placeholder="例如：时间 (s)"
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <div className="property-grid">
        <PropertyInput
          label={`${prefix}最小值`}
          inputMode="decimal"
          placeholder="自动"
          value={value.min}
          onChange={(event) => onChange({ ...value, min: event.target.value })}
        />
        <PropertyInput
          label={`${prefix}最大值`}
          inputMode="decimal"
          placeholder="自动"
          value={value.max}
          onChange={(event) => onChange({ ...value, max: event.target.value })}
        />
      </div>
      <button
        type="button"
        className="property-auto"
        onClick={() => onChange({ ...value, min: '', max: '' })}
      >
        恢复{prefix}自动范围
      </button>
    </fieldset>
  );
}
