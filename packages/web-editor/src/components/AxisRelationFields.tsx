import type { Axis } from '@plot-fig/figure-schema';
import type { PropertyObjectSettings } from '../state/property-object-settings.js';
import { PropertyCheck, PropertyNumber } from './PropertyInputs.js';

type AxisValue = Extract<PropertyObjectSettings, { kind: 'axis' }>;

export function AxisRelationFields({
  axis,
  axes,
  value,
  onChange,
}: {
  axis: Axis;
  axes: readonly Axis[];
  value: AxisValue;
  onChange: (value: AxisValue) => void;
}) {
  const isOpposite = axis.position === 'top' || axis.position === 'right';
  const oppositePosition = axis.position === 'top' ? 'bottom' : 'left';
  const opposite = axes.find(
    (candidate) =>
      candidate.position === oppositePosition &&
      candidate.dimension === axis.dimension,
  );
  if ((!isOpposite || !opposite) && !value.relations.legacyPanelRange)
    return null;
  const sharedLabel =
    axis.position === 'top' ? '与下 X 轴共用刻度范围' : '与左 Y 轴共用刻度范围';
  const aligned = value.relations.alignmentValue !== undefined;
  const numeric =
    value.details.scale !== 'category' && opposite?.scale !== 'category';
  return (
    <fieldset className="property-group">
      <legend>对边坐标轴关系</legend>
      {value.relations.legacyPanelRange && (
        <>
          <p className="property-hint">
            沿用旧图规则：没有绑定到此轴的可用曲线时，使用同层数据范围。
          </p>
          <button
            type="button"
            className="property-reset"
            onClick={() =>
              onChange({
                ...value,
                relations: { ...value.relations, legacyPanelRange: false },
              })
            }
          >
            改用独立范围
          </button>
        </>
      )}
      {isOpposite && opposite && (
        <PropertyCheck
          label={sharedLabel}
          checked={value.relations.sharedWithOpposite}
          onChange={(sharedWithOpposite) =>
            onChange({
              ...value,
              relations: sharedWithOpposite
                ? { sharedWithOpposite }
                : { ...value.relations, sharedWithOpposite },
            })
          }
        />
      )}
      {axis.position === 'right' &&
        opposite &&
        (numeric || aligned) &&
        !value.relations.sharedWithOpposite && (
          <>
            <PropertyCheck
              label="对齐两个 Y 轴到"
              checked={aligned}
              onChange={(enabled) =>
                onChange({
                  ...value,
                  relations: enabled
                    ? { ...value.relations, alignmentValue: 0 }
                    : { sharedWithOpposite: false },
                })
              }
            />
            {aligned && (
              <PropertyNumber
                label="Y 轴对齐值"
                fieldPath="relations.alignmentValue"
                value={value.relations.alignmentValue!}
                min={null}
                step="any"
                onChange={(alignmentValue) =>
                  onChange({
                    ...value,
                    relations: { ...value.relations, alignmentValue },
                  })
                }
              />
            )}
          </>
        )}
    </fieldset>
  );
}
