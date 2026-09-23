import type { Axis } from './schema/axis.js';
import {
  numericScaleCapability,
  type NumericScaleSpec,
} from './numeric-scale.js';
export type AxisScaleSettings = Pick<
  Axis,
  'scale' | 'symLog' | 'logTicks' | 'scaleOptions' | 'advanced'
>;
export function axisScaleSpec(axis: AxisScaleSettings): NumericScaleSpec {
  if (axis.scale === 'category') throw new Error('分类轴不支持数值尺度');
  return {
    kind: axis.scale,
    ...axis.scaleOptions,
    ...(axis.symLog === undefined ? {} : { symLog: axis.symLog }),
  };
}
export function isAdvancedAxis(axis: AxisScaleSettings): boolean {
  return (
    !['linear', 'log10', 'ln', 'category'].includes(axis.scale) ||
    !!axis.advanced ||
    axis.symLog !== undefined ||
    axis.logTicks !== undefined
  );
}
export function isPositiveLogAxis(axis: AxisScaleSettings): boolean {
  return ['log10', 'ln', 'log2'].includes(axis.scale) && !axis.symLog;
}
export function sameAxisScale(
  left: AxisScaleSettings,
  right: AxisScaleSettings,
): boolean {
  return (
    left.scale === right.scale &&
    JSON.stringify(left.scaleOptions) === JSON.stringify(right.scaleOptions) &&
    JSON.stringify(left.advanced?.breaks) ===
      JSON.stringify(right.advanced?.breaks) &&
    JSON.stringify(left.advanced?.link) ===
      JSON.stringify(right.advanced?.link) &&
    JSON.stringify(left.advanced?.categoryOrder) ===
      JSON.stringify(right.advanced?.categoryOrder) &&
    left.symLog?.threshold === right.symLog?.threshold &&
    left.symLog?.linearLength === right.symLog?.linearLength &&
    left.logTicks?.mode === right.logTicks?.mode
  );
}
export function validateAxisScaleSettings(axis: AxisScaleSettings): void {
  if (!isAdvancedAxis(axis)) return;
  if (axis.scale !== 'category') numericScaleCapability(axisScaleSpec(axis));
  if (
    axis.logTicks &&
    (axis.symLog ||
      !['log10', 'ln', 'log2'].includes(axis.scale) ||
      (axis.logTicks.mode === 'origin-log10' && axis.scale !== 'log10'))
  )
    throw new Error('对数刻度策略与尺度不兼容');
}
