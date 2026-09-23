import type { Paint } from '@plot-fig/figure-schema';
import {
  validateCurveTransforms,
  type CurveOffset,
  type CurveTransform,
  type Panel,
  type PanelStack,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { DataPoint, PreparedPlot } from './charts/prepared.js';
import type { SeriesRow } from './series-rows.js';
import { preparePlot } from './charts/prepare.js';
import type { CurveErrorTransform } from './curve-render-geometry.js';
import { prepareCurveSubset } from './curve-groups.js';

type TransformPanel = Panel & { stack?: PanelStack };
type TransformPlot = PlotSlot & { transform?: CurveTransform };
export type CurveFillGeometry = {
  paint?: Paint | undefined;
  positive?: boolean;
  plotSlotId: string;
  points: DataPoint[];
  color: string;
  opacity: number;
};
export type CurveTotalLabel = {
  plotSlotId: string;
  x: number;
  y: number;
  value: number;
  text: string;
  color: string;
  fontSizePt: number;
};
export type CurveMetadata = Record<string, { name?: string; unit?: string }>;
export const CURVE_GEOMETRY_LIMIT = 200000;
const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`${label}超出有限数值范围`);
  return value;
};
function zeroFraction(from: number, to: number) {
  const magnitude = Math.max(Math.abs(from), Math.abs(to));
  return from / magnitude / (from / magnitude - to / magnitude);
}
function supported(plot: PlotSlot) {
  return plot.kind === 'xy' || plot.kind === 'area';
}
function compatible(a: PlotSlot, b: PlotSlot) {
  return a.xAxisId === b.xAxisId && a.yAxisId === b.yAxisId;
}

/** 只在连续段内作线性插值；不同段的覆盖区间不能重叠。 */
export function createCurveInterpolator(
  segments: readonly (readonly DataPoint[])[],
) {
  let count = 0;
  const seen = new Set<number>();
  const ordered = segments
    .filter((s) => s.length)
    .map((segment) => {
      const points = [...segment].sort((a, b) => a.x - b.x);
      for (const p of points) {
        finite(p.x, '插值 X');
        finite(p.y, '插值 Y');
        if (seen.has(p.x))
          throw new Error('曲线存在重复 X，无法确定唯一插值；请先处理重复 X');
        seen.add(p.x);
        if (++count > CURVE_GEOMETRY_LIMIT)
          throw new Error('曲线插值超过二十万点上限');
      }
      return points;
    })
    .sort((a, b) => a[0]!.x - b[0]!.x);
  for (let i = 1; i < ordered.length; i++)
    if (ordered[i - 1]!.at(-1)!.x >= ordered[i]![0]!.x)
      throw new Error('曲线不同连续段的 X 区间重叠，无法确定唯一插值');
  const interpolate = (x: number): number | undefined => {
    finite(x, '插值 X');
    let lo = 0,
      hi = ordered.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1,
        points = ordered[mid]!;
      if (x < points[0]!.x) {
        hi = mid - 1;
        continue;
      }
      if (x > points.at(-1)!.x) {
        lo = mid + 1;
        continue;
      }
      let a = 0,
        b = points.length - 1;
      while (a <= b) {
        const m = (a + b) >> 1,
          p = points[m]!;
        if (p.x === x) return p.y;
        if (p.x < x) a = m + 1;
        else b = m - 1;
      }
      const from = points[b]!,
        to = points[a]!;
      const span = to.x - from.x,
        t = Number.isFinite(span)
          ? (x - from.x) / span
          : (x / 2 - from.x / 2) / (to.x / 2 - from.x / 2);
      return finite(from.y * (1 - t) + to.y * t, '线性插值');
    }
    return undefined;
  };
  return Object.assign(interpolate, {
    segments: ordered,
    knots: ordered.flatMap((s) => s.map((p) => p.x)),
  });
}
function offsetIndex(
  panel: Panel,
  items: PreparedPlot[],
  item: PreparedPlot,
  scope: CurveOffset['scope'],
) {
  const eligible = items.filter(
    (p) => p.plot.visible !== false && supported(p.plot),
  );
  const group = panel.groups?.find((g) =>
    g.members.includes(item.plot.plotSlotId),
  );
  if (scope === 'within-group') {
    if (!group) throw new Error('组内偏移要求曲线属于一个曲线组');
    const byId = new Map(eligible.map((p) => [p.plot.plotSlotId, p]));
    const members = group.members.flatMap((id) => {
      const member = byId.get(id);
      return member ? [member] : [];
    });
    return { index: members.indexOf(item), members };
  }
  if (scope === 'between-groups') {
    const key = (p: PreparedPlot) => {
      let owner = panel.groups?.find((g) =>
        g.members.includes(p.plot.plotSlotId),
      );
      while (owner?.parentId)
        owner = panel.groups?.find((g) => g.groupId === owner!.parentId);
      return owner ? 'group:' + owner.groupId : 'plot:' + p.plot.plotSlotId;
    };
    return {
      index: [...new Set(eligible.map(key))].indexOf(key(item)),
      members: eligible,
    };
  }
  return { index: eligible.indexOf(item), members: eligible };
}
function offsetFor(
  setting: CurveOffset | undefined,
  dimension: 'x' | 'y',
  panel: Panel,
  items: PreparedPlot[],
  item: PreparedPlot,
  data: DataBindingSet,
  metadata: CurveMetadata,
) {
  if (!setting) return 0;
  const { index, members } = offsetIndex(panel, items, item, setting.scope);
  if (setting.mode === 'constant') return setting.value;
  if (setting.mode === 'increment')
    return finite(index * setting.value, '逐曲线偏移');
  if (setting.mode === 'list') {
    const v = setting.values[index];
    if (v === undefined)
      throw new Error(`偏移列表缺少第 ${index + 1} 条曲线的数值`);
    return v;
  }
  if (setting.mode === 'auto') {
    let span = 0;
    for (const member of members) {
      let min = Infinity,
        max = -Infinity;
      for (const v of dimension === 'x' ? member.xValues : member.yValues) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
      if (min <= max) span = Math.max(span, max - min);
    }
    return finite(index * (span || 1) * (1 + setting.gap), '自动偏移');
  }
  const p = item.plot;
  if (p.kind !== 'xy' && p.kind !== 'area')
    throw new Error('元数据偏移仅支持 XY 或面积曲线');
  const binding = data.bindings.find(
    (b) => b.dataSlotId === p.bindings.y && b.status === 'valid',
  );
  const column =
    binding && data.columns.find((c) => c.columnId === binding.columnId);
  const text = column
    ? (metadata[column.columnId]?.[setting.metadata] ??
      (setting.metadata === 'name' ? column.name : column.unit))
    : undefined;
  if (
    text === undefined ||
    !/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(text.trim()) ||
    !Number.isFinite(Number(text))
  )
    throw new Error(
      `绑定 Y 列的${setting.metadata === 'name' ? '名称' : '单位'}须为完整的有限数值，不能含其他文字`,
    );
  return Number(text);
}
export function materializeCurveOffsets(
  panel: Panel,
  plotSlotId: string,
  data?: DataBindingSet,
) {
  const plot = panel.plotSlots.find((p) => p.plotSlotId === plotSlotId) as
    TransformPlot | undefined;
  if (!plot) throw new Error('找不到需要物化偏移的曲线');
  const settings = plot.transform;
  const dynamic = (o: CurveOffset | undefined) =>
    o && ['increment', 'auto', 'list'].includes(o.mode);
  if (!settings || (!dynamic(settings.offsetX) && !dynamic(settings.offsetY)))
    return structuredClone(settings);
  if (
    !data &&
    [settings.offsetX, settings.offsetY].some((o) => o?.mode === 'auto')
  )
    throw new Error('复制或移动自动偏移曲线需要已绑定的原始数据');
  const input = panel.plotSlots
    .filter((p) => supported(p) && p.visible !== false)
    .map((p) =>
      data
        ? preparePlot(p, data, panel.axes)
        : ({
            plot: p,
            xValues: [],
            yValues: [],
            categories: [],
            bars: [],
            boxes: [],
            segments: [],
            skipped: 0,
            bandIndex: 0,
            bandCount: 1,
          } satisfies PreparedPlot),
    );
  const item = input.find((p) => p.plot.plotSlotId === plotSlotId);
  if (!item) return structuredClone(settings);
  const empty: DataBindingSet = {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'session', name: 'curve offset', rowCount: 0 },
    columns: [],
    bindings: [],
    diagnostics: [],
  };
  const next = structuredClone(settings);
  for (const [key, dim] of [
    ['offsetX', 'x'],
    ['offsetY', 'y'],
  ] as const)
    if (dynamic(settings[key]))
      next[key] = {
        mode: 'constant',
        value: offsetFor(
          settings[key],
          dim,
          panel,
          input,
          item,
          data ?? empty,
          {},
        ),
      };
  return next;
}
function mapSegments<T extends DataPoint>(
  segments: T[][],
  map: (row: T) => T | undefined,
): T[][] {
  const result: T[][] = [];
  for (const segment of segments) {
    let current: T[] = [];
    for (const row of segment) {
      const next = map(row);
      if (next) current.push(next);
      else if (current.length) {
        result.push(current);
        current = [];
      }
    }
    if (current.length) result.push(current);
  }
  return result;
}
function mapPrepared(
  item: PreparedPlot,
  map: <T extends DataPoint>(row: T) => T | undefined,
): PreparedPlot {
  const next = { ...item, segments: mapSegments(item.segments, map) };
  if (item.xyRows) {
    const r = item.xyRows;
    const rows = (items: SeriesRow[]) =>
      items.flatMap((row) => {
        const next = map(row);
        return next ? [next] : [];
      });
    next.xyRows = {
      ...r,
      rawRows: rows(r.rawRows),
      selectedRows: rows(r.selectedRows),
      calculationRows: rows(r.calculationRows),
      segments: mapSegments(r.segments, map),
      displaySegments: mapSegments(r.displaySegments, map),
      exportSegments: mapSegments(r.exportSegments, map),
    };
    next.segments = next.xyRows.segments;
  }
  const range = next.xyRows?.calculationRows ?? next.segments.flat();
  next.xValues = range.map((r) => r.x);
  next.yValues = range.map((r) => r.y);
  return next;
}
function polygons(
  top: DataPoint[],
  bottom: (x: number) => number | undefined,
  knots: number[],
  plotSlotId: string,
  positiveColor: string,
  negativeColor: string,
  opacity: number,
  spendWork: (amount: number) => void,
): CurveFillGeometry[] {
  if (top.length < 2) return [];
  const sourceSearch = Math.ceil(Math.log2(top.length + 1));
  const targetSearch = Math.ceil(Math.log2(knots.length + 1));
  spendWork(top.length * sourceSearch + 2 * targetSearch);
  const interp = createCurveInterpolator([top]),
    min = interp.knots[0]!,
    max = interp.knots.at(-1)!;
  const boundary = (value: number, inclusive: boolean) => {
    let low = 0,
      high = knots.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (knots[middle]! < value || (inclusive && knots[middle] === value))
        low = middle + 1;
      else high = middle;
    }
    return low;
  };
  const first = boundary(min, true),
    last = boundary(max, false);
  const xs = [
    ...new Set([...top.map((p) => p.x), ...knots.slice(first, last)]),
  ].sort((a, b) => a - b);
  // 包括源/目标二分查询与缺口检查；没有输出多边形时也计入预算。
  spendWork(
    Math.max(0, xs.length - 1) * (2 * sourceSearch + 3 * targetSearch + 4),
  );
  const result: CurveFillGeometry[] = [];
  for (let i = 1; i < xs.length; i++) {
    const x0 = xs[i - 1]!,
      x1 = xs[i]!,
      y0 = interp(x0),
      y1 = interp(x1),
      b0 = bottom(x0),
      b1 = bottom(x1);
    if (
      y0 === undefined ||
      y1 === undefined ||
      b0 === undefined ||
      b1 === undefined ||
      bottom(x0 / 2 + x1 / 2) === undefined
    )
      continue;
    const emit = (
      a: DataPoint,
      b: DataPoint,
      c: DataPoint,
      d: DataPoint,
      positive: boolean,
    ) => {
      if ((result.length + 1) * 4 > CURVE_GEOMETRY_LIMIT)
        throw new Error('曲线填充超过二十万几何点上限，请减少数据点');
      result.push({
        plotSlotId,
        points: [a, b, c, d],
        positive,
        color: positive ? positiveColor : negativeColor,
        opacity,
      });
    };
    const d0 = finite(y0 - b0, '填充跨度'),
      d1 = finite(y1 - b1, '填充跨度');
    if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
      const t = zeroFraction(d0, d1),
        cross = {
          x: finite(x0 * (1 - t) + x1 * t, '填充交点'),
          y: finite(b0 * (1 - t) + b1 * t, '填充交点'),
        };
      emit({ x: x0, y: y0 }, cross, cross, { x: x0, y: b0 }, d0 >= 0);
      emit(cross, { x: x1, y: y1 }, { x: x1, y: b1 }, cross, d1 >= 0);
    } else
      emit(
        { x: x0, y: y0 },
        { x: x1, y: y1 },
        { x: x1, y: b1 },
        { x: x0, y: b0 },
        d0 >= 0 && d1 >= 0,
      );
  }
  return result;
}

export function prepareCurveTransforms(
  panel: TransformPanel,
  input: PreparedPlot[],
  data: DataBindingSet,
  metadata: CurveMetadata = {},
) {
  validateCurveTransforms(panel);
  const fills: CurveFillGeometry[] = [],
    totals: CurveTotalLabel[] = [],
    offsets = new Map<string, { x: number; y: number }>(),
    lines = new Map<string, SeriesRow[][]>();
  let fillPointCount = 0;
  let fillWork = 0;
  const spendFillWork = (amount: number) => {
    fillWork += amount;
    if (fillWork > 5_000_000)
      throw new Error('填充插值运算超过五百万次上限，请减少曲线或数据点');
  };
  const addFill = (fill: CurveFillGeometry) => {
    fillPointCount += fill.points.length;
    if (fillPointCount > CURVE_GEOMETRY_LIMIT)
      throw new Error('曲线填充超过二十万几何点上限，请减少数据点');
    fills.push(fill);
  };
  const sourceRows = new Map(
    input.flatMap((item) =>
      item.xyRows ? [[item.plot.plotSlotId, item.xyRows] as const] : [],
    ),
  );
  const errorTransforms = new Map<string, CurveErrorTransform>();
  if (
    !panel.stack &&
    !input.some((item) => (item.plot as TransformPlot).transform)
  )
    return {
      prepared: input,
      fills,
      totals,
      offsets,
      lines,
      sourceRows,
      errorTransforms,
    };
  let prepared = input.map((source) => {
    const item = {
      ...source,
      xValues: [...source.xValues],
      yValues: [...source.yValues],
    };
    const settings = (item.plot as TransformPlot).transform;
    if (!settings || item.plot.visible === false) return item;
    const x = offsetFor(
        settings.offsetX,
        'x',
        panel,
        input,
        source,
        data,
        metadata,
      ),
      y = offsetFor(
        settings.offsetY,
        'y',
        panel,
        input,
        source,
        data,
        metadata,
      );
    offsets.set(item.plot.plotSlotId, { x, y });
    errorTransforms.set(item.plot.plotSlotId, () => ({
      xOffset: x,
      yOffset: y,
      yScale: 1,
      mapY: (value) => finite(value + y, '误差 Y 偏移'),
    }));
    if (!x && !y) return item;
    const next = mapPrepared(item, (row) => ({
      ...row,
      x: finite(row.x + x, 'X 偏移'),
      y: finite(row.y + y, 'Y 偏移'),
    }));
    // 误差范围的平移不能因点坐标重建而丢失。
    next.xValues = item.xValues.map((v) => finite(v + x, 'X 范围偏移'));
    next.yValues = item.yValues.map((v) => finite(v + y, 'Y 范围偏移'));
    return next;
  });
  // 独立调用此准备函数时也保持子集断口；图层已分段时此操作幂等。
  prepared = prepared.map((item) => {
    if (
      item.plot.kind !== 'xy' ||
      !item.plot.subset?.breakConnection ||
      !item.xyRows
    )
      return item;
    const subset = prepareCurveSubset(
      item.plot,
      data,
      sourceRows.get(item.plot.plotSlotId) ?? item.xyRows,
    );
    return {
      ...item,
      segments: subset.segments(item.segments as SeriesRow[][]),
    };
  });
  const stack = panel.stack;
  if (stack) {
    const members = stack.members.flatMap((id) => {
      const item = prepared.find(
        (p) => p.plot.plotSlotId === id && p.plot.visible !== false,
      );
      return item ? [item] : [];
    });
    if (members.length) {
      if (
        members.reduce((sum, m) => sum + m.segments.flat().length, 0) *
          members.length >
        5000000
      )
        throw new Error('堆叠插值运算超过五百万次上限，请减少曲线或数据点');
      const interpolators = members.map((m) =>
        createCurveInterpolator(m.segments),
      );
      type Sample = {
        values: number[];
        positive: number[];
        negative: number[];
        positiveSize: number;
        negativeSize: number;
        positiveTotal: number;
        negativeTotal: number;
      };
      const samples = new Map<number, Sample | undefined>();
      const sampleAt = (x: number): Sample | undefined => {
        if (samples.has(x)) return samples.get(x);
        const interpolated = interpolators.map((f) => f(x));
        if (interpolated.some((v) => v === undefined)) {
          samples.set(x, undefined);
          return undefined;
        }
        const values = interpolated as number[];
        const positiveSize =
          stack.mode === 'percent' ? Math.max(0, ...values) : 1;
        const negativeSize =
          stack.mode === 'percent' ? Math.max(0, ...values.map((v) => -v)) : 1;
        const positive = [0],
          negative = [0];
        for (const value of values) {
          positive.push(
            positive.at(-1)! +
              (value >= 0 && positiveSize ? value / positiveSize : 0),
          );
          negative.push(
            negative.at(-1)! +
              (value < 0 && negativeSize ? value / negativeSize : 0),
          );
        }
        const sample = {
          values,
          positive,
          negative,
          positiveSize,
          negativeSize,
          positiveTotal: positive.at(-1)!,
          negativeTotal: -negative.at(-1)!,
        };
        samples.set(x, sample);
        return sample;
      };
      const valuesAt = (x: number) => sampleAt(x)?.values;
      const stackAt = (x: number, index: number, side?: boolean) => {
        const sample = sampleAt(x);
        if (!sample) return undefined;
        const value = sample.values[index]!,
          positive = side ?? value >= 0;
        const base = (positive ? sample.positive : sample.negative)[index]!;
        const size = positive ? sample.positiveSize : sample.negativeSize;
        const total = positive ? sample.positiveTotal : sample.negativeTotal;
        const factor = stack.mode === 'percent' ? (total ? 100 / total : 0) : 1;
        const normalized = size ? value / size : 0;
        return {
          base: finite(base * factor, '堆叠基线'),
          top: finite((base + normalized) * factor, '堆叠累计'),
          size,
          factor,
        };
      };
      const knotSet = new Set(interpolators.flatMap((f) => f.knots));
      for (const f of interpolators)
        for (const segment of f.segments)
          for (let i = 1; i < segment.length; i++) {
            const a = segment[i - 1]!,
              b = segment[i]!;
            if ((a.y < 0 && b.y > 0) || (a.y > 0 && b.y < 0)) {
              const t = zeroFraction(a.y, b.y);
              knotSet.add(finite(a.x * (1 - t) + b.x * t, '堆叠交点'));
            }
          }
      const commonKnots = [...knotSet].sort((a, b) => a - b);
      if (commonKnots.length * members.length > CURVE_GEOMETRY_LIMIT)
        throw new Error('堆叠共同网格超过二十万点上限，请减少数据点');
      const transformed = new Map<string, PreparedPlot>();
      for (const [index, item] of members.entries()) {
        const next = mapPrepared(item, (row) => {
          const v = stackAt(row.x, index);
          return v ? { ...row, y: v.top } : undefined;
        });
        const geometry: SeriesRow[][] = [];
        const sourceSegments = interpolators[index]!.segments;
        const sourceAt = (x: number): Partial<SeriesRow> => {
          let lo = 0,
            hi = sourceSegments.length - 1;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1,
              s = sourceSegments[mid]!;
            if (x < s[0]!.x) {
              hi = mid - 1;
              continue;
            }
            if (x > s.at(-1)!.x) {
              lo = mid + 1;
              continue;
            }
            let a = 0,
              b = s.length - 1;
            while (a <= b) {
              const m = (a + b) >> 1;
              if (s[m]!.x <= x) a = m + 1;
              else b = m - 1;
            }
            return s[Math.max(0, b)]!;
          }
          return {};
        };
        for (let k = 1; k < commonKnots.length; k++) {
          const x0 = commonKnots[k - 1]!,
            x1 = commonKnots[k]!,
            middle = x0 / 2 + x1 / 2,
            values = valuesAt(middle);
          if (!values) continue;
          const positive = values[index]! >= 0,
            a = stackAt(x0, index, positive),
            b = stackAt(x1, index, positive);
          if (!a || !b) continue;
          const from = {
              sourceIndex: 0,
              ...sourceAt(x0),
              x: x0,
              y: a.top,
            } as SeriesRow,
            to = {
              sourceIndex: 0,
              ...sourceAt(x1),
              x: x1,
              y: b.top,
            } as SeriesRow;
          const previous = geometry.at(-1),
            last = previous?.at(-1);
          if (last?.x === from.x && last.y === from.y) previous!.push(to);
          else geometry.push([from, to]);
          if (item.plot.kind === 'area' && !item.plot.transform?.fill)
            addFill({
              plotSlotId: item.plot.plotSlotId,
              points: [
                { x: x0, y: a.top },
                { x: x1, y: b.top },
                { x: x1, y: b.base },
                { x: x0, y: a.base },
              ],
              paint: item.plot.fillStyle.paint,
              color: item.plot.fillStyle.color,
              opacity: item.plot.fillStyle.opacity,
            });
        }
        if (!geometry.length && !next.segments.flat().length)
          throw new Error('堆叠曲线没有可用的共同 X 区间');
        lines.set(item.plot.plotSlotId, geometry);
        next.segments = geometry;
        next.yValues.push(0);
        for (const segment of geometry)
          for (const row of segment) {
            next.xValues.push(row.x);
            next.yValues.push(row.y);
          }
        const offset = offsets.get(item.plot.plotSlotId) ?? { x: 0, y: 0 };
        errorTransforms.set(item.plot.plotSlotId, (row) => {
          const point = stackAt(finite(row.x + offset.x, '误差 X 偏移'), index);
          if (!point) return undefined;
          const yScale = point.size ? point.factor / point.size : 0;
          const shift = point.size ? (offset.y / point.size) * point.factor : 0;
          return {
            xOffset: offset.x,
            yOffset: finite(point.base + shift, '误差堆叠基线'),
            yScale,
            mapY: (value) =>
              finite(
                point.base +
                  (point.size
                    ? (finite(value + offset.y, '误差 Y 偏移') / point.size) *
                      point.factor
                    : 0),
                '误差堆叠端点',
              ),
          };
        });
        transformed.set(item.plot.plotSlotId, next);
      }
      prepared = prepared.map((p) => transformed.get(p.plot.plotSlotId) ?? p);
      if (stack.labels?.visible) {
        const xs = [...new Set(interpolators.flatMap((f) => f.knots))].sort(
          (a, b) => a - b,
        );
        if (xs.length > 2000)
          throw new Error(
            '堆叠总计标签超过两千个 X 位置上限，请关闭总计标签或减少数据点',
          );
        for (const x of xs) {
          const values = valuesAt(x);
          if (!values) continue;
          for (const positive of [true, false]) {
            const value = values.reduce(
              (s, v) => (v >= 0 === positive ? s + v : s),
              0,
            );
            if (value === 0) continue;
            totals.push({
              plotSlotId: members.at(-1)!.plot.plotSlotId,
              x,
              y: stack.mode === 'percent' ? (positive ? 100 : -100) : value,
              value,
              text:
                stack.labels.format === 'scientific'
                  ? value.toExponential(3)
                  : String(Number(value.toFixed(6))),
              color: stack.labels.color,
              fontSizePt: stack.labels.fontSizePt,
            });
          }
        }
      }
    }
  }
  for (const item of prepared) {
    const fill = (item.plot as TransformPlot).transform?.fill;
    if (!fill || item.plot.visible === false) continue;
    let bottom: (x: number) => number | undefined,
      knots: number[] = [];
    if (fill.target === 'baseline') bottom = () => fill.baseline ?? 0;
    else {
      const target = fill.targetPlotId
        ? prepared.find((p) => p.plot.plotSlotId === fill.targetPlotId)
        : prepared
            .slice(prepared.indexOf(item) + 1)
            .find(
              (p) =>
                p.plot.visible !== false &&
                supported(p.plot) &&
                compatible(item.plot, p.plot),
            );
      if (!target || target.plot.visible === false)
        throw new Error('填充目标曲线不存在或已隐藏');
      const f = createCurveInterpolator(target.segments);
      bottom = f;
      knots = f.knots;
    }
    let generatedCount = 0;
    for (const segment of item.segments)
      for (const polygon of polygons(
        segment,
        bottom,
        knots,
        item.plot.plotSlotId,
        fill.positiveColor,
        fill.negativeColor,
        fill.opacity,
        spendFillWork,
      )) {
        polygon.paint = polygon.positive
          ? fill.positivePaint
          : fill.negativePaint;
        addFill(polygon);
        generatedCount++;
        for (const point of polygon.points) item.yValues.push(point.y);
      }
    if (!generatedCount && item.segments.some((s) => s.length > 1))
      throw new Error('填充曲线没有可用的共同连续 X 区间');
  }
  if (fills.reduce((n, f) => n + f.points.length, 0) > CURVE_GEOMETRY_LIMIT)
    throw new Error('曲线填充超过二十万几何点上限，请减少数据点');
  return {
    prepared,
    fills,
    totals,
    offsets,
    lines,
    sourceRows,
    errorTransforms,
  };
}

export { validateCurveTransforms };
