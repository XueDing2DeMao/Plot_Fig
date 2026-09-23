import { useContext } from 'react';
import type { LineStyle } from '@plot-fig/figure-schema';
import { parseCustomDash } from '@plot-fig/svg-renderer';
import { dashOptions } from '../state/batch-property-fields.js';
import {
  PropertyInput,
  PropertyNumber,
  PropertySelect,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';

export function LineAppearanceFields({
  line,
  onChange,
}: {
  line: LineStyle;
  onChange: (line: LineStyle) => void;
}) {
  const draft = useContext(PropertyNumberDraftContext);
  const update = (patch: Partial<LineStyle>) => onChange({ ...line, ...patch });
  const patternLabel = '虚线序列 (pt)';
  const pattern =
    draft?.texts[patternLabel] ??
    line.customDash?.lengthsPt
      .map((value) => (Number.isFinite(value) ? String(value) : ''))
      .join(', ') ??
    '';
  return (
    <>
      <PropertySelect
        label="线型"
        value={line.customDash ? 'custom' : line.dash}
        options={{ ...dashOptions, custom: '自定义虚线' }}
        onChange={(dash) => {
          if (dash === 'custom') update({ customDash: { lengthsPt: [6, 4] } });
          else {
            const next = { ...line, dash };
            delete next.customDash;
            onChange(next);
          }
        }}
      />
      {line.customDash && (
        <>
          <PropertyInput
            label={patternLabel}
            type="text"
            value={pattern}
            aria-invalid={
              line.customDash.lengthsPt.some(
                (value) => !Number.isFinite(value),
              ) ||
              line.customDash.lengthsPt.length < 2 ||
              undefined
            }
            onChange={(event) => {
              const raw = event.target.value;
              draft?.setText(patternLabel, raw, [
                'settings',
                'line',
                'customDash',
                'lengthsPt',
              ]);
              let lengthsPt: number[];
              try {
                lengthsPt = parseCustomDash(raw) ?? [];
              } catch {
                lengthsPt = [NaN];
              }
              update({ customDash: { ...line.customDash, lengthsPt } });
            }}
          />
          <p className="property-hint">
            线段、间隔交替填写，2–16 个数，每项 0.1–1000
            pt；可用逗号或空格分隔。
          </p>
          <PropertyNumber
            label="虚线偏移 (pt)"
            fieldPath="settings.line.customDash.offsetPt"
            value={line.customDash.offsetPt ?? 0}
            min={null}
            step={0.1}
            onChange={(offsetPt) =>
              update({ customDash: { ...line.customDash!, offsetPt } })
            }
          />
        </>
      )}
      <div className="property-grid">
        <PropertySelect
          label="线端形状"
          value={line.cap ?? 'butt'}
          options={{ butt: '平端', round: '圆端', square: '方端' }}
          onChange={(cap) => update({ cap })}
        />
        <PropertySelect
          label="拐角形状"
          value={line.join ?? 'miter'}
          options={{ miter: '尖角', round: '圆角', bevel: '斜角' }}
          onChange={(join) => update({ join })}
        />
        <PropertyNumber
          label="尖角限制"
          fieldPath="settings.line.miterLimit"
          value={line.miterLimit ?? 4}
          min={1}
          step={0.1}
          onChange={(miterLimit) => update({ miterLimit })}
        />
        <PropertyNumber
          label="线条透明度 (%)"
          fieldPath="settings.line.opacity"
          value={Number(((1 - (line.opacity ?? 1)) * 100).toFixed(10))}
          step={0.5}
          onChange={(transparency) =>
            update({ opacity: 1 - transparency / 100 })
          }
        />
      </div>
      <p className="property-hint">
        尖角限制为 1–100，仅尖角生效。透明度为 0–100%，只影响线条描边。
      </p>
      <button
        type="button"
        className="property-auto"
        onClick={() => {
          const next = { ...line };
          for (const key of [
            'cap',
            'join',
            'miterLimit',
            'opacity',
            'customDash',
          ] as const)
            delete next[key];
          onChange(next);
        }}
      >
        恢复默认高级线条样式
      </button>
    </>
  );
}
