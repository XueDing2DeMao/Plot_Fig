import { useContext } from 'react';
import { isPositiveLogAxis } from '@plot-fig/figure-schema';
import type { AxisDetails } from '../state/figure-details.js';
import {
  PropertyCheck,
  PropertyInput,
  PropertyNumber,
  PropertyNumberDraftContext,
  PropertySelect,
} from './PropertyInputs.js';

type Props = {
  prefix: string;
  value: AxisDetails;
  onChange: (value: AxisDetails) => void;
};

function AnchorField({ prefix, value, onChange }: Props) {
  const draft = useContext(PropertyNumberDraftContext);
  const generation = value.majorTicks.generation;
  if (
    !generation ||
    (generation.mode !== 'increment' && generation.mode !== 'count')
  )
    return null;
  // 空白表示使用默认格点；尚未输入完整的符号和指数保留在对象草稿里。
  const anchor = generation.anchor;
  const label = `${prefix}锚点`;
  const text =
    draft?.texts[label] ??
    (anchor === undefined || Number.isNaN(anchor) ? '' : String(anchor));
  return (
    <PropertyInput
      label={label}
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={isPositiveLogAxis(value) ? '自动（1）' : '自动（0）'}
      aria-invalid={
        (anchor !== undefined &&
          (!Number.isFinite(anchor) ||
            (isPositiveLogAxis(value) && anchor <= 0))) ||
        undefined
      }
      onChange={(event) => {
        const raw = event.target.value;
        draft?.setText(label, raw, [
          'details',
          'majorTicks',
          'generation',
          'anchor',
        ]);
        const next = { ...generation };
        if (!raw.trim()) delete next.anchor;
        else {
          const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
            raw.trim(),
          )
            ? Number(raw)
            : Number.NaN;
          next.anchor = Number.isFinite(number) ? number : Number.NaN;
        }
        onChange({
          ...value,
          majorTicks: { ...value.majorTicks, generation: next },
        });
      }}
    />
  );
}

export function AxisGenerationFields({ prefix, value, onChange }: Props) {
  if (value.scale === 'category') return null;
  const generation = value.majorTicks.generation;
  return (
    <>
      <fieldset className="property-group">
        <legend>主刻度</legend>
        <PropertySelect
          label={`${prefix}主刻度方式`}
          value={generation?.mode ?? 'auto'}
          options={{
            auto: '自动',
            increment: '按增量',
            count: '按数量',
            endpoints: '仅端点',
          }}
          onChange={(mode) => {
            const majorTicks = { ...value.majorTicks };
            if (mode === 'auto') delete majorTicks.generation;
            else
              majorTicks.generation =
                mode === 'increment'
                  ? { mode, step: 1 }
                  : mode === 'count'
                    ? { mode, count: 5 }
                    : { mode };
            onChange({ ...value, majorTicks });
          }}
        />
        {generation?.mode === 'increment' && (
          <PropertyNumber
            label={`${prefix}主刻度增量`}
            fieldPath="details.majorTicks.generation.step"
            value={generation.step}
            step="any"
            onChange={(step) =>
              onChange({
                ...value,
                majorTicks: {
                  ...value.majorTicks,
                  generation: { ...generation, step },
                },
              })
            }
          />
        )}
        {generation?.mode === 'count' && (
          <>
            <PropertyNumber
              label={`${prefix}主刻度目标数量`}
              fieldPath="details.majorTicks.generation.count"
              value={generation.count}
              min={2}
              step={1}
              onChange={(count) =>
                onChange({
                  ...value,
                  majorTicks: {
                    ...value.majorTicks,
                    generation: { ...generation, count },
                  },
                })
              }
            />
            <p className="property-hint">
              2–1000 的整数。按整步长生成近似数量，不改变坐标范围。
            </p>
          </>
        )}
        {(generation?.mode === 'increment' || generation?.mode === 'count') && (
          <>
            <AnchorField prefix={prefix} value={value} onChange={onChange} />
            <p className="property-hint">
              锚点定义刻度格点，可位于范围之外。留空使用默认值。
              {value.symLog &&
                'SymLog 增量在变换空间计算，锚点填写原始数值，可为负数或零。'}
              {value.logTicks?.mode === 'origin-log10' &&
                '窄区间使用原值线性增量；宽区间使用对数增量。'}
              {value.scale === 'log2' &&
                !value.symLog &&
                'Log2 增量 1 表示两倍间隔，锚点填写正的原始数据值。'}
              {value.scale === 'log10' &&
                !value.symLog &&
                !value.logTicks &&
                'Log10 增量在对数空间计算，增量 1 表示十倍间隔；锚点填写正的原始数据值。'}
              {value.scale === 'ln' &&
                !value.symLog &&
                'Ln 增量在对数空间计算，增量 1 表示 e 倍间隔；锚点填写正的原始数据值。'}
            </p>
          </>
        )}
      </fieldset>
      <fieldset className="property-group">
        <legend>次刻度</legend>
        <PropertyCheck
          label={`${prefix}显示次刻度`}
          checked={value.minorTicks.visible}
          onChange={(visible) =>
            onChange({ ...value, minorTicks: { ...value.minorTicks, visible } })
          }
        />
        <PropertyNumber
          label={`${prefix}次刻度数量`}
          fieldPath="details.minorTicks.count"
          value={value.minorTicks.count}
          step={1}
          onChange={(count) =>
            onChange({ ...value, minorTicks: { ...value.minorTicks, count } })
          }
        />
        <p className="property-hint">
          每两个相邻主刻度之间的数量，0–100 的整数。对数轴按显示距离等分。
        </p>
      </fieldset>
    </>
  );
}
