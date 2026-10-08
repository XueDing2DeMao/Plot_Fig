import type { DataValue } from '@plot-fig/data-binding';
import { finite } from './statistics.js';

export const MAX_GRID_CELLS = 40_000;
export const MAX_HEATMAP_CELLS = 100_000;
export const MAX_CONTOUR_WORK = 2_000_000;
const GRID_RELATIVE_TOLERANCE = 1e-9;
const GRID_ABSOLUTE_TOLERANCE = 1e-12;
function stepFor(values: number[], regular: boolean): number {
  if (values.length < 2) {
    if (!regular && values.length === 1) return 1;
    throw new Error('网格 X/Y 各需至少两个坐标');
  }
  const step = values[1]! - values[0]!;
  const tolerance = Math.max(
    GRID_ABSOLUTE_TOLERANCE,
    Math.abs(step) * GRID_RELATIVE_TOLERANCE,
    Number.EPSILON *
      Math.max(Math.abs(values[0]!), Math.abs(values.at(-1)!)) *
      8,
  );
  if (
    !finite(step) ||
    step <= 0 ||
    (regular &&
      values.some(
        (v, i) => i > 0 && Math.abs(v - values[i - 1]! - step) > tolerance,
      ))
  )
    throw new Error('网格坐标必须等间距');
  return step;
}
/** 坐标表示单元中心；非等距热图以相邻中心的中点为边界。 */
export function gridCellBounds(
  values: readonly number[],
  index: number,
): [number, number] {
  const center = values[index]!;
  const low =
    index > 0
      ? values[index - 1]! / 2 + center / 2
      : center - (values.length > 1 ? (values[1]! - center) / 2 : 0.5);
  const high =
    index < values.length - 1
      ? center / 2 + values[index + 1]! / 2
      : center + (values.length > 1 ? (center - values[index - 1]!) / 2 : 0.5);
  if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high)
    throw new Error('热图单元边界超出有限数值范围');
  return [low, high];
}
export type Grid = {
  x: number[];
  y: number[];
  dx: number;
  dy: number;
  values: Array<number | null>;
  skipped: number;
};
function gridRows(columns: { x: DataValue[]; y: DataValue[]; z: DataValue[] }) {
  const rows: Array<{ x: number; y: number; z: number | null }> = [];
  let skipped = 0;
  const count = Math.max(columns.x.length, columns.y.length, columns.z.length);
  for (let i = 0; i < count; i++) {
    const x = columns.x[i],
      y = columns.y[i],
      z = columns.z[i];
    if (!finite(x) || !finite(y)) {
      skipped++;
      continue;
    }
    rows.push({ x, y, z: finite(z) ? z : null });
    if (!finite(z)) skipped++;
  }
  return { rows, skipped };
}
export function prepareGrid(
  columns: { x: DataValue[]; y: DataValue[]; z: DataValue[] },
  complete: boolean,
): Grid {
  const { rows, skipped } = gridRows(columns);
  const x = [...new Set(rows.map((r) => r.x))].sort((a, b) => a - b),
    y = [...new Set(rows.map((r) => r.y))].sort((a, b) => a - b);
  const limit = complete ? MAX_GRID_CELLS : MAX_HEATMAP_CELLS;
  if (x.length * y.length > limit)
    throw new Error(
      `网格超过 ${limit} 个位置（${x.length} × ${y.length}）；多列强度数据请使用“矩阵热图”入口`,
    );
  const dx = stepFor(x, complete),
    dy = stepFor(y, complete);
  const xs = new Map(x.map((v, i) => [v, i])),
    ys = new Map(y.map((v, i) => [v, i]));
  const values: Array<number | null> = Array(x.length * y.length).fill(null),
    used = new Set<number>();
  for (const row of rows) {
    const index = xs.get(row.x)! + ys.get(row.y)! * x.length;
    if (used.has(index)) throw new Error(`重复网格坐标 (${row.x}, ${row.y})`);
    used.add(index);
    values[index] = row.z;
  }
  if (complete && values.some((v) => v === null))
    throw new Error('Contour 需要完整且有限的矩形网格；存在缺失位置或 Z 值');
  if (!values.some(finite)) throw new Error('网格没有有效 Z 值');
  return { x, y, dx, dy, values, skipped };
}
