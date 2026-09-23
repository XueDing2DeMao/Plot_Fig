import type { SeriesRow, prepareSeriesRows } from './series-rows.js';
import type { PreparedPlot } from './charts/prepared.js';

export type CurveErrorTransform = (row: SeriesRow) =>
  | {
      xOffset: number;
      yOffset: number;
      yScale: number;
      // 在百分比缩放系数过大时，先除后乘以保留有限的误差端点。
      mapY: (value: number) => number;
    }
  | undefined;

// 合成插值点只用于线条，符号与标签始终使用真实原行。
export type CurveRenderGeometry = {
  lineSegments?: SeriesRow[][] | undefined;
  offset?: { x: number; y: number } | undefined;
  targets?: PreparedPlot[] | undefined;
  sourceRows?: ReturnType<typeof prepareSeriesRows> | undefined;
  errorTransform?: CurveErrorTransform | undefined;
};
