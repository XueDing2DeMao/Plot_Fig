import type { CurveArrows, DropLine, XyPlot } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

export function ArrowFields({
  value,
  color,
  onChange,
}: {
  value: CurveArrows | undefined;
  color: string;
  onChange: (v: CurveArrows | undefined) => void;
}) {
  const update = (patch: Partial<CurveArrows>) =>
    value && onChange({ ...value, ...patch });
  return (
    <fieldset className="property-group">
      <legend>曲线箭头</legend>
      <PropertySelect
        label="箭头位置"
        value={value?.position ?? 'none'}
        options={{
          none: '不显示',
          start: '首端',
          end: '末端',
          both: '两端',
          repeat: '等距重复',
        }}
        onChange={(position) => {
          if (position === 'none') return onChange(undefined);
          const next = {
            ...value,
            position,
            lengthPt: value?.lengthPt ?? 7,
            angleDeg: value?.angleDeg ?? 40,
          };
          if (position !== 'repeat') delete next.spacingFactor;
          onChange(next);
        }}
      />
      {value && (
        <>
          <div className="property-grid">
            <PropertyNumber
              label="箭头长度 (pt)"
              fieldPath="settings.plot.lineArrows.lengthPt"
              value={value.lengthPt}
              min={1}
              step={0.5}
              onChange={(lengthPt) => update({ lengthPt })}
            />
            <PropertyNumber
              label="箭头角度 (°)"
              fieldPath="settings.plot.lineArrows.angleDeg"
              value={value.angleDeg}
              min={10}
              step={1}
              onChange={(angleDeg) => update({ angleDeg })}
            />
            {value.position === 'repeat' && (
              <PropertyNumber
                label="箭头间距倍数"
                fieldPath="settings.plot.lineArrows.spacingFactor"
                value={value.spacingFactor ?? 5}
                min={1}
                step={0.5}
                onChange={(spacingFactor) => update({ spacingFactor })}
              />
            )}
            <PropertyNumber
              label="箭头弯曲容忍"
              fieldPath="settings.plot.lineArrows.curveTolerance"
              value={value.curveTolerance ?? 1.5}
              min={1}
              step={0.1}
              onChange={(curveTolerance) => update({ curveTolerance })}
            />
          </div>
          <PropertyCheck
            label="箭头颜色跟随线条"
            checked={value.color === undefined}
            onChange={(inherit) => {
              const next = { ...value };
              if (inherit) delete next.color;
              else next.color = color;
              onChange(next);
            }}
          />
          {value.color !== undefined && (
            <PropertyInput
              label="箭头颜色"
              type="color"
              value={value.color}
              onChange={(e) => update({ color: e.target.value })}
            />
          )}
          <p className="property-hint">
            沿数据顺序显示箭头，透明度跟随线条；间距以箭头长度为单位，过弯或留白处跳过。
          </p>
        </>
      )}
    </fieldset>
  );
}
export function DropLineFields({
  direction,
  value,
  color,
  onChange,
}: {
  direction: 'horizontal' | 'vertical';
  value: DropLine | undefined;
  color: string;
  onChange: (v: DropLine | undefined) => void;
}) {
  const name = direction === 'horizontal' ? '水平垂线' : '垂直垂线';
  const axis = direction === 'horizontal' ? 'X' : 'Y';
  const path = `settings.plot.dropLines.${direction}`;
  return (
    <fieldset className="property-group">
      <legend>{name}</legend>
      <PropertySelect
        label={`${name}目标`}
        value={value?.target.mode ?? 'none'}
        options={{
          none: '不显示',
          'axis-min': `${axis} 轴数值最小端`,
          'axis-max': `${axis} 轴数值最大端`,
          value: `指定 ${axis} 值`,
          'next-curve': '曲线目标（在高级垂线中选择）',
        }}
        onChange={(mode) =>
          onChange(
            mode === 'none'
              ? undefined
              : {
                  ...value,
                  target:
                    mode === 'value'
                      ? {
                          mode,
                          value:
                            value?.target.mode === 'value'
                              ? value.target.value
                              : 0,
                        }
                      : { mode },
                },
          )
        }
      />
      {value && (
        <>
          {value.target.mode === 'value' && (
            <PropertyNumber
              label={`${name}指定 ${axis} 值`}
              fieldPath={`${path}.target.value`}
              value={value.target.value}
              min={null}
              step="any"
              onChange={(number) =>
                onChange({ ...value, target: { mode: 'value', value: number } })
              }
            />
          )}
          <PropertyCheck
            label={`${name}使用默认样式`}
            checked={!value.style}
            onChange={(inherit) => {
              const next = { ...value };
              if (inherit) delete next.style;
              else next.style = { color, widthPt: 0.75, dash: 'solid' };
              onChange(next);
            }}
          />
          {value.style && (
            <div className="property-grid">
              <PropertyInput
                label={`${name}颜色`}
                type="color"
                value={value.style.color}
                onChange={(e) =>
                  onChange({
                    ...value,
                    style: { ...value.style!, color: e.target.value },
                  })
                }
              />
              <PropertyNumber
                label={`${name}宽度 (pt)`}
                fieldPath={`${path}.style.widthPt`}
                value={value.style.widthPt}
                step={0.1}
                onChange={(widthPt) =>
                  onChange({ ...value, style: { ...value.style!, widthPt } })
                }
              />
              <PropertySelect
                label={`${name}线型`}
                value={value.style.dash}
                options={{
                  solid: '实线',
                  dashed: '虚线',
                  dotted: '点线',
                  'dash-dot': '点划线',
                }}
                onChange={(dash) =>
                  onChange({ ...value, style: { ...value.style!, dash } })
                }
              />
            </div>
          )}
          <p className="property-hint">
            使用曲线绑定的 {axis}{' '}
            轴。指定值不扩大自动范围，对数轴要求正值；默认样式为同色 0.75 pt
            实线。
          </p>
        </>
      )}
    </fieldset>
  );
}
export function XyLineExtrasFields({
  plot,
  color,
  onChange,
  includeDropLines = true,
}: {
  plot: XyPlot;
  color: string;
  onChange: (v: XyPlot) => void;
  includeDropLines?: boolean;
}) {
  const set = <K extends 'closeLine' | 'symbolGapPct' | 'lineArrows'>(
    key: K,
    value: XyPlot[K] | undefined,
  ) => {
    const next = { ...plot };
    if (value === undefined) delete next[key];
    else Object.assign(next, { [key]: value });
    onChange(next);
  };
  const drop = (
    direction: 'horizontal' | 'vertical',
    value: DropLine | undefined,
  ) => {
    const next = { ...plot, dropLines: { ...plot.dropLines } };
    if (value) next.dropLines[direction] = value;
    else delete next.dropLines[direction];
    if (!Object.keys(next.dropLines).length) delete (next as XyPlot).dropLines;
    onChange(next);
  };
  return (
    <>
      <fieldset className="property-group">
        <legend>连线与符号</legend>
        <PropertyCheck
          label="首尾直线连接"
          checked={plot.closeLine ?? false}
          onChange={(v) => set('closeLine', v || undefined)}
        />
        <PropertyCheck
          label="符号周围留白"
          checked={plot.symbolGapPct !== undefined}
          onChange={(v) => set('symbolGapPct', v ? 25 : undefined)}
        />
        {plot.symbolGapPct !== undefined && (
          <PropertyNumber
            label="符号间隙 (%)"
            fieldPath="settings.plot.symbolGapPct"
            value={plot.symbolGapPct}
            step={1}
            onChange={(v) => set('symbolGapPct', v)}
          />
        )}
        <p className="property-hint">
          首尾由直线连接；间隙范围 0–256%，仅同时显示线条与符号时生效，0
          表示不留白。
        </p>
      </fieldset>
      <ArrowFields
        value={plot.lineArrows}
        color={color}
        onChange={(v) => set('lineArrows', v)}
      />
      {includeDropLines && (
        <>
          <DropLineFields
            direction="horizontal"
            value={plot.dropLines?.horizontal}
            color={color}
            onChange={(v) => drop('horizontal', v)}
          />
          <DropLineFields
            direction="vertical"
            value={plot.dropLines?.vertical}
            color={color}
            onChange={(v) => drop('vertical', v)}
          />
        </>
      )}
    </>
  );
}
