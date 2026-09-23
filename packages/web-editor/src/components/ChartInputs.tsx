import { PaintFields } from './PaintFields.js';
import { useContext, useState } from 'react';
import type { FillStyle } from '@plot-fig/figure-schema';
import {
  PropertyInput,
  PropertyNumber,
  PropertyFill,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';

export function NumberListInput({
  label,
  value,
  onChange,
  fieldPath,
}: {
  label: string;
  value: number[];
  onChange: (value: number[]) => void;
  fieldPath?: string | undefined;
}) {
  const draft = useContext(PropertyNumberDraftContext);
  const [text, setText] = useState(value.join(', '));
  return (
    <PropertyInput
      label={label}
      value={draft ? (draft.texts[label] ?? value.join(', ')) : text}
      onChange={(e) => {
        draft?.setText(label, e.target.value, fieldPath?.split('.'));
        setText(e.target.value);
        onChange(
          e.target.value
            .split(/[,，\s]+/)
            .filter(Boolean)
            .map(Number),
        );
      }}
    />
  );
}
export function SignedNumber({
  label,
  value,
  onChange,
  fieldPath,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  fieldPath?: string | undefined;
}) {
  return (
    <PropertyNumber
      label={label}
      step="any"
      min={null}
      fieldPath={fieldPath}
      value={value}
      onChange={onChange}
    />
  );
}
export function FillFields({
  value,
  onChange,
}: {
  value: FillStyle;
  onChange: (value: FillStyle) => void;
}) {
  return (
    <fieldset className="property-group">
      <legend>填充与边框</legend>
      <PropertyFill
        label="图形填充"
        value={value.color}
        onChange={(color) => onChange({ ...value, color })}
      />
      <PaintFields
        value={value.paint}
        fallback={value.color}
        onChange={(paint) => {
          const next = { ...value };
          if (paint) next.paint = paint;
          else delete next.paint;
          onChange(next);
        }}
      />
      <PropertyNumber
        label="填充透明度"
        fieldPath="settings.plot.fillStyle.opacity"
        step={0.05}
        value={value.opacity}
        onChange={(opacity) => onChange({ ...value, opacity })}
      />
      <PropertyInput
        label="图形边框颜色"
        type="color"
        value={value.borderColor}
        onChange={(e) => onChange({ ...value, borderColor: e.target.value })}
      />
      <PropertyNumber
        label="图形边框宽度 (pt)"
        fieldPath="settings.plot.fillStyle.borderWidthPt"
        step={0.1}
        value={value.borderWidthPt}
        onChange={(borderWidthPt) => onChange({ ...value, borderWidthPt })}
      />
    </fieldset>
  );
}
