import type { DataColumn } from '@plot-fig/data-binding';
import {
  validateMarkerSource as validateSource,
  validateMarkerOverrides,
  type MarkerStyle as AdvancedMarker,
  type MarkerSource,
  type MarkerOverrides,
} from '@plot-fig/figure-schema';
export { validateMarkerOverrides };
export type { MarkerSource, MarkerOverrides };
import type { SeriesRow } from './series-rows.js';
import { sha256 } from './source-fingerprint.js';
export function captureMarkerSource(
  columns: readonly DataColumn[],
  x: DataColumn,
  y: DataColumn,
): MarkerSource {
  if (!x.source || !y.source) throw new Error('单点覆盖需要完整数据来源');
  if (
    x.source.tableId !== y.source.tableId ||
    x.source.dataStartRow !== y.source.dataStartRow
  )
    throw new Error('XY 须来自同一表格数据区');
  const related = columns
    .filter((c) => c.source?.tableId === x.source!.tableId)
    .sort((a, b) =>
      a.columnId < b.columnId ? -1 : a.columnId > b.columnId ? 1 : 0,
    );
  if (new Set(related.map((c) => c.columnId)).size !== related.length)
    throw new Error('数据来源列身份重复');
  if (
    related.length > 256 ||
    related.some(
      (c) =>
        c.source!.dataStartRow !== x.source!.dataStartRow ||
        c.values.length > 100000,
    ) ||
    related.reduce((n, c) => n + c.values.length, 0) > 1000000
  )
    throw new Error('数据来源范围或数量无效');
  for (const target of [x, y]) {
    const match = related.find((c) => c.columnId === target.columnId);
    if (
      !match ||
      match.valueType !== target.valueType ||
      match.values.length !== target.values.length ||
      !match.values.every((v, i) => Object.is(v, target.values[i]))
    )
      throw new Error('XY 数据与来源列不一致');
  }
  const payload = JSON.stringify(
    related.map((c) => [
      c.columnId,
      c.valueType,
      c.values.map((v) =>
        typeof v === 'number' && !Number.isFinite(v)
          ? ['nonfinite', String(v)]
          : v,
      ),
    ]),
  );
  const source = {
    tableId: x.source.tableId,
    xColumnId: x.columnId,
    yColumnId: y.columnId,
    dataStartRow: x.source.dataStartRow,
    fingerprint: 'sha256:' + sha256(payload),
  };
  validateSource(source);
  return source;
}
export function resolveMarkerOverrides(
  saved: MarkerOverrides | undefined,
  current: MarkerSource | undefined,
  rows: readonly SeriesRow[],
) {
  const overrides = new Map<string, Partial<AdvancedMarker>>();
  if (saved === undefined) return { overrides, paused: false, message: '' };
  validateMarkerOverrides(saved);
  if (!current)
    return {
      overrides,
      paused: true,
      message:
        '当前数据缺少来源信息，旧单点覆盖已暂停；请清除后使用有完整来源的数据。',
    };
  validateSource(current);
  if (
    !Object.keys(current).every(
      (k) =>
        saved.source[k as keyof MarkerSource] ===
        current[k as keyof MarkerSource],
    )
  )
    return {
      overrides,
      paused: true,
      message:
        '源数据或绑定列已变化，旧单点覆盖已暂停；请清除后重新选择数据点。',
    };
  const patches = new Map(saved.points.map((p) => [p.row, p.style]));
  for (const row of rows) {
    const physical = current.dataStartRow + row.sourceIndex + 1;
    const identity = JSON.stringify([
      current.tableId,
      current.xColumnId,
      current.yColumnId,
      physical,
      physical,
    ]);
    if (
      row.identity !== identity ||
      row.sourceTableId !== current.tableId ||
      row.sourceRow !== physical
    )
      throw new Error('单点覆盖不能用于其他数据来源');
    const patch = patches.get(row.sourceIndex + 1);
    if (patch) overrides.set(identity, structuredClone(patch));
  }
  return { overrides, paused: false, message: '' };
}
