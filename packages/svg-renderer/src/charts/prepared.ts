import { plotBindingEntries, type PlotSlot } from '@plot-fig/figure-schema';
import type { CurveRenderGeometry } from '../curve-render-geometry.js';
import type {
  CurveFillGeometry,
  CurveTotalLabel,
} from '../curve-transforms.js';
import type { DataBindingSet, DataValue } from '@plot-fig/data-binding';
import type { Grid } from './grid.js';
import type { prepareXyData } from '../xy-data-view.js';
import type { boxSummary } from './statistics.js';
import type { XyzTriangle } from './irregular-grid.js';

export type Category = { key: string; label: string };
export type DataPoint = { x: number; y: number };
export type BarMark = {
  error?: [number, number];
  category?: string;
  low: number;
  high: number;
  start: number;
  end: number;
};
export type BoxMark = ReturnType<typeof boxSummary> & {
  category: string;
  samples: number[];
};
export type DistributionMark = {
  category?: string;
  side?: 'positive' | 'negative';
  split?: string;
  points: Array<{ x: number; y: number }>;
};
export type PreparedPlot = {
  curveGeometry?: CurveRenderGeometry;
  curveFills?: CurveFillGeometry[];
  curveTotals?: CurveTotalLabel[];
  replaceAreaFill?: boolean;
  xyRows?: ReturnType<typeof prepareXyData>;
  errorWarnings?: string[];
  plot: PlotSlot;
  xValues: number[];
  yValues: number[];
  categories: Category[];
  bars: BarMark[];
  boxes: BoxMark[];
  segments: DataPoint[][];
  grid?: Grid;
  irregular?: {
    points: Array<{ x: number; y: number; z: number }>;
    triangles: XyzTriangle[];
    skipped: number;
  };
  distributions?: DistributionMark[];
  statistics?: {
    count: number;
    mean: number;
    sd: number;
    min: number;
    max: number;
  };
  skipped: number;
  bandIndex: number;
  bandCount: number;
};
export function boundColumn(data: DataBindingSet, slotId: string): DataValue[] {
  const binding = data.bindings.find(
    (b) => b.dataSlotId === slotId && b.status === 'valid',
  );
  const column =
    binding && data.columns.find((c) => c.columnId === binding.columnId);
  if (!column) throw new Error(`数据槽 ${slotId} 尚未绑定可用数据列`);
  return column.values;
}
export function category(value: DataValue | undefined): Category {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'number' && !Number.isFinite(value))
  )
    throw new Error('类别不能为空或非有限数值');
  return {
    key: typeof value === 'number' ? 'n:' + value : 's:' + value,
    label: String(value),
  };
}
export function rowLocation(
  data: DataBindingSet,
  slotId: string,
  index: number,
) {
  const binding = data.bindings.find((b) => b.dataSlotId === slotId);
  const column = data.columns.find((c) => c.columnId === binding?.columnId);
  return column?.source
    ? `${column.source.tableName} · ${column.name}，源第 ${column.source.dataStartRow + index + 1} 行`
    : `第 ${index + 1} 个绘图数据行`;
}
export function describePlotFailure(
  plot: PlotSlot,
  data: DataBindingSet,
  cause: unknown,
) {
  const inputs = plotBindingEntries(plot).flatMap(({ slotId, label }) => {
    const binding = data.bindings.find((b) => b.dataSlotId === slotId);
    const column = data.columns.find((c) => c.columnId === binding?.columnId);
    return column?.source
      ? [`${label}: ${column.source.tableName}/${column.name}`]
      : [];
  });
  const message = cause instanceof Error ? cause.message : String(cause);
  return inputs.length ? `${message}（${inputs.join('；')}）` : message;
}
