import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { Rect } from './geometry.js';

const POINTS_PER_UNIT = { in: 72, mm: 72 / 25.4, cm: 72 / 2.54, px: 72 / 96 };

export function pageViewport(page: FigureTemplate['page']): Rect {
  const { width, height } = page.size;
  return {
    x: 0,
    y: 0,
    width: width.value * POINTS_PER_UNIT[width.unit],
    height: height.value * POINTS_PER_UNIT[height.unit],
  };
}
