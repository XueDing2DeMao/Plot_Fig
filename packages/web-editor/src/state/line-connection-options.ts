import type { XyPlot } from '@plot-fig/figure-schema';

export const lineConnectionOptions = {
  straight: '直线',
  'step-h': '水平优先阶梯线',
  'step-v': '垂直优先阶梯线',
  spline: '自然三次样条',
} satisfies Record<NonNullable<XyPlot['lineConnection']>, string>;
