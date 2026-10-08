import { MarkerAppearanceFields } from './MarkerAppearanceFields.js';
import { LineAppearanceFields } from './LineAppearanceFields.js';
import { XyLineExtrasFields } from './XyLineExtrasFields.js';
import type { FigureSettings } from '../state/figure-settings.js';
import { PropertyNumber } from './PropertyInputs.js';
import { OriginLineColor } from './OriginLineColor.js';

type Props = {
  value: FigureSettings;
  onChange: (value: FigureSettings) => void;
  onCurveColors?:
    ((colors: readonly string[], continuous: boolean) => void) | undefined;
  onOpenGroup?: (() => void) | undefined;
};
export function LineFields({
  value,
  onChange,
  includeDropLines = true,
  onCurveColors,
  onOpenGroup,
}: Props & { includeDropLines?: boolean }) {
  const update = (patch: Partial<FigureSettings['line']>) =>
    onChange({ ...value, line: { ...value.line, ...patch } });
  return (
    <>
      <fieldset className="property-group">
        <legend>线条</legend>
        <div className="property-grid">
          <OriginLineColor
            value={value}
            onChange={onChange}
            onCurveColors={onCurveColors}
            onOpenGroup={onOpenGroup}
          />
          <PropertyNumber
            label="线宽 (pt)"
            fieldPath="settings.line.widthPt"
            value={value.line.widthPt}
            step={0.1}
            onChange={(widthPt) => update({ widthPt })}
          />
        </div>
        <LineAppearanceFields
          line={value.line}
          onChange={(line) => onChange({ ...value, line })}
        />
      </fieldset>
      {value.plot.kind === 'xy' && (
        <XyLineExtrasFields
          includeDropLines={includeDropLines}
          plot={value.plot}
          color={value.line.color}
          onChange={(plot) => onChange({ ...value, plot })}
        />
      )}
    </>
  );
}

export function MarkerFields({ value, onChange }: Props) {
  return (
    <MarkerAppearanceFields
      marker={value.marker}
      onChange={(marker) => onChange({ ...value, marker })}
    />
  );
}
