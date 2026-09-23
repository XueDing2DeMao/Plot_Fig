import { useContext, useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import {
  readFrame,
  writeFrame,
  type GeometryReference,
  type GeometryUnit,
} from '../state/page-geometry.js';
import {
  PropertyNumber,
  PropertyInput,
  PropertySelect,
  PropertyCheck,
  PropertyNumberDraftContext,
} from './PropertyInputs.js';

export function LayerFields({
  value,
  onChange,
  page,
  invalid = false,
  axisLengths,
}: {
  value: Extract<PropertyObjectSettings, { kind: 'panel' }>;
  onChange: (value: Extract<PropertyObjectSettings, { kind: 'panel' }>) => void;
  page: FigureTemplate['page'];
  invalid?: boolean;
  axisLengths?: { x: number; y: number } | undefined;
}) {
  const [unit, setUnit] = useState<GeometryUnit>('%');
  const [reference, setReference] = useState<GeometryReference>('page');
  const [ratio, setRatio] = useState<number | undefined>();
  if (value.axisLengthRatio && ratio !== undefined) setRatio(undefined);
  const [error, setError] = useState('');
  const drafts = useContext(PropertyNumberDraftContext);
  const linkedSize =
    value.frameLink?.width !== undefined ||
    value.frameLink?.height !== undefined;
  const labels = {
    x: '图层左侧',
    y: '图层顶部',
    width: value.axisLengthRatio ? '图层可用宽度' : '图层宽度',
    height: value.axisLengthRatio ? '图层可用高度' : '图层高度',
  };
  const display = readFrame(value.frame, page, unit, reference);
  const changeDisplay = (
    nextUnit: GeometryUnit,
    nextReference: GeometryReference,
  ) => {
    if (invalid || !Object.values(value.frame).every(Number.isFinite)) return;
    try {
      readFrame(value.frame, page, nextUnit, nextReference);
      setError('');
    } catch (cause) {
      setError((cause as Error).message);
      return;
    }
    drafts?.clearGeometryTexts?.();
    setUnit(nextUnit);
    setReference(nextReference);
  };
  return (
    <fieldset className="property-group">
      <legend>图层位置与大小</legend>
      <PropertySelect
        label="图层尺寸单位"
        value={unit}
        options={{ '%': '%', mm: 'mm', cm: 'cm', in: 'in', px: 'px' }}
        onChange={(next) => changeDisplay(next, reference)}
      />
      <PropertySelect
        label="图层参考区域"
        value={reference}
        options={{ page: '整个图页', content: '边距内区域' }}
        onChange={(next) => changeDisplay(unit, next)}
      />
      <p className="property-hint">
        位置从参考区域左上角计算。切换单位或参考区域保持图层位置和大小；图层边框必须位于页面内。
      </p>
      {!linkedSize && !value.axisLengthRatio && (
        <PropertyCheck
          label="锁定图层宽高比"
          checked={ratio !== undefined}
          onChange={(lock) =>
            setRatio(
              lock && value.frame.width > 0 && value.frame.height > 0
                ? value.frame.width / value.frame.height
                : undefined,
            )
          }
        />
      )}
      <div className="property-grid">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((key) =>
          value.frameLink?.[key] !== undefined ? (
            <PropertyInput
              key={key}
              label={`${labels[key]} (${unit})`}
              type="text"
              readOnly
              value={Number(display[key].toFixed(9))}
            />
          ) : (
            <PropertyNumber
              key={key}
              label={`${labels[key]} (${unit})`}
              fieldPath={`frame.${key}`}
              value={Number(display[key].toFixed(9))}
              min={key === 'x' || key === 'y' ? null : 0}
              step={1}
              onChange={(number) => {
                const frame = writeFrame(
                  { ...display, [key]: number },
                  page,
                  unit,
                  reference,
                );
                if (
                  ratio &&
                  !value.axisLengthRatio &&
                  !linkedSize &&
                  Number.isFinite(number)
                ) {
                  if (key === 'width') frame.height = frame.width / ratio;
                  if (key === 'height') frame.width = frame.height * ratio;
                }
                onChange({ ...value, frame });
              }}
            />
          ),
        )}
      </div>
      {value.axisLengthRatio && axisLengths && (
        <div className="property-grid">
          {(['x', 'y'] as const).map((dimension) => {
            const outputUnit = unit === '%' ? 'mm' : unit;
            const factor = {
              mm: 72 / 25.4,
              cm: 72 / 2.54,
              in: 72,
              px: 72 / 96,
            }[outputUnit];
            return (
              <PropertyInput
                key={dimension}
                label={`实际 ${dimension.toUpperCase()} 轴长度 (${outputUnit})`}
                readOnly
                value={Number((axisLengths[dimension] / factor).toFixed(6))}
              />
            );
          })}
        </div>
      )}
      <PropertyCheck
        label="裁剪到图层边框"
        checked={value.clip}
        onChange={(clip) => onChange({ ...value, clip })}
      />
      {error && (
        <p role="alert" className="property-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
