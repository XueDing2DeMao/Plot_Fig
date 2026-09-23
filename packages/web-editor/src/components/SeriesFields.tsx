import { MarkerAppearanceFields } from './MarkerAppearanceFields.js';
import { lineConnectionOptions } from '../state/line-connection-options.js';
import { LineAppearanceFields } from './LineAppearanceFields.js';
import { XyLineExtrasFields } from './XyLineExtrasFields.js';
import type { FigureSettings } from '../state/figure-settings.js';
import {
  PropertyInput,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';

type Props = {
  value: FigureSettings;
  onChange: (value: FigureSettings) => void;
};
export function LineFields({
  value,
  onChange,
  includeDropLines = true,
}: Props & { includeDropLines?: boolean }) {
  const update = (patch: Partial<FigureSettings['line']>) =>
    onChange({ ...value, line: { ...value.line, ...patch } });
  return (
    <>
      <fieldset className="property-group">
        <legend>线条</legend>
        {value.plot.kind === 'xy' && (
          <>
            <PropertySelect
              label="连接方式"
              value={value.plot.lineConnection ?? 'straight'}
              options={lineConnectionOptions}
              onChange={(lineConnection) => {
                if (value.plot.kind === 'xy')
                  onChange({
                    ...value,
                    plot: { ...value.plot, lineConnection },
                  });
              }}
            />
            {value.plot.lineConnection === 'spline' && (
              <p className="property-hint">
                自然三次样条经过原始数据点，要求 X 值严格递增且 X/Y
                轴均为线性。自动范围按原始数据计算。
              </p>
            )}
          </>
        )}
        <div className="property-grid">
          <PropertyInput
            label="线条颜色"
            type="color"
            value={value.line.color}
            onChange={(e) => update({ color: e.target.value })}
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
