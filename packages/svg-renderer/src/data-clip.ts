export type DataClip = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};
type Point = { x: number; y: number };
export function containsDataPoint(p: Point, clip: DataClip | undefined) {
  return (
    !clip ||
    (p.x >= clip.xMin &&
      p.x <= clip.xMax &&
      p.y >= clip.yMin &&
      p.y <= clip.yMax)
  );
}
export function clipDataLine<T extends Point>(
  a: T,
  b: T,
  c: DataClip,
): [T, T] | undefined {
  let lo = 0,
    hi = 1;
  const dx = b.x - a.x,
    dy = b.y - a.y;
  for (const [p, q] of [
    [-dx, a.x - c.xMin],
    [dx, c.xMax - a.x],
    [-dy, a.y - c.yMin],
    [dy, c.yMax - a.y],
  ]) {
    if (p === 0) {
      if (q! < 0) return undefined;
      continue;
    }
    const t = q! / p!;
    if (p! < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return undefined;
  }
  const at = (t: number, base: T): T =>
    t === 0
      ? a
      : t === 1
        ? b
        : {
            ...base,
            x: Math.max(c.xMin, Math.min(c.xMax, a.x * (1 - t) + b.x * t)),
            y: Math.max(c.yMin, Math.min(c.yMax, a.y * (1 - t) + b.y * t)),
          };
  return [at(lo, a), at(hi, b)];
}
export function clipDataPolyline<T extends Point>(
  points: T[],
  clip: DataClip,
): T[][] {
  const result: T[][] = [];
  let current: T[] = [];
  for (let i = 1; i < points.length; i++) {
    const segment = clipDataLine(points[i - 1]!, points[i]!, clip);
    if (!segment) {
      if (current.length) result.push(current);
      current = [];
      continue;
    }
    const [a, b] = segment,
      last = current.at(-1);
    if (last && (last.x !== a.x || last.y !== a.y)) {
      result.push(current);
      current = [];
    }
    if (!current.length) current.push(a);
    current.push(b);
  }
  if (current.length) result.push(current);
  return result;
}
export function clipDataPolygon(points: Point[], clip: DataClip): Point[] {
  let result = points;
  for (const [axis, bound, sign] of [
    ['x', clip.xMin, 1],
    ['x', clip.xMax, -1],
    ['y', clip.yMin, 1],
    ['y', clip.yMax, -1],
  ] as const) {
    const input = result;
    result = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i]!,
        b = input[(i + 1) % input.length]!,
        insideA = (a[axis] - bound) * sign >= 0,
        insideB = (b[axis] - bound) * sign >= 0;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = (bound - a[axis]) / (b[axis] - a[axis]);
        result.push({
          x: axis === 'x' ? bound : a.x * (1 - t) + b.x * t,
          y: axis === 'y' ? bound : a.y * (1 - t) + b.y * t,
        });
      }
    }
  }
  return result;
}
