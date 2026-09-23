import type { AxisDetails } from '../state/figure-details.js';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

type Props = {
  prefix: string;
  value: AxisDetails;
  onChange: (value: AxisDetails) => void;
};

export function AxisGridFields({ prefix, value, onChange }: Props) {
  const grid = value.grid ?? {};
  return (
    <>
      <fieldset className="property-group">
        <legend>网格层次</legend>
        <PropertySelect
          label={`${prefix}网格层次`}
          value={grid.layer ?? 'back'}
          options={{ back: '曲线后方', front: '曲线前方' }}
          onChange={(layer) => onChange({ ...value, grid: { ...grid, layer } })}
        />
        <p className="property-hint">
          网格仅显示在绘图区内。曲线前方的网格仍位于坐标轴文字下方。
        </p>
      </fieldset>
      {(['major', 'minor'] as const)
        .filter((key) => key !== 'minor' || value.scale !== 'category')
        .map((key) => {
          const title = key === 'major' ? '主网格' : '次网格';
          const style = grid[key] ?? {
            visible: false,
            color: key === 'major' ? '#d1d5db' : '#e5e7eb',
            widthPt: 0.5,
            dash: 'solid' as const,
          };
          const update = (patch: Partial<typeof style>) =>
            onChange({
              ...value,
              grid: { ...grid, [key]: { ...style, ...patch } },
            });
          return (
            <fieldset className="property-group" key={key}>
              <legend>{title}</legend>
              <PropertyCheck
                label={`${prefix}显示${title}`}
                checked={style.visible}
                onChange={(visible) => update({ visible })}
              />
              <div className="property-grid">
                <PropertyInput
                  label={`${prefix}${title}颜色`}
                  type="color"
                  value={style.color}
                  onChange={(e) => update({ color: e.target.value })}
                />
                <PropertyNumber
                  label={`${prefix}${title}宽度 (pt)`}
                  fieldPath={`details.grid.${key}.widthPt`}
                  value={style.widthPt}
                  step={0.1}
                  onChange={(widthPt) => update({ widthPt })}
                />
              </div>
              <PropertySelect
                label={`${prefix}${title}线型`}
                value={style.dash}
                options={{
                  solid: '实线',
                  dashed: '虚线',
                  dotted: '点线',
                  'dash-dot': '点划线',
                }}
                onChange={(dash) => update({ dash })}
              />
              {key === 'minor' && (
                <p className="property-hint">
                  位置使用“刻度”页的次刻度数量；隐藏次刻度线仍可显示次网格。
                </p>
              )}
            </fieldset>
          );
        })}
    </>
  );
}
