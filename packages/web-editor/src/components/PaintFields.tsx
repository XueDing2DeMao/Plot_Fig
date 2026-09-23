import type { Paint } from '@plot-fig/figure-schema';
import {
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

export function PaintFields({
  value,
  onChange,
  prefix = '填充',
  fallback = '#ffffff',
}: {
  value: Paint | undefined;
  onChange: (paint: Paint | undefined) => void;
  prefix?: string;
  fallback?: string;
}) {
  const color = /^#[0-9a-f]{6}$/i.test(fallback) ? fallback : '#ffffff';
  return (
    <fieldset className="property-group">
      <legend>{prefix}效果</legend>
      <PropertySelect
        label={`${prefix}方式`}
        value={value?.kind ?? 'default'}
        options={{
          default: '原有颜色',
          none: '无填充（透明）',
          solid: '纯色',
          'linear-gradient': '线性渐变',
          pattern: '图案',
        }}
        onChange={(kind) => {
          onChange(
            kind === 'default'
              ? undefined
              : kind === 'none'
                ? { kind }
                : kind === 'solid'
                  ? { kind, color }
                  : kind === 'linear-gradient'
                    ? {
                        kind,
                        angle: 90,
                        startColor: color,
                        endColor: '#2166ac',
                      }
                    : {
                        kind: 'pattern',
                        pattern: 'diagonal',
                        foreground: '#333333',
                        background: color,
                        spacingPt: 8,
                        widthPt: 1,
                      },
          );
        }}
      />
      {value?.kind === 'solid' && (
        <PropertyInput
          label={`${prefix}纯色`}
          type="color"
          value={value.color === 'none' ? '#ffffff' : value.color}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
        />
      )}
      {value?.kind === 'linear-gradient' && (
        <>
          <PropertyInput
            label={`${prefix}起始颜色`}
            type="color"
            value={value.startColor}
            onChange={(e) => onChange({ ...value, startColor: e.target.value })}
          />
          <PropertyInput
            label={`${prefix}结束颜色`}
            type="color"
            value={value.endColor}
            onChange={(e) => onChange({ ...value, endColor: e.target.value })}
          />
          <PropertyNumber
            label={`${prefix}渐变角度`}
            value={value.angle}
            min={-360}
            step={1}
            onChange={(angle) => onChange({ ...value, angle })}
          />
        </>
      )}
      {value?.kind === 'pattern' && (
        <>
          <PropertySelect
            label={`${prefix}图案`}
            value={value.pattern}
            options={{ diagonal: '斜线', cross: '交叉线', dots: '圆点' }}
            onChange={(pattern) => onChange({ ...value, pattern })}
          />
          <PropertyInput
            label={`${prefix}图案颜色`}
            type="color"
            value={value.foreground}
            onChange={(e) => onChange({ ...value, foreground: e.target.value })}
          />
          <PropertyInput
            label={`${prefix}底色（none 为透明）`}
            value={value.background}
            onChange={(e) => onChange({ ...value, background: e.target.value })}
          />
          <PropertyNumber
            label={`${prefix}图案间距 (pt)`}
            value={value.spacingPt}
            min={2}
            step={1}
            onChange={(spacingPt) => onChange({ ...value, spacingPt })}
          />
          <PropertyNumber
            label={`${prefix}图案线宽 (pt)`}
            value={value.widthPt}
            min={0.1}
            step={0.1}
            onChange={(widthPt) => onChange({ ...value, widthPt })}
          />
        </>
      )}
    </fieldset>
  );
}
