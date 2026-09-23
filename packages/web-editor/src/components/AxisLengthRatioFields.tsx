import type {
  AxisLengthRatio,
  FigureTemplate,
  Panel,
} from '@plot-fig/figure-schema';
import {
  axisLengthRatioUnavailable,
  defaultAxisLengthRatio,
} from '../state/axis-length-ratio.js';
import { PropertyNumber, PropertySelect } from './PropertyInputs.js';

export function AxisLengthRatioFields({
  template,
  panel,
  selectedAxisId,
  value,
  onChange,
  pending,
}: {
  template: FigureTemplate;
  panel: Panel;
  selectedAxisId?: string | undefined;
  value: AxisLengthRatio | undefined;
  onChange: (value: AxisLengthRatio | undefined) => void;
  pending: boolean;
}) {
  const unavailable = axisLengthRatioUnavailable(template, panel);
  const positions = {
    bottom: '下 X 轴',
    top: '上 X 轴',
    left: '左 Y 轴',
    right: '右 Y 轴',
  };
  const options = (dimension: 'x' | 'y') =>
    Object.fromEntries(
      panel.axes
        .filter(
          (axis) => axis.dimension === dimension && axis.scale === 'linear',
        )
        .map((axis) => [axis.axisId, positions[axis.position]]),
    );
  return (
    <fieldset className="property-group">
      <legend>X:Y 数据比例</legend>
      <label className="property-check">
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={!value && Boolean(unavailable)}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? defaultAxisLengthRatio(panel, selectedAxisId)
                : undefined,
            )
          }
        />
        关联轴长与数据比例
      </label>
      {value && (
        <>
          <div className="property-grid">
            <PropertySelect
              label="比例所用 X 轴"
              value={value.xAxisId}
              options={options('x')}
              onChange={(xAxisId) => onChange({ ...value, xAxisId })}
            />
            <PropertySelect
              label="比例所用 Y 轴"
              value={value.yAxisId}
              options={options('y')}
              onChange={(yAxisId) => onChange({ ...value, yAxisId })}
            />
          </div>
          <PropertyNumber
            label="X:Y 数据比例"
            fieldPath="axisLengthRatio.ratio"
            value={value.ratio}
            step="any"
            onChange={(ratio) => onChange({ ...value, ratio })}
          />
          <p className="property-hint">
            比例 1 表示 X、Y
            每个数据单位显示为相同长度。在图层可用区域内调整轴长，数据范围保持不变。
          </p>
          {pending && (
            <p className="property-hint">等待所选坐标轴的有效范围。</p>
          )}
        </>
      )}
      {unavailable && <p className="property-hint">{unavailable}</p>}
    </fieldset>
  );
}
