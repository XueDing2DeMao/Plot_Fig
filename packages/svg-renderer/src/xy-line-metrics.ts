import { formatNumber as n } from './geometry.js';
import { xyLinePath, type XyLineConnection } from './xy-line-path.js';

// F4.2C 准备实现：未接入当前绘图入口。曲线仍输出三次段，细分仅用于度量和裁剪定位。
export type LinePoint = Readonly<{ x: number; y: number }>;
type Sample = { point: LinePoint; t: number; distance: number };
type Segment = {
  sourceEdge: number;
  start: LinePoint;
  end: LinePoint;
  controls: LinePoint[];
  samples: Sample[];
  from: number;
  to: number;
};
export type LineMetrics = { d: string; segments: Segment[]; length: number };
export type LinePiece = { d: string; from: number; to: number };
const MAX_SAMPLES = 400_000;
const TOLERANCE = 0.01;
const distance = (a: LinePoint, b: LinePoint) =>
  Math.hypot(b.x - a.x, b.y - a.y);
const mix = (a: LinePoint, b: LinePoint, t: number): LinePoint => ({
  x: a.x * (1 - t) + b.x * t,
  y: a.y * (1 - t) + b.y * t,
});
const position = (p: LinePoint) => `${n(p.x)} ${n(p.y)}`;

function split(c: LinePoint[], t: number): [LinePoint[], LinePoint[]] {
  if (c.length === 2) {
    const p = mix(c[0]!, c[1]!, t);
    return [
      [c[0]!, p],
      [p, c[1]!],
    ];
  }
  const a = mix(c[0]!, c[1]!, t),
    b = mix(c[1]!, c[2]!, t),
    d = mix(c[2]!, c[3]!, t);
  const e = mix(a, b, t),
    f = mix(b, d, t),
    g = mix(e, f, t);
  return [
    [c[0]!, a, e, g],
    [g, f, d, c[3]!],
  ];
}
function chordDistance(p: LinePoint, a: LinePoint, b: LinePoint) {
  const length = distance(a, b);
  return length === 0
    ? distance(a, p)
    : Math.abs(
        (p.x - a.x) * ((b.y - a.y) / length) -
          (p.y - a.y) * ((b.x - a.x) / length),
      );
}
function flatten(
  c: LinePoint[],
  emit: (p: LinePoint, t: number) => void,
  from = 0,
  to = 1,
  depth = 0,
) {
  if (c.length === 2) {
    emit(c[1]!, to);
    return;
  }
  const a = c[0]!,
    b = c[3]!;
  const excess =
    distance(a, c[1]!) +
    distance(c[1]!, c[2]!) +
    distance(c[2]!, b) -
    distance(a, b);
  // 几何上平直不代表参数匀速；同时约束控制点偏离匀速弦线的量，才能线性反求弧长位置。
  const parameterError = Math.max(
    distance(c[1]!, mix(a, b, 1 / 3)),
    distance(c[2]!, mix(a, b, 2 / 3)),
  );
  if (
    excess <= TOLERANCE &&
    parameterError <= TOLERANCE &&
    Math.max(chordDistance(c[1]!, a, b), chordDistance(c[2]!, a, b)) <=
      TOLERANCE
  ) {
    emit(b, to);
    return;
  }
  if (depth >= 18) throw new Error('曲线细分超出精度上限，请缩小绘制范围');
  const halves = split(c, 0.5),
    middle = (from + to) / 2;
  flatten(halves[0], emit, from, middle, depth + 1);
  flatten(halves[1], emit, middle, to, depth + 1);
}
export function lineMetrics(
  points: readonly LinePoint[],
  connection: XyLineConnection,
  close: boolean,
): LineMetrics {
  const base = xyLinePath(points, connection),
    result: LineMetrics = {
      d: base + (close && points.length > 1 ? ' Z' : ''),
      segments: [],
      length: 0,
    };
  const tokens =
    base.match(/[MLHVC]|[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/gi) ?? [];
  let cursor = 0,
    current: LinePoint = { x: 0, y: 0 },
    first = current,
    count = 0,
    commandIndex = 0;
  const readPoint = (): LinePoint => ({
    x: Number(tokens[cursor++]),
    y: Number(tokens[cursor++]),
  });
  const append = (controls: LinePoint[]) => {
    const samples: Sample[] = [{ point: controls[0]!, t: 0, distance: 0 }];
    flatten(controls, (point, t) => {
      if (++count > MAX_SAMPLES) throw new Error('曲线度量超过细分数量上限');
      const previous = samples.at(-1)!;
      const length = previous.distance + distance(previous.point, point);
      if (!Number.isFinite(length)) throw new Error('曲线长度超出有限数值范围');
      samples.push({ point, t, distance: length });
    });
    const length = samples.at(-1)!.distance;
    if (length > 0) {
      const to = result.length + length;
      if (!Number.isFinite(to)) throw new Error('曲线总长度超出有限数值范围');
      result.segments.push({
        sourceEdge: Math.floor(commandIndex/(connection==='step-h'||connection==='step-v'?2:1)),
        start: controls[0]!,
        end: controls.at(-1)!,
        controls,
        samples,
        from: result.length,
        to,
      });
      result.length = to;
    }
    current = controls.at(-1)!;
  };
  while (cursor < tokens.length) {
    const command = tokens[cursor++];
    if (command === 'M') {
      current = first = readPoint();
      continue;
    }
    if (command === 'C')
      append([current, readPoint(), readPoint(), readPoint()]);
    else if (command === 'L') append([current, readPoint()]);
    else if (command === 'H')
      append([current, { x: Number(tokens[cursor++]), y: current.y }]);
    else if (command === 'V')
      append([current, { x: current.x, y: Number(tokens[cursor++]) }]);
    else throw new Error('无法识别内部曲线指令');
    commandIndex++;
  }
  if (close && points.length > 1) {
    commandIndex=(points.length-1)*(connection==='step-h'||connection==='step-v'?2:1);
    append([current, first]);
  }
  return result;
}
function segmentIndex(metrics: LineMetrics, at: number) {
  let lo = 0,
    hi = metrics.segments.length - 1;
  while (lo < hi) {
    const middle = (lo + hi) >>> 1;
    if (metrics.segments[middle]!.to < at) lo = middle + 1;
    else hi = middle;
  }
  return lo;
}
function parameter(segment: Segment, at: number) {
  const target = Math.max(
      0,
      Math.min(segment.to - segment.from, at - segment.from),
    ),
    samples = segment.samples;
  let lo = 1,
    hi = samples.length - 1;
  while (lo < hi) {
    const middle = (lo + hi) >>> 1;
    if (samples[middle]!.distance < target) lo = middle + 1;
    else hi = middle;
  }
  const a = samples[lo - 1]!,
    b = samples[lo]!;
  return (
    a.t +
    (b.t - a.t) *
      (b.distance === a.distance
        ? 0
        : (target - a.distance) / (b.distance - a.distance))
  );
}
export function pointAtLength(
  metrics: LineMetrics,
  at: number,
): { point: LinePoint; tangent: LinePoint } | undefined {
  if (!metrics.segments.length) return undefined;
  const clamped = Math.max(0, Math.min(metrics.length, at)),
    segment = metrics.segments[segmentIndex(metrics, clamped)]!;
  const c = segment.controls,
    t = parameter(segment, clamped);
  if (c.length === 2)
    return {
      point: mix(c[0]!, c[1]!, t),
      tangent: { x: c[1]!.x - c[0]!.x, y: c[1]!.y - c[0]!.y },
    };
  const [left] = split(c, t),
    point = left.at(-1)!;
  const derivative = (key: 'x' | 'y') =>
    3 *
    ((1 - t) ** 2 * (c[1]![key] - c[0]![key]) +
      2 * (1 - t) * t * (c[2]![key] - c[1]![key]) +
      t ** 2 * (c[3]![key] - c[2]![key]));
  let tangent = { x: derivative('x'), y: derivative('y') };
  if (Math.hypot(tangent.x, tangent.y) < 1e-12) {
    const sample =
      segment.samples[t < 0.5 ? 1 : segment.samples.length - 2]!.point;
    tangent =
      t < 0.5
        ? { x: sample.x - point.x, y: sample.y - point.y }
        : { x: point.x - sample.x, y: point.y - sample.y };
  }
  return { point, tangent };
}
export function piece(metrics: LineMetrics, from: number, to: number): LinePiece {
  const commands: string[] = [];
  for (let i = segmentIndex(metrics, from); i < metrics.segments.length; i++) {
    const segment = metrics.segments[i]!;
    if (segment.from >= to) break;
    if (segment.to <= from) continue;
    const a = parameter(segment, Math.max(from, segment.from)),
      b = parameter(segment, Math.min(to, segment.to));
    let c = segment.controls;
    if (b < 1) c = split(c, b)[0];
    if (a > 0) c = split(c, a / b)[1];
    if (!commands.length) commands.push('M' + position(c[0]!));
    commands.push(
      c.length === 2
        ? 'L' + position(c[1]!)
        : 'C' + c.slice(1).map(position).join(' '),
    );
  }
  return { d: commands.join(' '), from, to };
}
export function visibleLinePieces(
  metrics: LineMetrics,
  symbols: readonly LinePoint[],
  radii: number | readonly number[],
): LinePiece[] {
  if (typeof radii !== 'number' && radii.length !== symbols.length)
    throw new Error('符号半径数量与坐标不一致');
  const values = typeof radii === 'number' ? [radii] : radii;
  if (values.some((r) => !Number.isFinite(r) || r < 0))
    throw new Error('符号半径须为非负有限数值');
  const radius = values.reduce((max, r) => Math.max(max, r), 0);
  if (!metrics.length) return [];
  if (radius <= 0 || !symbols.length)
    return [{ d: metrics.d, from: 0, to: metrics.length }];
  const sorted = symbols
      .map((p, i) => ({
        ...p,
        radius: typeof radii === 'number' ? radii : radii[i]!,
      }))
      .filter((p) => p.radius > 0)
      .sort((a, b) => a.x - b.x),
    hidden: Array<[number, number]> = [];
  let checks = 0;
  const lowerBound = (x: number) => {
    let lo = 0,
      hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid]!.x < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const segment of metrics.segments)
    for (let i = 1; i < segment.samples.length; i++) {
      const a = segment.samples[i - 1]!,
        b = segment.samples[i]!,
        length = b.distance - a.distance;
      if (!length) continue;
      const ux = (b.point.x - a.point.x) / length,
        uy = (b.point.y - a.point.y) / length;
      const minX = Math.min(a.point.x, b.point.x) - radius,
        maxX = Math.max(a.point.x, b.point.x) + radius;
      const minY = Math.min(a.point.y, b.point.y) - radius,
        maxY = Math.max(a.point.y, b.point.y) + radius;
      for (
        let j = lowerBound(minX);
        j < sorted.length && sorted[j]!.x <= maxX;
        j++
      ) {
        if (++checks > 2_000_000)
          throw new Error('符号间隙计算超过复杂度上限，请减少重叠符号');
        const p = sorted[j]!;
        const radius = p.radius;
        if (p.y < minY || p.y > maxY) continue;
        const dx = p.x - a.point.x,
          dy = p.y - a.point.y,
          along = dx * ux + dy * uy,
          perpendicular = dx * uy - dy * ux;
        if (Math.abs(perpendicular) >= radius) continue;
        const half = Math.sqrt(Math.max(0, radius ** 2 - perpendicular ** 2));
        const low = Math.max(0, along - half),
          high = Math.min(length, along + half);
        if (high > low)
          hidden.push([
            segment.from + a.distance + low,
            segment.from + a.distance + high,
          ]);
      }
    }
  hidden.sort((a, b) => a[0] - b[0]);
  const visible: LinePiece[] = [];
  let cursor = 0;
  for (const [from, to] of hidden) {
    if (from > cursor + 1e-8) visible.push(piece(metrics, cursor, from));
    cursor = Math.max(cursor, to);
  }
  if (cursor < metrics.length - 1e-8)
    visible.push(piece(metrics, cursor, metrics.length));
  return visible;
}
