import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import {
  PropertyCheck,
  PropertyFill,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

type Value = Extract<PropertyObjectSettings, { kind: 'panel' }>;
export function LayerAppearanceFields({
  value,
  onChange,
  tab,
}: {
  value: Value;
  onChange: (value: Value) => void;
  tab: string;
}) {
  const appearance = value.appearance ?? {};
  const background = appearance.background ?? { color: 'none', opacity: 1 };
  const border = appearance.border ?? {
    visible: false,
    color: '#000000',
    widthPt: 1,
    dash: 'solid' as const,
  };
  const shadow = appearance.shadow ?? {
    visible: false,
    color: '#000000',
    opacity: 0.3,
    offsetXPt: 3,
    offsetYPt: 3,
  };
  const margins = value.clipMargins ?? { horizontalPct: 0, verticalPct: 0 };
  const update = (patch: Partial<typeof appearance>) =>
    onChange({ ...value, appearance: { ...appearance, ...patch } });
  if (tab === 'general')
    return (
      <fieldset className="property-group">
        <legend>图层信息</legend>
        <PropertyInput
          label="图层名称"
          value={value.name ?? ''}
          placeholder="留空使用图层编号"
          maxLength={128}
          onChange={(e) => {
            const next = { ...value };
            if (e.target.value) next.name = e.target.value;
            else delete next.name;
            onChange(next);
          }}
        />
        <PropertyCheck
          label="显示图层"
          checked={value.visible !== false}
          onChange={(visible) => onChange({ ...value, visible })}
        />
        <p className="hint">
          隐藏图层保留数据和设置，不参与新的自动范围计算与图例。
        </p>
      </fieldset>
    );
  if (tab === 'display')
    return (
      <fieldset className="property-group">
        <legend>显示与裁剪</legend>
        <PropertyCheck
          label="裁剪图层数据"
          checked={value.clip}
          onChange={(clip) => onChange({ ...value, clip })}
        />
        <PropertyNumber
          label="水平裁剪余量 (%)"
          fieldPath="clipMargins.horizontalPct"
          value={margins.horizontalPct}
          min={-100}
          step={0.1}
          onChange={(horizontalPct) =>
            onChange({ ...value, clipMargins: { ...margins, horizontalPct } })
          }
        />
        <PropertyNumber
          label="垂直裁剪余量 (%)"
          fieldPath="clipMargins.verticalPct"
          value={margins.verticalPct}
          min={-100}
          step={0.1}
          onChange={(verticalPct) =>
            onChange({ ...value, clipMargins: { ...margins, verticalPct } })
          }
        />
        <p className="hint">
          正数向内裁剪，负数向外扩展；范围为 −100% 至小于
          50%。关闭裁剪时保留设置。
        </p>
        <PropertySelect
          label="轴与数据顺序"
          value={
            appearance.dataOnTopOfAxes === undefined
              ? 'default'
              : appearance.dataOnTopOfAxes
                ? 'data'
                : 'axes'
          }
          options={{
            default: '保持现有布局',
            data: '数据在轴上方',
            axes: '轴在数据上方',
          }}
          onChange={(order) => {
            const next = { ...appearance };
            if (order === 'default') delete next.dataOnTopOfAxes;
            else next.dataOnTopOfAxes = order === 'data';
            onChange({ ...value, appearance: next });
          }}
        />
      </fieldset>
    );
  return (
    <>
      <fieldset className="property-group">
        <legend>图层背景</legend>
        <PropertyFill
          label="图层背景颜色"
          value={background.color}
          onChange={(color) => update({ background: { ...background, color } })}
        />
        <PropertyNumber
          label="背景透明度 (0–1)"
          fieldPath="appearance.background.opacity"
          value={background.opacity}
          step={0.05}
          onChange={(opacity) =>
            update({ background: { ...background, opacity } })
          }
        />
        <p className="hint">0 完全透明，1 完全不透明；仅影响背景。</p>
      </fieldset>
      <fieldset className="property-group">
        <legend>图层边框</legend>
        <PropertyCheck
          label="显示图层边框"
          checked={border.visible}
          onChange={(visible) => update({ border: { ...border, visible } })}
        />
        <PropertyInput
          label="图层边框颜色"
          type="color"
          value={border.color}
          onChange={(e) =>
            update({ border: { ...border, color: e.target.value } })
          }
        />
        <PropertyNumber
          label="图层边框宽度 (pt)"
          fieldPath="appearance.border.widthPt"
          value={border.widthPt}
          step={0.1}
          onChange={(widthPt) => update({ border: { ...border, widthPt } })}
        />
        <PropertySelect
          label="图层边框线型"
          value={border.dash}
          options={{
            solid: '实线',
            dashed: '虚线',
            dotted: '点线',
            'dash-dot': '点划线',
          }}
          onChange={(dash) => update({ border: { ...border, dash } })}
        />
      </fieldset>
      <fieldset className="property-group">
        <legend>图层阴影</legend>
        <PropertyCheck
          label="显示图层阴影"
          checked={shadow.visible}
          onChange={(visible) => update({ shadow: { ...shadow, visible } })}
        />
        <PropertyInput
          label="图层阴影颜色"
          type="color"
          value={shadow.color}
          onChange={(e) =>
            update({ shadow: { ...shadow, color: e.target.value } })
          }
        />
        <PropertyNumber
          label="阴影透明度 (0–1)"
          fieldPath="appearance.shadow.opacity"
          value={shadow.opacity}
          step={0.05}
          onChange={(opacity) => update({ shadow: { ...shadow, opacity } })}
        />
        <PropertyNumber
          label="阴影水平偏移 (pt)"
          fieldPath="appearance.shadow.offsetXPt"
          value={shadow.offsetXPt}
          min={-100}
          step={0.5}
          onChange={(offsetXPt) => update({ shadow: { ...shadow, offsetXPt } })}
        />
        <PropertyNumber
          label="阴影垂直偏移 (pt)"
          fieldPath="appearance.shadow.offsetYPt"
          value={shadow.offsetYPt}
          min={-100}
          step={0.5}
          onChange={(offsetYPt) => update({ shadow: { ...shadow, offsetYPt } })}
        />
      </fieldset>
    </>
  );
}
