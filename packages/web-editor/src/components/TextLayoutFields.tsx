import type { TextLayoutOptions } from '@plot-fig/figure-schema';
import { useContext } from 'react';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';

export function TextLayoutFields({
  prefix,
  fieldPath,
  value,
  onChange,
}: {
  prefix: string;
  fieldPath: string;
  value: TextLayoutOptions | undefined;
  onChange: (value: TextLayoutOptions) => void;
}) {
  const layout = value ?? {};
  const update = (patch: Partial<TextLayoutOptions>) =>
    onChange({ ...layout, ...patch });
  const padding = layout.paddingPt ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  const border = layout.border ?? { widthPt: 0, color: '#333333' };
  const draft = useContext(PropertyNumberDraftContext);
  const wrapLabel = `${prefix}换行宽度 (pt)`;
  return (
    <fieldset className="property-group">
      <legend>{prefix}文字布局</legend>
      <PropertySelect
        label={`${prefix}行对齐`}
        value={layout.align ?? 'left'}
        options={{ left: '左对齐', center: '居中', right: '右对齐' }}
        onChange={(align) => update({ align })}
      />
      <div className="property-grid">
        {(
          [
            ['top', '上'],
            ['right', '右'],
            ['bottom', '下'],
            ['left', '左'],
          ] as const
        ).map(([key, label]) => (
          <PropertyNumber
            key={key}
            label={`${prefix}${label}内距 (pt)`}
            fieldPath={`${fieldPath}.paddingPt.${key}`}
            value={padding[key]}
            min={0}
            step={1}
            onChange={(next) =>
              update({ paddingPt: { ...padding, [key]: next } })
            }
          />
        ))}
      </div>
      <div className="property-grid">
        <PropertyInput
          label={wrapLabel}
          type="text"
          inputMode="decimal"
          role="spinbutton"
          placeholder="不自动换行"
          value={
            draft?.texts[wrapLabel] ??
            (layout.wrapWidthPt === undefined ||
            Number.isNaN(layout.wrapWidthPt)
              ? ''
              : String(layout.wrapWidthPt))
          }
          aria-valuenow={
            Number.isFinite(layout.wrapWidthPt) ? layout.wrapWidthPt : undefined
          }
          aria-valuemin={0}
          aria-valuemax={14400}
          aria-invalid={
            layout.wrapWidthPt !== undefined &&
            (!Number.isFinite(layout.wrapWidthPt) || layout.wrapWidthPt <= 0)
              ? true
              : undefined
          }
          onChange={(event) => {
            const raw = event.target.value;
            draft?.setText(
              wrapLabel,
              raw,
              `${fieldPath}.wrapWidthPt`.split('.'),
            );
            if (!raw.trim()) {
              const next = { ...layout };
              delete next.wrapWidthPt;
              onChange(next);
              return;
            }
            const parsed = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
              raw.trim(),
            )
              ? Number(raw)
              : Number.NaN;
            update({
              wrapWidthPt: Number.isFinite(parsed) ? parsed : Number.NaN,
            });
          }}
        />
        <PropertyNumber
          label={`${prefix}行距`}
          fieldPath={`${fieldPath}.lineHeight`}
          value={layout.lineHeight ?? 1.2}
          min={0.5}
          step={0.1}
          onChange={(lineHeight) => update({ lineHeight })}
        />
      </div>
      <div className="property-grid">
        <PropertyCheck
          label={`${prefix}背景`}
          checked={layout.background !== undefined}
          onChange={(checked) => {
            if (checked) update({ background: '#ffffff' });
            else {
              const next = { ...layout };
              delete next.background;
              onChange(next);
            }
          }}
        />
        <PropertyInput
          label={`${prefix}背景颜色`}
          type="color"
          disabled={layout.background === undefined}
          value={layout.background ?? '#ffffff'}
          onChange={(event) => update({ background: event.target.value })}
        />
        <PropertyNumber
          label={`${prefix}边框宽度 (pt)`}
          fieldPath={`${fieldPath}.border.widthPt`}
          value={border.widthPt}
          min={0}
          step={0.5}
          onChange={(widthPt) => update({ border: { ...border, widthPt } })}
        />
        <PropertyInput
          label={`${prefix}边框颜色`}
          type="color"
          disabled={border.widthPt <= 0}
          value={border.color}
          onChange={(event) =>
            update({ border: { ...border, color: event.target.value } })
          }
        />
      </div>
    </fieldset>
  );
}
