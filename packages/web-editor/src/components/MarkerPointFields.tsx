import { useContext } from 'react';
import type { MarkerStyle } from '@plot-fig/figure-schema';
import {
  PropertyCheck,
  PropertyInput,
  PropertyFill,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';
import { markerShapeOptions } from '../state/marker-shape-options.js';

export function MarkerPointFields({
  base,
  value,
  onChange,
}: {
  base: MarkerStyle;
  value: Partial<MarkerStyle>;
  onChange: (value: Partial<MarkerStyle>) => void;
}) {
  const drafts = useContext(PropertyNumberDraftContext);
  const remove = (key: keyof MarkerStyle) => {
    const next = { ...value };
    delete next[key];
    if (key === 'shape') delete next.customVertices;
    onChange(next);
  };
  const number = (
    key: 'sizePt' | 'strokeWidthPt' | 'rotationDeg' | 'opacity',
    label: string,
    fallback: number,
  ) => (
    <section>
      <PropertyCheck
        label={'覆盖' + label}
        checked={value[key] !== undefined}
        onChange={(enabled) => {
          drafts?.setText('单点' + label, String(base[key] ?? fallback));
          if (enabled) onChange({ ...value, [key]: base[key] ?? fallback });
          else remove(key);
        }}
      />
      {value[key] !== undefined && (
        <PropertyNumber
          label={'单点' + label}
          value={value[key]!}
          step="any"
          min={key === 'rotationDeg' ? null : 0}
          onChange={(n) => onChange({ ...value, [key]: n })}
        />
      )}
    </section>
  );
  return (
    <fieldset className="property-group">
      <legend>单点外观</legend>
      <p className="property-hint">
        取消某项覆盖即可恢复基础样式或数据映射。大小始终使用 pt。
      </p>
      {(['fill', 'stroke'] as const).map((key) => (
        <section key={key}>
          <PropertyCheck
            label={'覆盖' + (key === 'fill' ? '填充颜色' : '边框颜色')}
            checked={value[key] !== undefined}
            onChange={(enabled) =>
              enabled
                ? onChange({
                    ...value,
                    [key]: /^#[0-9a-f]{6}$/i.test(base[key])
                      ? base[key]
                      : '#333333',
                  })
                : remove(key)
            }
          />
          {value[key] !== undefined &&
            (key === 'fill' ? (
              <PropertyFill
                label="单点填充颜色"
                value={value.fill!}
                onChange={(fill) => onChange({ ...value, fill })}
              />
            ) : (
              <PropertyInput
                label="单点边框颜色"
                type="color"
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              />
            ))}
        </section>
      ))}
      {number('sizePt', '大小 (pt)', 4)}
      {number('strokeWidthPt', '边框宽度 (pt)', 0.8)}
      {number('rotationDeg', '旋转 (°)', 0)}
      {number('opacity', '不透明度', 1)}
      <PropertyCheck
        label="覆盖符号形状"
        checked={value.shape !== undefined}
        onChange={(enabled) => {
          if (enabled)
            onChange({
              ...value,
              shape: base.shape,
              ...(base.shape === 'custom'
                ? { customVertices: structuredClone(base.customVertices!) }
                : {}),
            });
          else remove('shape');
        }}
      />
      {value.shape !== undefined && (
        <PropertySelect
          label="单点符号形状"
          value={value.shape}
          options={
            Object.fromEntries(
              Object.entries(markerShapeOptions).filter(
                ([key]) =>
                  key !== 'custom' ||
                  base.shape === 'custom' ||
                  value.shape === 'custom',
              ),
            ) as Record<keyof typeof markerShapeOptions, string>
          }
          onChange={(shape) => {
            const next = { ...value, shape };
            if (shape === 'custom')
              next.customVertices = structuredClone(
                value.shape === 'custom'
                  ? value.customVertices!
                  : base.customVertices!,
              );
            else delete next.customVertices;
            onChange(next);
          }}
        />
      )}
      <PropertySelect
        label="单点显示"
        value={
          value.visible === undefined
            ? 'inherit'
            : value.visible
              ? 'show'
              : 'hide'
        }
        options={{ inherit: '继承', show: '显示', hide: '隐藏' }}
        onChange={(v) =>
          v === 'inherit'
            ? remove('visible')
            : onChange({ ...value, visible: v === 'show' })
        }
      />
      <PropertySelect
        label="单点透明度来源"
        value={
          value.followLineOpacity === undefined
            ? 'inherit'
            : value.followLineOpacity
              ? 'line'
              : 'own'
        }
        options={{ inherit: '继承', line: '跟随线条', own: '使用符号不透明度' }}
        onChange={(v) =>
          v === 'inherit'
            ? remove('followLineOpacity')
            : onChange({ ...value, followLineOpacity: v === 'line' })
        }
      />
      <button type="button" onClick={() => onChange({})}>
        恢复此点全部继承
      </button>
    </fieldset>
  );
}
