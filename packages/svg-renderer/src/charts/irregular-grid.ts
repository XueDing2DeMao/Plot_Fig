export type XyzPoint = { x: number; y: number; z: number };
export type XyzTriangle = readonly [XyzPoint, XyzPoint, XyzPoint];

type IndexedTriangle = [number, number, number];

function area(a: XyzPoint, b: XyzPoint, c: XyzPoint) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function inCircumcircle(
  point: XyzPoint,
  triangle: IndexedTriangle,
  points: XyzPoint[],
) {
  const a = points[triangle[0]]!,
    b = points[triangle[1]]!,
    c = points[triangle[2]]!,
    ax = a.x - point.x,
    ay = a.y - point.y,
    bx = b.x - point.x,
    by = b.y - point.y,
    cx = c.x - point.x,
    cy = c.y - point.y,
    determinant =
      (ax * ax + ay * ay) * (bx * cy - by * cx) -
      (bx * bx + by * by) * (ax * cy - ay * cx) +
      (cx * cx + cy * cy) * (ax * by - ay * bx);
  return area(a, b, c) > 0 ? determinant > 1e-12 : determinant < -1e-12;
}

export function triangulate(input: XyzPoint[]): XyzTriangle[] {
  if (input.length > 10_000) throw new Error('不规则 XYZ 超过10000个点');
  const seen = new Set<string>();
  const data = input
    .filter((point) => {
      if (![point.x, point.y, point.z].every(Number.isFinite)) return false;
      const key = `${point.x}\0${point.y}`;
      if (seen.has(key))
        throw new Error(`重复不规则坐标 (${point.x}, ${point.y})`);
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z);
  if (data.length < 3) throw new Error('不规则 XYZ 至少需要三个有限点');
  const xs = data.map((p) => p.x),
    ys = data.map((p) => p.y),
    minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys),
    span = Math.max(maxX - minX, maxY - minY);
  if (!(span > 0)) throw new Error('不规则 XYZ 点不能共点');
  const midX = (minX + maxX) / 2,
    midY = (minY + maxY) / 2,
    points: XyzPoint[] = [
      ...data.map((point) => ({
        x: (point.x - midX) / span,
        y: (point.y - midY) / span,
        z: point.z,
      })),
      { x: -32, y: -1, z: 0 },
      { x: 0, y: 32, z: 0 },
      { x: 32, y: -1, z: 0 },
    ],
    superStart = data.length;
  let triangles: IndexedTriangle[] = [
    [superStart, superStart + 2, superStart + 1],
  ];
  for (let index = 0; index < data.length; index++) {
    const bad = triangles.filter((triangle) =>
      inCircumcircle(points[index]!, triangle, points),
    );
    const edges = new Map<string, [number, number, number]>();
    for (const triangle of bad)
      for (const [from, to] of [
        [triangle[0], triangle[1]],
        [triangle[1], triangle[2]],
        [triangle[2], triangle[0]],
      ] as [number, number][]) {
        const key = from < to ? `${from}:${to}` : `${to}:${from}`;
        const current = edges.get(key);
        edges.set(key, [from, to, (current?.[2] ?? 0) + 1]);
      }
    triangles = triangles.filter((triangle) => !bad.includes(triangle));
    for (const [from, to, count] of edges.values()) {
      if (count !== 1) continue;
      const triangle: IndexedTriangle = [from, to, index];
      if (Math.abs(area(points[from]!, points[to]!, points[index]!)) <= 1e-12)
        continue;
      if (area(points[from]!, points[to]!, points[index]!) < 0)
        [triangle[0], triangle[1]] = [triangle[1], triangle[0]];
      triangles.push(triangle);
    }
  }
  return triangles
    .filter((triangle) => triangle.every((index) => index < data.length))
    .map(
      (triangle) =>
        triangle.map((index) => data[index]!) as unknown as XyzTriangle,
    )
    .sort(
      (a, b) =>
        a.reduce((sum, p) => sum + p.x + p.y, 0) -
        b.reduce((sum, p) => sum + p.x + p.y, 0),
    );
}

function crossing(
  a: XyzPoint,
  b: XyzPoint,
  level: number,
): XyzPoint | undefined {
  if (
    (a.z < level && b.z < level) ||
    (a.z > level && b.z > level) ||
    a.z === b.z
  )
    return undefined;
  if (a.z === level) return a;
  if (b.z === level) return b;
  const ratio = (level - a.z) / (b.z - a.z);
  return {
    x: a.x + ratio * (b.x - a.x),
    y: a.y + ratio * (b.y - a.y),
    z: level,
  };
}

export function triangleContours(triangles: XyzTriangle[], levels: number[]) {
  if (triangles.length * levels.length > 2_000_000)
    throw new Error('三角网与等值层超过计算上限');
  return levels.flatMap((level) =>
    triangles.flatMap((triangle) => {
      const points = [
        crossing(triangle[0], triangle[1], level),
        crossing(triangle[1], triangle[2], level),
        crossing(triangle[2], triangle[0], level),
      ].filter((point): point is XyzPoint => !!point);
      const unique = points.filter(
        (point, index) =>
          points.findIndex(
            (other) => other.x === point.x && other.y === point.y,
          ) === index,
      );
      return unique.length === 2
        ? [{ level, points: [unique[0]!, unique[1]!] as const }]
        : [];
    }),
  );
}

function interpolateAt(a: XyzPoint, b: XyzPoint, level: number): XyzPoint {
  const ratio = (level - a.z) / (b.z - a.z);
  return {
    x: a.x + ratio * (b.x - a.x),
    y: a.y + ratio * (b.y - a.y),
    z: level,
  };
}

function clipByLevel(polygon: XyzPoint[], level: number, keepAbove: boolean) {
  const result: XyzPoint[] = [];
  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index]!,
      previous = polygon[(index + polygon.length - 1) % polygon.length]!,
      currentInside = keepAbove ? current.z >= level : current.z <= level,
      previousInside = keepAbove ? previous.z >= level : previous.z <= level;
    if (currentInside !== previousInside)
      result.push(interpolateAt(previous, current, level));
    if (currentInside) result.push(current);
  }
  const adjacent = result.filter(
    (point, index) =>
      index === 0 ||
      point.x !== result[index - 1]!.x ||
      point.y !== result[index - 1]!.y,
  );
  if (
    adjacent.length > 1 &&
    adjacent[0]!.x === adjacent.at(-1)!.x &&
    adjacent[0]!.y === adjacent.at(-1)!.y
  )
    adjacent.pop();
  return adjacent;
}

function nonDegeneratePolygon(points: XyzPoint[]) {
  const unique = points.filter(
    (point, index) =>
      points.findIndex(
        (other) => other.x === point.x && other.y === point.y,
      ) === index,
  );
  if (unique.length < 3) return [];
  const origin = unique[0]!;
  let twiceArea = 0,
    magnitude = 0;
  for (let index = 1; index < unique.length - 1; index++) {
    const current = unique[index]!,
      next = unique[index + 1]!,
      cross =
        (current.x - origin.x) * (next.y - origin.y) -
        (current.y - origin.y) * (next.x - origin.x);
    twiceArea += cross;
    magnitude += Math.abs(cross);
  }
  return Math.abs(twiceArea) > Number.EPSILON * magnitude * 16 ? unique : [];
}

export function triangleBands(
  triangles: XyzTriangle[],
  levels: number[],
  range: [number, number],
) {
  if (triangles.length * (levels.length + 1) > 2_000_000)
    throw new Error('三角网与等值带超过计算上限');
  const boundaries = [
    range[0],
    ...[...new Set(levels)]
      .filter((level) => level > range[0] && level < range[1])
      .sort((a, b) => a - b),
    range[1],
  ];
  return boundaries.slice(0, -1).flatMap((low, index) => {
    const high = boundaries[index + 1]!,
      value = (low + high) / 2;
    return triangles.flatMap((triangle) => {
      const points = nonDegeneratePolygon(
        clipByLevel(clipByLevel([...triangle], low, true), high, false),
      );
      return points.length >= 3 ? [{ low, high, value, points }] : [];
    });
  });
}
