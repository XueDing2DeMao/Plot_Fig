import type { CurveSubset } from '@plot-fig/figure-schema';
import { CurveStyleListFields } from './CurveGroupFields.js';
import {
  PropertyCheck,
  PropertyNumber,
  PropertySelect,
} from './PropertyInputs.js';
export function SubsetFields({
  value,
  onChange,
  groupBound = false,
}: {
  value: CurveSubset | undefined;
  onChange: (next: CurveSubset | undefined) => void;
  groupBound?: boolean;
}) {
  return (
    <fieldset className="property-group">
      <legend>曲线内部子集</legend>
      <PropertyCheck
        label="启用曲线内部子集"
        checked={!!value}
        onChange={(on) =>
          onChange(
            on
              ? {
                  mode: 'length',
                  length: 10,
                  breakConnection: true,
                  colors: ['#2166ac', '#b2182b'],
                }
              : undefined,
          )
        }
      />
      {value && (
        <>
          <PropertySelect
            label="子集划分方式"
            value={value.mode}
            options={{ length: '按原始行的固定长度', group: '按分组数据列' }}
            onChange={(mode) => {
              const { mode: _, ...rest } = value;
              if ('length' in rest) delete (rest as { length?: number }).length;
              onChange(
                mode === 'length'
                  ? { ...rest, mode, length: 10 }
                  : { ...rest, mode },
              );
            }}
          />
          {value.mode === 'length' ? (
            <PropertyNumber
              label="每个子集行数"
              value={value.length}
              step={1}
              min={1}
              onChange={(length) => onChange({ ...value, length })}
            />
          ) : (
            !groupBound && (
              <p className="property-hint">
                请在数据绑定中选择分组列。缺少或无效的分组值会阻止应用。
              </p>
            )
          )}
          <PropertyCheck
            label="断开子集间连线"
            checked={value.breakConnection}
            onChange={(breakConnection) =>
              onChange({ ...value, breakConnection })
            }
          />
          <CurveStyleListFields
            value={value}
            prefix="子集"
            onChange={(lists) => {
              const next = { ...value };
              delete next.colors;
              delete next.lineDashes;
              delete next.markerShapes;
              onChange({ ...next, ...lists });
            }}
          />
          <p className="property-hint">
            按原始行确定子集编号，排序或抽样后保持编号。样式先于列映射和单点设置生效。
          </p>
        </>
      )}
    </fieldset>
  );
}
