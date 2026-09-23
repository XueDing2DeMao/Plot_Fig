import type { AxisLengthRatio } from '@plot-fig/figure-schema';
import { formatNumber, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';

export type AxisLengthRatioStatus = 'off' | 'pending' | 'active';

function logSpan(scale: PlotScale): number {
  if (
    scale.scale !== 'linear' ||
    !Number.isFinite(scale.min) ||
    !Number.isFinite(scale.max) ||
    !(scale.max > scale.min)
  )
    throw new RangeError('数据比例需要有效的线性坐标范围');
  const span = scale.max - scale.min;
  // 两端都有限但跨度溢出时，先折半再求对数。
  return Number.isFinite(span)
    ? Math.log(span)
    : Math.log(scale.max / 2 - scale.min / 2) + Math.LN2;
}

export function constrainAxisLengths(
  geometry: { layer: Rect; plot: Rect },
  ratio: AxisLengthRatio | undefined,
  scales: ReadonlyMap<string, PlotScale>,
): { layer: Rect; plot: Rect; status: AxisLengthRatioStatus } {
  if (!ratio) return { ...geometry, status: 'off' };
  if (!Number.isFinite(ratio.ratio) || ratio.ratio <= 0)
    throw new RangeError('X:Y 数据比例必须为正的有限数');
  const x = scales.get(ratio.xAxisId),
    y = scales.get(ratio.yAxisId);
  if (!x || !y) return { ...geometry, status: 'pending' };
  const original = geometry.plot;
  if (
    !Object.values(original).every(Number.isFinite) ||
    !(original.width > 0 && original.height > 0)
  )
    throw new RangeError('可用绘图区无效');
  const target = Math.log(ratio.ratio) + logSpan(x) - logSpan(y);
  const plot = { ...original };
  if (Math.log(original.width) - Math.log(original.height) > target)
    plot.width = Math.min(
      original.width,
      Math.exp(Math.log(original.height) + target),
    );
  else
    plot.height = Math.min(
      original.height,
      Math.exp(Math.log(original.width) - target),
    );
  if (
    !(plot.width > 0 && plot.height > 0) ||
    !Number.isFinite(plot.width) ||
    !Number.isFinite(plot.height) ||
    Number(formatNumber(plot.width)) === 0 ||
    Number(formatNumber(plot.height)) === 0 ||
    Number(formatNumber(plot.x + plot.width)) <= Number(formatNumber(plot.x)) ||
    Number(formatNumber(plot.y + plot.height)) <= Number(formatNumber(plot.y))
  )
    throw new RangeError(
      '该范围与比例生成的轴长超出数值精度，请调整数据比例或范围',
    );
  const stripWidth = geometry.layer.width - original.width;
  return {
    layer: {
      ...plot,
      width: plot.width + stripWidth,
      // 色标条带独立于数据比例保留可用高度，背景覆盖其实际边界。
      height:
        stripWidth > 0
          ? Math.max(plot.height, Math.min(60, geometry.layer.height))
          : plot.height,
    },
    plot,
    status: 'active',
  };
}
