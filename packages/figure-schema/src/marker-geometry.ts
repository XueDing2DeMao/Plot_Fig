export const MARKER_SHAPES = [
  'circle',
  'square',
  'triangle',
  'diamond',
  'plus',
  'cross',
  'triangle-down',
  'triangle-left',
  'triangle-right',
  'star',
  'pentagon',
  'hexagon',
  'octagon',
  'h-line',
  'v-line',
  'custom',
] as const;
type Vertex = readonly [number, number];
const cross = (a: Vertex, b: Vertex, c: Vertex) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function intersects(a: Vertex, b: Vertex, c: Vertex, d: Vertex) {
  const side = (a: Vertex, b: Vertex, c: Vertex) => Math.sign(cross(a, b, c));
  const on = (a: Vertex, b: Vertex, p: Vertex) =>
    cross(a, b, p) === 0 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1]);
  return (
    (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}

export function validateMarkerVertices(
  value: unknown,
): asserts value is Vertex[] {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.length > 64 ||
    !value.every(
      (v) =>
        Array.isArray(v) &&
        v.length === 2 &&
        v.every(
          (x) =>
            typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1,
        ),
    )
  )
    throw new Error('自定义符号须包含 3–64 个 [-1,1] 范围内的坐标对');
  const vertices = value as Vertex[];
  if (new Set(vertices.map((v) => `${v[0]},${v[1]}`)).size !== vertices.length)
    throw new Error('自定义符号不能包含重复顶点，末点会自动闭合');
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!,
      b = vertices[(i + 1) % vertices.length]!;
    area += a[0] * b[1] - b[0] * a[1];
    for (let j = i + 2; j < vertices.length; j++) {
      if (i === 0 && j === vertices.length - 1) continue;
      if (intersects(a, b, vertices[j]!, vertices[(j + 1) % vertices.length]!))
        throw new Error('自定义符号不能自相交');
    }
  }
  if (Math.abs(area) < 1e-8) throw new Error('自定义符号须具有非零面积');
}
