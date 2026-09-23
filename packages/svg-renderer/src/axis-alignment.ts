import type { Axis, Panel } from '@plot-fig/figure-schema';
import {
  axisScaleSpec,
  numericScaleCapability,
  isAdvancedAxis,
} from '@plot-fig/figure-schema';
import { createScale, type PlotScale } from './scales.js';

export type AxisAlignmentResult =
  | {
      ok: true;
      scales: Map<string, PlotScale>;
      warning?: string;
    }
  | {
      ok: false;
      scales: Map<string, PlotScale>;
      message: string;
    };

export function alignYAxisScales(
  panel: Panel,
  scales: Map<string, PlotScale>,
): AxisAlignmentResult {
  const result = new Map(scales);
  const alignment = panel.yAxisAlignment;
  if (!alignment) return { ok: true, scales: result };
  const left = panel.axes.find((axis) => axis.axisId === alignment.leftAxisId);
  const right = panel.axes.find(
    (axis) => axis.axisId === alignment.rightAxisId,
  );
  if (!left || !right)
    return {
      ok: false,
      scales: result,
      message: '双 Y 对齐引用的坐标轴不存在',
    };
  const leftScale = result.get(left.axisId);
  const rightScale = result.get(right.axisId);
  if (!leftScale)
    return {
      ok: true,
      scales: result,
      warning: '左 Y 轴暂无可用于自动范围的数据',
    };
  if (!rightScale)
    return {
      ok: true,
      scales: result,
      warning: '右 Y 轴暂无可用于自动范围的数据',
    };
  const value = alignment.value;
  const valueT = transform(left, value);
  if (!Number.isFinite(valueT))
    return {
      ok: false,
      scales: result,
      message: 'Y 轴对齐值不在坐标轴定义域内',
    };
  const expandedLeft = extendPrimary(left, leftScale, value, valueT);
  if (!expandedLeft.ok)
    return { ok: false, scales: result, message: expandedLeft.message };
  const target = expandedLeft.scale.map(value);
  const alignedRight = alignSecondary(right, rightScale, value, target);
  if (!alignedRight.ok)
    return { ok: false, scales: result, message: alignedRight.message };
  result.set(left.axisId, {
    ...expandedLeft.scale,
    ...(leftScale.data ? { data: leftScale.data } : {}),
  });
  result.set(right.axisId, {
    ...alignedRight.scale,
    ...(rightScale.data ? { data: rightScale.data } : {}),
  });
  return { ok: true, scales: result };
}

type ScaleResult =
  { ok: true; scale: PlotScale } | { ok: false; message: string };

type ConstraintMode = 'auto' | 'fixed' | 'min-only' | 'max-only';

function constraintMode(axis: Axis): ConstraintMode {
  const policy = axis.rescale?.mode;
  if (policy === 'auto') return 'auto';
  if (policy?.startsWith('fixed-min-')) return 'min-only';
  if (policy?.startsWith('fixed-max-')) return 'max-only';
  if (
    policy === 'fixed' ||
    (policy === 'normal' && axis.range.mode === 'fixed')
  )
    return 'fixed';
  return axis.range.mode;
}

function orientation(axis: Axis) {
  if (axis.scale === 'reciprocal' || axis.scale === 'offset-reciprocal')
    return -1;
  if (axis.scale === 'custom' && axis.scaleOptions?.formula) {
    const f = axis.scaleOptions.formula,
      c = numericScaleCapability(axisScaleSpec(axis));
    return c.forward(f.min) > c.forward(f.max) ? -1 : 1;
  }
  return 1;
}
function transform(axis: Axis, value: number): number {
  if (isAdvancedAxis(axis))
    return (
      orientation(axis) *
      numericScaleCapability(axisScaleSpec(axis)).forward(value)
    );
  if (axis.scale === 'log10') return value > 0 ? Math.log10(value) : NaN;
  if (axis.scale === 'ln') return value > 0 ? Math.log(value) : NaN;
  return value;
}

function inverse(axis: Axis, value: number): number {
  if (isAdvancedAxis(axis))
    return numericScaleCapability(axisScaleSpec(axis)).inverse(
      value * orientation(axis),
    );
  if (axis.scale === 'log10') return 10 ** value;
  if (axis.scale === 'ln') return Math.exp(value);
  return value;
}

function scaleFromTransformed(
  axis: Axis,
  min: number,
  max: number,
): PlotScale | undefined {
  return createScale(axis, inverse(axis, min), inverse(axis, max));
}

function extendPrimary(
  axis: Axis,
  scale: PlotScale,
  value: number,
  valueT: number,
): ScaleResult {
  const mode = constraintMode(axis);
  let min = transform(axis, scale.min);
  let max = transform(axis, scale.max);
  if (valueT < min) {
    if (mode === 'fixed' || mode === 'min-only')
      return {
        ok: false,
        message: `左 Y 轴固定范围不包含对齐值 ${value}`,
      };
    min = valueT;
  }
  if (valueT > max) {
    if (mode === 'fixed' || mode === 'max-only')
      return {
        ok: false,
        message: `左 Y 轴固定范围不包含对齐值 ${value}`,
      };
    max = valueT;
  }
  const next = scaleFromTransformed(axis, min, max);
  return next
    ? { ok: true, scale: next }
    : { ok: false, message: '左 Y 轴无法生成有效对齐范围' };
}

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9;
}

function fixedSecondary(
  axis: Axis,
  scale: PlotScale,
  value: number,
  target: number,
): ScaleResult {
  return Number.isFinite(scale.map(value)) && close(scale.map(value), target)
    ? { ok: true, scale }
    : {
        ok: false,
        message: `右 Y 轴固定范围无法满足对齐值 ${value}`,
      };
}

function solveAutomatic(
  valueT: number,
  min: number,
  max: number,
  position: number,
): { min: number; max: number } | undefined {
  if (close(position, 0))
    return min < valueT && !close(min, valueT)
      ? undefined
      : { min: valueT, max: Math.max(max, valueT + (max - min)) };
  if (close(position, 1))
    return max > valueT && !close(max, valueT)
      ? undefined
      : { min: Math.min(min, valueT - (max - min)), max: valueT };
  const span = Math.max(
    (valueT - min) / position,
    (max - valueT) / (1 - position),
  );
  if (!Number.isFinite(span) || span <= 0) return undefined;
  return {
    min: valueT - position * span,
    max: valueT + (1 - position) * span,
  };
}

function solveSingleBound(
  axis: Axis,
  valueT: number,
  baseMin: number,
  baseMax: number,
  position: number,
): { min: number; max: number } | undefined {
  const mode = constraintMode(axis);
  if (mode === 'min-only') {
    const min = transform(axis, 'min' in axis.range ? axis.range.min : baseMin);
    if (close(position, 0))
      return close(min, valueT) && baseMax > min
        ? { min, max: baseMax }
        : undefined;
    const max = min + (valueT - min) / position;
    return max >= baseMax && max > min ? { min, max } : undefined;
  }
  if (mode === 'max-only') {
    const max = transform(axis, 'max' in axis.range ? axis.range.max : baseMax);
    if (close(position, 1))
      return close(max, valueT) && baseMin < max
        ? { min: baseMin, max }
        : undefined;
    const min = max - (max - valueT) / (1 - position);
    return min <= baseMin && min < max ? { min, max } : undefined;
  }
  return solveAutomatic(valueT, baseMin, baseMax, position);
}

function alignSecondary(
  axis: Axis,
  scale: PlotScale,
  value: number,
  target: number,
): ScaleResult {
  if (constraintMode(axis) === 'fixed')
    return fixedSecondary(axis, scale, value, target);
  const valueT = transform(axis, value);
  if (!Number.isFinite(valueT))
    return { ok: false, message: 'Y 轴对齐值不在右轴定义域内' };
  const position = axis.reverse ? 1 - target : target;
  const range = solveSingleBound(
    axis,
    valueT,
    transform(axis, scale.min),
    transform(axis, scale.max),
    position,
  );
  const next = range && scaleFromTransformed(axis, range.min, range.max);
  return next
    ? { ok: true, scale: next }
    : {
        ok: false,
        message: `右 Y 轴范围无法在保留全部数据时对齐值 ${value}`,
      };
}
