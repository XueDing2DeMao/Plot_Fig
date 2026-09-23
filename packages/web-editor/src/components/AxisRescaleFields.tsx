import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import { PropertyNumber, PropertySelect } from './PropertyInputs.js';
type Value = Extract<PropertyObjectSettings, { kind: 'axis' }>;
export function AxisRescaleFields({
  value,
  onChange,
  onFit,
}: {
  value: Value;
  onChange: (value: Value) => void;
  onFit?: (() => void) | undefined;
}) {
  const prefix = `${value.dimension.toUpperCase()} 轴`;
  const policy = value.details.rescale ?? {
    mode:
      value.range.min && value.range.max
        ? ('normal' as const)
        : ('auto' as const),
  };
  const margin = policy.margin ?? { minPercent: 0, maxPercent: 0 };
  const update = (rescale: typeof policy) =>
    onChange({ ...value, details: { ...value.details, rescale } });
  return (
    <>
      <PropertySelect
        label={`${prefix}重缩放策略`}
        value={policy.mode}
        options={{
          normal: '常规（Normal）',
          auto: '自动（Auto）',
          fixed: '固定（Fixed）',
          'fixed-min-normal': '固定最小值 · 常规',
          'fixed-min-auto': '固定最小值 · 自动',
          'fixed-max-normal': '固定最大值 · 常规',
          'fixed-max-auto': '固定最大值 · 自动',
        }}
        onChange={(mode) => update({ ...policy, mode })}
      />
      <div className="property-grid">
        <PropertyNumber
          step="any"
          label={`${prefix}最小端边距 (%)`}
          fieldPath="details.rescale.margin.minPercent"
          value={margin.minPercent}
          onChange={(minPercent) =>
            update({ ...policy, margin: { ...margin, minPercent } })
          }
        />
        <PropertyNumber
          step="any"
          label={`${prefix}最大端边距 (%)`}
          fieldPath="details.rescale.margin.maxPercent"
          value={margin.maxPercent}
          onChange={(maxPercent) =>
            update({ ...policy, margin: { ...margin, maxPercent } })
          }
        />
      </div>
      <p className="property-hint">
        边距为
        0–100%，在下一次重缩放时生效；固定端不添加边距。自动策略在相关数据变化后重新适配。
      </p>
      <button
        type="button"
        className="property-auto"
        disabled={!onFit || policy.mode === 'fixed'}
        onClick={onFit}
      >
        按当前策略重缩放
      </button>
    </>
  );
}
