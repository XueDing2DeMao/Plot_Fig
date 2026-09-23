import type { BatchField } from '../state/batch-property-fields.js';
import {
  extrasBatchDraft,
  type ExtrasDraft,
} from './line-extras-batch-draft.js';
export function LineExtrasBatchField({
  field,
  text,
  common,
  disabled,
  onChange,
  onReset,
}: {
  field: BatchField;
  text: string | undefined;
  common: { mixed: boolean; value?: unknown };
  disabled: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const kind = field.type === 'curve-arrows' ? 'curve-arrows' : 'drop-line';
  const draft: ExtrasDraft = text
    ? JSON.parse(text)
    : extrasBatchDraft(
        kind,
        text === '' || common.mixed ? undefined : common.value,
      );
  const update = (key: string, value: string) =>
    onChange(JSON.stringify({ ...draft, [key]: value }));
  const select = (
    key: string,
    label: string,
    options: Record<string, string>,
  ) => {
    const mixed =
      common.mixed &&
      text === undefined &&
      (key === 'position' || key === 'mode');
    return (
      <label>
        {label}
        <select
          aria-label={label}
          value={mixed ? '__mixed' : draft[key]}
          onChange={(e) => update(key, e.target.value)}
        >
          {mixed && (
            <option value="__mixed" disabled>
              多个值
            </option>
          )}
          {Object.entries(options).map(([v, name]) => (
            <option key={v} value={v}>
              {name}
            </option>
          ))}
        </select>
      </label>
    );
  };
  const input = (key: string, label: string, numeric = true) => (
    <label>
      {label}
      <input
        type="text"
        role={numeric ? 'spinbutton' : undefined}
        inputMode={numeric ? 'decimal' : undefined}
        value={draft[key]}
        onChange={(e) => update(key, e.target.value)}
      />
    </label>
  );
  return (
    <fieldset className="batch-field" disabled={disabled}>
      <legend>{field.label}</legend>
      {common.mixed && text === undefined && (
        <p className="property-hint">多个值。修改后将统一此完整参数组。</p>
      )}
      {kind === 'curve-arrows' ? (
        <>
          {select('position', '箭头位置', {
            none: '不显示',
            start: '首端',
            end: '末端',
            both: '两端',
            repeat: '等距重复',
          })}
          {draft.position !== 'none' && (
            <>
              {input('length', '箭头长度 (pt)')}
              {input('angle', '箭头角度 (°)')}
              {draft.position === 'repeat' &&
                input('spacing', '箭头间距倍数（留空为 5）')}
              {input('tolerance', '箭头弯曲容忍（留空为 1.5）')}
              {input('color', '箭头颜色（留空跟随线条）', false)}
            </>
          )}
        </>
      ) : (
        <>
          {select('mode', field.label + '目标', {
            none: '不显示',
            'axis-min': '绑定轴数值最小端',
            'axis-max': '绑定轴数值最大端',
            value: '指定值',
          })}
          {draft.mode !== 'none' && (
            <>
              {draft.mode === 'value' && input('value', field.label + '指定值')}
              {select('custom', field.label + '样式', {
                false: '默认同色实线',
                true: '自定义',
              })}
              {draft.custom === 'true' && (
                <>
                  {input('color', field.label + '颜色', false)}
                  {input('width', field.label + '宽度 (pt)')}
                  {select('dash', field.label + '线型', {
                    solid: '实线',
                    dashed: '虚线',
                    dotted: '点线',
                    'dash-dot': '点划线',
                  })}
                </>
              )}
            </>
          )}
        </>
      )}
      <p className="property-hint">整组应用；数字未输入完整时无法提交。</p>
      {text !== undefined && (
        <button
          type="button"
          className="property-auto"
          aria-label={'保留各自值：' + field.label}
          onClick={onReset}
        >
          保留各自值
        </button>
      )}
    </fieldset>
  );
}
