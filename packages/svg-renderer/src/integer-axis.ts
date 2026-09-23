import {
  isAdvancedAxis,
  type Axis,
  type MajorTickGeneration,
} from '@plot-fig/figure-schema';

// 零位定点格式的自动线性轴使用整数格点，避免小数刻度四舍五入后重名。
export function usesIntegerTicks(
  axis: Axis,
  generation: MajorTickGeneration | undefined = axis.majorTicks.generation,
): boolean {
  return (
    axis.scale === 'linear' &&
    !isAdvancedAxis(axis) &&
    axis.tickLabels.notation === 'fixed' &&
    axis.tickLabels.precision === 0 &&
    (!generation || generation.mode === 'auto')
  );
}
