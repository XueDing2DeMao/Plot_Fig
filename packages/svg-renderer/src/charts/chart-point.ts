import type { Rect } from '../geometry.js';
import type { PlotScale } from '../scales.js';
export type ChartContext = {
  rect: Rect;
  xScale: PlotScale;
  yScale: PlotScale;
  dataClip?: import('../data-clip.js').DataClip;
  clipSuffix?: string;
};
export function point(context: ChartContext, x: number, y: number) {
  if (context.dataClip) {
    const c = context.dataClip;
    if (!Number.isFinite(context.xScale.map(x)))
      x = Math.max(c.xMin, Math.min(c.xMax, x));
    if (!Number.isFinite(context.yScale.map(y)))
      y = Math.max(c.yMin, Math.min(c.yMax, y));
  }
  const result = {
    x: context.rect.x + context.xScale.map(x) * context.rect.width,
    y: context.rect.y + (1 - context.yScale.map(y)) * context.rect.height,
  };
  if (!Number.isFinite(result.x) || !Number.isFinite(result.y))
    throw new Error('绘图坐标超出有限数值范围');
  return result;
}
