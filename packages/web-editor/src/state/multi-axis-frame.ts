import type { FigureTemplate } from '@plot-fig/figure-schema';
import { pageRect } from './page-geometry.js';

/** 仅在显式应用多纵轴预设时调整留白，不改写加载后的历史图形。 */
export function reserveMultiAxisFrame(template: FigureTemplate): void {
  const page = pageRect(template.page);
  const space = { left: 0, right: 0 };
  for (const panel of template.panels) {
    for (const axis of panel.axes) {
      if (!axis.visible || axis.dimension !== 'y') continue;
      const side = axis.position === 'left' ? 'left' : 'right';
      const outward = side === 'left' ? -1 : 1;
      // 普通轴标题距轴线 42 pt，再为字形与页面边缘留空间。
      const title = axis.title?.text
        ? 42 +
          axis.title.fontSizePt +
          8 +
          outward * (axis.title.offsetPt?.x ?? 0)
        : 0;
      const ticks = axis.tickLabels.visible
        ? 6 +
          axis.tickLabels.fontSizePt * 4 +
          outward * (axis.tickLabels.offsetPt?.x ?? 0)
        : 0;
      space[side] = Math.max(
        space[side],
        (axis.placement?.offsetPt ?? 0) + Math.max(title, ticks),
      );
    }
  }
  const base = template.panels[0]!;
  const left = Math.max(
    base.frame.x,
    (space.left + template.page.margins.left) / page.width,
  );
  const right = Math.min(
    base.frame.x + base.frame.width,
    1 - (space.right + template.page.margins.right) / page.width,
  );
  if ((right - left) * page.width < 60)
    throw new Error('页面宽度不足以排列多纵轴，请增大页面宽度或减少纵轴数量');
  for (const panel of template.panels)
    panel.frame = { ...panel.frame, x: left, width: right - left };
}
