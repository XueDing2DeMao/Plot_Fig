import type { ColorScale } from '@plot-fig/figure-schema';
import {
  PropertyInput,
  PropertyCheck,
  PropertySelect,
  PropertyNumber,
} from './PropertyInputs.js';
import { SignedNumber } from './ChartInputs.js';
type Props = {
  value: ColorScale;
  onChange: (value: ColorScale) => void;
  section?: 'scale' | 'colorbar' | 'all';
};
function ColorStop({ value, onChange, index }: Props & { index: number }) {
  const replace = (color: string) =>
    onChange({
      ...value,
      colors: value.colors.map((c, i) => (i === index ? color : c)),
    });
  const remove = () =>
    onChange({ ...value, colors: value.colors.filter((_, i) => i !== index) });
  return (
    <div className="property-grid">
      <PropertyInput
        label={`色阶颜色 ${index + 1}`}
        type="color"
        value={value.colors[index]!}
        onChange={(e) => replace(e.target.value)}
      />
      <button
        type="button"
        disabled={value.colors.length <= 2}
        onClick={remove}
      >
        移除色标 {index + 1}
      </button>
    </div>
  );
}
function FixedRange({ value, onChange }: Props) {
  const range = value.range;
  if (range.mode !== 'fixed') return null;
  return (
    <>
      <SignedNumber
        label="Z 最小值"
        fieldPath="settings.plot.colorScale.range.min"
        value={range.min}
        onChange={(min) => onChange({ ...value, range: { ...range, min } })}
      />
      <SignedNumber
        label="Z 最大值"
        fieldPath="settings.plot.colorScale.range.max"
        value={range.max}
        onChange={(max) => onChange({ ...value, range: { ...range, max } })}
      />
    </>
  );
}
function ColorDomain({ value, onChange }: Props) {
  return (
    <>
      <PropertyCheck
        label="反向色阶"
        checked={value.reverse}
        onChange={(reverse) => onChange({ ...value, reverse })}
      />
      <PropertySelect
        label="Z 颜色范围"
        value={value.range.mode}
        options={{ auto: '自动', fixed: '固定' }}
        onChange={(mode) =>
          onChange({
            ...value,
            range: mode === 'auto' ? { mode } : { mode, min: 0, max: 1 },
          })
        }
      />
      <FixedRange value={value} onChange={onChange} />
    </>
  );
}
export function ColorFields({ value, onChange, section = 'all' }: Props) {
  if (section === 'colorbar') {
    const bar = value.colorbar,
      orientation = bar.orientation ?? 'vertical';
    return (
      <fieldset className="property-group">
        <legend>独立色标</legend>
        <PropertyCheck
          label="显示颜色条"
          checked={bar.visible}
          onChange={(visible) =>
            onChange({ ...value, colorbar: { ...bar, visible } })
          }
        />
        <PropertyInput
          label="颜色条标题与单位"
          value={bar.title}
          onChange={(e) =>
            onChange({ ...value, colorbar: { ...bar, title: e.target.value } })
          }
        />
        <PropertySelect
          label="色标模式"
          value={bar.mode ?? 'linked'}
          options={{ linked: '关联当前色图', independent: '独立范围' }}
          onChange={(mode) =>
            onChange({
              ...value,
              colorbar: {
                ...bar,
                mode,
                ...(mode === 'independent' && !bar.range
                  ? {
                      range:
                        value.range.mode === 'fixed'
                          ? { min: value.range.min, max: value.range.max }
                          : value.transform === 'log10'
                            ? { min: 1, max: 10 }
                            : { min: 0, max: 1 },
                    }
                  : {}),
              },
            })
          }
        />
        {(bar.mode ?? 'linked') === 'independent' && (
          <>
            <SignedNumber
              label="独立范围最小值"
              fieldPath="settings.plot.colorScale.colorbar.range.min"
              value={
                bar.range?.min ??
                (value.range.mode === 'fixed' ? value.range.min : 0)
              }
              onChange={(min) =>
                onChange({
                  ...value,
                  colorbar: {
                    ...bar,
                    range: {
                      min,
                      max:
                        bar.range?.max ??
                        (value.range.mode === 'fixed' ? value.range.max : 1),
                    },
                  },
                })
              }
            />
            <SignedNumber
              label="独立范围最大值"
              fieldPath="settings.plot.colorScale.colorbar.range.max"
              value={
                bar.range?.max ??
                (value.range.mode === 'fixed' ? value.range.max : 1)
              }
              onChange={(max) =>
                onChange({
                  ...value,
                  colorbar: {
                    ...bar,
                    range: {
                      min:
                        bar.range?.min ??
                        (value.range.mode === 'fixed' ? value.range.min : 0),
                      max,
                    },
                  },
                })
              }
            />
          </>
        )}
        <PropertySelect
          label="色标方向"
          value={orientation}
          options={{ vertical: '竖向', horizontal: '横向' }}
          onChange={(next) =>
            onChange({
              ...value,
              colorbar: {
                ...bar,
                orientation: next,
                side: next === 'vertical' ? 'right' : 'bottom',
              },
            })
          }
        />
        {orientation === 'vertical' ? (
          <PropertySelect
            label="停靠位置"
            value={bar.side === 'left' ? 'left' : 'right'}
            options={{ left: '左侧', right: '右侧' }}
            onChange={(side) =>
              onChange({ ...value, colorbar: { ...bar, side } })
            }
          />
        ) : (
          <PropertySelect
            label="停靠位置"
            value={bar.side === 'top' ? 'top' : 'bottom'}
            options={{ top: '顶部', bottom: '底部' }}
            onChange={(side) =>
              onChange({ ...value, colorbar: { ...bar, side } })
            }
          />
        )}
        <PropertyNumber
          label="色标长度比例"
          fieldPath="settings.plot.colorScale.colorbar.length"
          value={bar.length ?? 1}
          step={0.05}
          onChange={(length) =>
            onChange({ ...value, colorbar: { ...bar, length } })
          }
        />
        <PropertyNumber
          label="色标宽度 (pt)"
          fieldPath="settings.plot.colorScale.colorbar.widthPt"
          value={bar.widthPt ?? 10}
          step={1}
          onChange={(widthPt) =>
            onChange({ ...value, colorbar: { ...bar, widthPt } })
          }
        />
        <PropertyNumber
          label="主刻度数量"
          fieldPath="settings.plot.colorScale.colorbar.majorTicks"
          value={bar.majorTicks ?? 3}
          step={1}
          onChange={(majorTicks) =>
            onChange({ ...value, colorbar: { ...bar, majorTicks } })
          }
        />
        <PropertyNumber
          label="次刻度数量"
          fieldPath="settings.plot.colorScale.colorbar.minorTicks"
          value={bar.minorTicks ?? 0}
          step={1}
          onChange={(minorTicks) =>
            onChange({ ...value, colorbar: { ...bar, minorTicks } })
          }
        />
        <PropertySelect
          label="数字格式"
          value={bar.notation ?? 'auto'}
          options={{ auto: '自动', fixed: '小数', scientific: '科学计数' }}
          onChange={(notation) =>
            onChange({ ...value, colorbar: { ...bar, notation } })
          }
        />
        <PropertyNumber
          label="数字精度"
          fieldPath="settings.plot.colorScale.colorbar.precision"
          value={bar.precision ?? 6}
          step={1}
          onChange={(precision) =>
            onChange({ ...value, colorbar: { ...bar, precision } })
          }
        />
        <PropertySelect
          label="端点形状"
          value={bar.endpoints ?? 'flat'}
          options={{
            flat: '平端',
            triangles: '三角端点',
            both: '平端和三角端点',
          }}
          onChange={(endpoints) =>
            onChange({ ...value, colorbar: { ...bar, endpoints } })
          }
        />
      </fieldset>
    );
  }
  return (
    <fieldset className="property-group">
      <legend>颜色映射</legend>
      {value.colors.map((_, index) => (
        <ColorStop
          key={index}
          index={index}
          value={value}
          onChange={onChange}
        />
      ))}
      <button
        type="button"
        disabled={value.colors.length >= 32}
        onClick={() =>
          onChange({ ...value, colors: [...value.colors, '#fde725'] })
        }
      >
        添加色标
      </button>
      <ColorDomain value={value} onChange={onChange} />
      <PropertySelect
        label="颜色映射尺度"
        value={value.transform ?? 'linear'}
        options={{ linear: 'Linear', log10: 'Log10' }}
        onChange={(transform) => onChange({ ...value, transform })}
      />
      <PropertySelect
        label="颜色插值"
        value={value.interpolation ?? 'continuous'}
        options={{ continuous: '连续', discrete: '分块' }}
        onChange={(interpolation) => onChange({ ...value, interpolation })}
      />
      {section === 'all' && (
        <>
          <PropertyCheck
            label="显示颜色条"
            checked={value.colorbar.visible}
            onChange={(visible) =>
              onChange({ ...value, colorbar: { ...value.colorbar, visible } })
            }
          />
          <PropertyInput
            label="颜色条标题与单位"
            value={value.colorbar.title}
            onChange={(e) =>
              onChange({
                ...value,
                colorbar: { ...value.colorbar, title: e.target.value },
              })
            }
          />
        </>
      )}
    </fieldset>
  );
}
