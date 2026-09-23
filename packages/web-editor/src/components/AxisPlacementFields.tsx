import type { Axis } from '@plot-fig/figure-schema';
import type { AxisDetails } from '../state/figure-details.js';
import { PropertyNumber, PropertySelect } from './PropertyInputs.js';

type Props = {
  prefix: string;
  dimension: Axis['dimension'];
  axes: readonly Axis[];
  value: AxisDetails;
  onChange: (value: AxisDetails) => void;
};

function defaultCrossValue(axis: Axis): number {
  if (axis.range.mode === 'fixed') {
    // 取已知范围内的值；对数尺度不将 0 作为默认交点。
    return axis.range.min;
  }
  return axis.scale === 'linear' || axis.symLog ? 0 : 1;
}

export function AxisPlacementFields({
  prefix,
  dimension,
  axes,
  value,
  onChange,
}: Props) {
  const placement = value.placement;
  const targets = axes.filter(
    (axis) => axis.dimension !== dimension && axis.scale !== 'category',
  );
  const modes: Record<string, string> = {
    frame: '图框边缘',
    percent: '绘图区百分比',
  };
  if (targets.length) modes.cross = '指定数据交点';
  const names = { bottom: '下', top: '上', left: '左', right: '右' };
  const options = Object.fromEntries(
    targets.map((axis) => [
      axis.axisId,
      `${names[axis.position]} ${axis.dimension.toUpperCase()} 轴 · ${axis.axisId}`,
    ]),
  );
  return (
    <fieldset className="property-group">
      <legend>轴位置</legend>
      <PropertySelect<string>
        label={`${prefix}轴位置方式`}
        value={placement?.mode ?? 'frame'}
        options={modes}
        onChange={(mode) => {
          if (mode !== 'frame' && mode !== 'percent' && mode !== 'cross')
            return;
          if (mode === 'cross' && !targets.length) return;
          const offset =
            placement?.offsetPt === undefined
              ? {}
              : { offsetPt: placement.offsetPt };
          const next: NonNullable<AxisDetails['placement']> =
            mode === 'cross'
              ? {
                  mode,
                  axisId: targets[0]!.axisId,
                  value: defaultCrossValue(targets[0]!),
                  ...offset,
                }
              : mode === 'percent'
                ? { mode, percent: 50, ...offset }
                : { mode, ...offset };
          onChange({ ...value, placement: next });
        }}
      />
      {placement?.mode === 'percent' && (
        <PropertyNumber
          label={`${prefix}轴位置 (%)`}
          fieldPath="details.placement.percent"
          value={placement.percent}
          step={1}
          onChange={(percent) =>
            onChange({ ...value, placement: { ...placement, percent } })
          }
        />
      )}
      {placement?.mode === 'cross' && (
        <>
          <PropertySelect
            label={`${prefix}交点参考轴`}
            value={placement.axisId}
            options={options}
            onChange={(axisId) => {
              const target = targets.find((axis) => axis.axisId === axisId)!;
              onChange({
                ...value,
                placement: {
                  ...placement,
                  axisId,
                  value: defaultCrossValue(target),
                },
              });
            }}
          />
          <PropertyNumber
            label={`${prefix}交点数值`}
            fieldPath="details.placement.value"
            value={placement.value}
            min={null}
            step="any"
            onChange={(crossValue) =>
              onChange({
                ...value,
                placement: { ...placement, value: crossValue },
              })
            }
          />
        </>
      )}
      <PropertyNumber
        label={`${prefix}轴偏移 (pt)`}
        fieldPath="details.placement.offsetPt"
        value={placement?.offsetPt ?? 0}
        min={-14400}
        step={1}
        onChange={(offsetPt) =>
          onChange({
            ...value,
            placement: { ...(placement ?? { mode: 'frame' }), offsetPt },
          })
        }
      />
      <p className="property-hint">
        百分比沿屏幕方向：X 轴从上至下，Y
        轴从左至右。正偏移沿原轴侧向外。交点需位于参考轴范围内，对数参考轴要求正值。
      </p>
    </fieldset>
  );
}
