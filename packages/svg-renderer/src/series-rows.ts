import type { DataColumn } from '@plot-fig/data-binding';
import type { XyDataView } from '@plot-fig/figure-schema';

// 保留原始行身份，绘制顺序和抽样不得重编号。
export type SeriesRow = Readonly<{
  sourceIndex: number;
  sourceRow?: number;
  sourceTableId?: string;
  identity?: string;
  x: number;
  y: number;
}>;
export type SeriesSampling = NonNullable<XyDataView['sampling']>;
export type SeriesRowOptions = XyDataView;
const MAX_ROWS = 100_000;
function integer(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`${label}须为 ${min}–${max} 的整数`);
}
function validateOptions(options: SeriesRowOptions) {
  if (!['raw', 'selected'].includes(options.calculationSource ?? 'raw'))
    throw new Error('无效的计算数据来源');
  if (!['connect', 'break'].includes(options.missing ?? 'connect'))
    throw new Error('无效的缺失点处理方式');
  if (!['none', 'x-ascending', 'x-descending'].includes(options.sort ?? 'none'))
    throw new Error('无效的数据排序');
  if (!['keep', 'first', 'last'].includes(options.duplicates ?? 'keep'))
    throw new Error('无效的重复 X 处理方式');
  if (options.rowRange) {
    integer(options.rowRange.from, 1, MAX_ROWS, '起始数据行');
    integer(options.rowRange.to, options.rowRange.from, MAX_ROWS, '结束数据行');
  }
  const s = options.sampling;
  if (s) {
    if (s.mode === 'every') integer(s.step, 1, MAX_ROWS, '抽样间隔');
    else if (s.mode === 'count') integer(s.count, 1, MAX_ROWS, '抽样点数');
    else throw new Error('无效的抽样方式');
    for (const flag of [s.keepFirst, s.keepLast])
      if (flag !== undefined && typeof flag !== 'boolean')
        throw new Error('保留端点须为开关值');
  }
  if (
    options.sampleExport !== undefined &&
    typeof options.sampleExport !== 'boolean'
  )
    throw new Error('导出抽样须为开关值');
}

function rowIdentity(x: DataColumn, y: DataColumn, index: number) {
  if (!x.source || !y.source || x.source.tableId !== y.source.tableId)
    return {};
  const sourceRow = x.source.dataStartRow + index + 1;
  return {
    sourceRow,
    sourceTableId: x.source.tableId,
    identity: JSON.stringify([
      x.source.tableId,
      x.columnId,
      y.columnId,
      sourceRow,
      y.source.dataStartRow + index + 1,
    ]),
  };
}

function sortSegment(
  segment: SeriesRow[],
  options: SeriesRowOptions,
): SeriesRow[] {
  let rows = segment;
  if (options.duplicates && options.duplicates !== 'keep') {
    const byX = new Map<number, SeriesRow>();
    for (const row of rows)
      if (options.duplicates === 'last' || !byX.has(row.x)) byX.set(row.x, row);
    rows = rows.filter((row) => byX.get(row.x) === row);
  }
  if (options.sort && options.sort !== 'none') {
    const direction = options.sort === 'x-ascending' ? 1 : -1;
    rows = [...rows].sort(
      (a, b) => direction * (a.x - b.x) || a.sourceIndex - b.sourceIndex,
    );
  }
  return rows;
}

function evenlySpaced<T>(items: T[], count: number): T[] {
  if (!count) return [];
  if (count === 1) return items.length ? [items[0]!] : [];
  return Array.from(
    { length: count },
    (_, i) => items[Math.round((i * (items.length - 1)) / (count - 1))]!,
  );
}
function sampleSegments(
  segments: SeriesRow[][],
  sampling?: SeriesSampling,
): SeriesRow[][] {
  if (!sampling) return segments.map((s) => [...s]);
  if (sampling.mode === 'every')
    return segments.map((rows) =>
      rows.filter(
        (_, i) =>
          i % sampling.step === 0 ||
          (sampling.keepLast && i === rows.length - 1),
      ),
    );
  const all = segments.flat();
  if (sampling.count >= all.length) return segments.map((s) => [...s]);
  const keep = new Set<SeriesRow>();
  for (const rows of segments) {
    if (sampling.keepFirst && rows[0]) keep.add(rows[0]);
    if (sampling.keepLast && rows.at(-1)) keep.add(rows.at(-1)!);
  }
  if (keep.size > sampling.count)
    throw new Error('抽样点数不足以保留所有分段端点，请增加点数或取消端点例外');
  // 在全曲线等距点位中补足配额，不能在剔除端点后的数组头部重新起算。
  const indices = new Map(all.map((row, index) => [row, index]));
  const distances = new Array<number>(all.length).fill(Infinity);
  let previous = -Infinity;
  for (let i = 0; i < all.length; i++) {
    if (keep.has(all[i]!)) previous = i;
    distances[i] = i - previous;
  }
  previous = Infinity;
  for (let i = all.length - 1; i >= 0; i--) {
    if (keep.has(all[i]!)) previous = i;
    distances[i] = Math.min(distances[i]!, previous - i);
  }
  const candidates = evenlySpaced(all, sampling.count).filter(
    (row) => !keep.has(row),
  );
  candidates.sort((a, b) => {
    const ia = indices.get(a)!,
      ib = indices.get(b)!;
    return distances[ib]! - distances[ia]! || ia - ib;
  });
  for (const row of candidates.slice(0, sampling.count - keep.size))
    keep.add(row);
  return segments.map((rows) => rows.filter((row) => keep.has(row)));
}

export function prepareSeriesRows(
  x: DataColumn,
  y: DataColumn,
  options: SeriesRowOptions = {},
  inDomain: (row: SeriesRow) => boolean = () => true,
) {
  validateOptions(options);
  if (
    x.source &&
    y.source &&
    (x.source.tableId !== y.source.tableId ||
      x.source.dataStartRow !== y.source.dataStartRow)
  )
    throw new Error('XY 数据须来自同一表格数据区');
  const sourceCount = Math.min(x.values.length, y.values.length);
  if (sourceCount > MAX_ROWS) throw new Error('曲线数据超过十万行上限');
  const rawRows: SeriesRow[] = [],
    segments: SeriesRow[][] = [];
  let current: SeriesRow[] = [],
    invalidCount = 0;
  const range = options.rowRange;
  for (let index = 0; index < sourceCount; index++) {
    const xv = x.values[index],
      yv = y.values[index];
    const valid =
      typeof xv === 'number' &&
      typeof yv === 'number' &&
      Number.isFinite(xv) &&
      Number.isFinite(yv);
    const row = valid
      ? { sourceIndex: index, x: xv, y: yv, ...rowIdentity(x, y, index) }
      : undefined;
    if (row) rawRows.push(row);
    if (range && (index + 1 < range.from || index + 1 > range.to)) continue;
    if (!row || !inDomain(row)) {
      invalidCount++;
      if (options.missing === 'break' && current.length) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push(row);
  }
  if (current.length) segments.push(current);
  const selectedSegments = segments.map((segment) =>
    sortSegment(segment, options),
  );
  const displaySegments = sampleSegments(selectedSegments, options.sampling);
  return {
    sourceCount,
    invalidCount,
    rawRows,
    selectedRows: selectedSegments.flat(),
    calculationRows:
      options.calculationSource === 'selected'
        ? selectedSegments.flat()
        : rawRows,
    segments: selectedSegments,
    displaySegments,
    exportSegments: options.sampleExport ? displaySegments : selectedSegments,
  };
}
