import { MARKER_SHAPES, validateMarkerVertices } from './marker-geometry.js';
import type { MarkerStyle } from './schema/plot-slot.js';
import type {
  MarkerMapping,
  MarkerSource,
  MarkerOverrides,
} from './schema/marker-mapping.js';
function validateMarkerAppearance(style: MarkerStyle) {
  if (!MARKER_SHAPES.includes(style.shape)) throw new Error('无效的符号形状');
  for (const [name, value, min, max] of [
    ['大小', style.sizePt, 0, 1000000],
    ['边框宽度', style.strokeWidthPt, 0, 1000000],
    ['旋转', style.rotationDeg ?? 0, -360, 360],
    ['不透明度', style.opacity ?? 1, 0, 1],
  ] as const)
    if (!Number.isFinite(value) || value < min || value > max)
      throw new Error('单点' + name + '超出允许范围');
  if (
    style.followLineOpacity !== undefined &&
    typeof style.followLineOpacity !== 'boolean'
  )
    throw new Error('跟随线条透明度须为开关值');
  if (style.shape === 'custom') validateMarkerVertices(style.customVertices);
  else if (style.customVertices !== undefined)
    throw new Error('仅自定义符号可设置顶点');
}
export function validateMarkerMapping(mapping: MarkerMapping) {
  validateMarkerMappingStructure(mapping);
  const { color, size, shape } = mapping;
  if (
    color &&
    (!['continuous', 'categorical'].includes(color.mode) ||
      !['fill', 'stroke', 'both'].includes(color.target) ||
      color.colors.length < (color.mode === 'continuous' ? 2 : 1) ||
      color.colors.length > 64 ||
      !color.colors.every(
        (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c),
      ))
  )
    throw new Error('映射色表须为1–64项十六进制颜色，渐变至少两色');
  if (color?.mode === 'categorical' && color.domain)
    throw new Error('分类颜色不使用数值范围');
  if (
    size &&
    (!['area', 'diameter'].includes(size.mode) ||
      !['pt', 'x-data', 'y-data'].includes(size.unit) ||
      ![size.minSize, size.maxSize].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 1000000,
      ) ||
      size.minSize > size.maxSize)
  )
    throw new Error('符号映射尺寸须非负且最小值不大于最大值');
  if (
    shape &&
    (!shape.shapes.length ||
      shape.shapes.length > 64 ||
      !shape.shapes.every(
        (s) => MARKER_SHAPES.includes(s) && String(s) !== 'custom',
      ))
  )
    throw new Error('形状映射需要1–64个内置符号');
  for (const range of [color?.domain, size?.domain])
    if (
      range &&
      (!Number.isFinite(range.min) ||
        !Number.isFinite(range.max) ||
        range.min >= range.max)
    )
      throw new Error('映射输入范围需要两个递增的有限数值');
}
const base: MarkerStyle = {
  visible: true,
  shape: 'circle',
  sizePt: 4,
  fill: '#000000',
  stroke: '#000000',
  strokeWidthPt: 0,
};
function record(
  value: unknown,
  keys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw new Error(label + '含有未知字段或格式无效');
}
export function validateMarkerSource(source: MarkerSource) {
  record(
    source,
    ['tableId', 'xColumnId', 'yColumnId', 'dataStartRow', 'fingerprint'],
    '数据来源',
  );
  if (
    ![source.tableId, source.xColumnId, source.yColumnId].every(
      (v) => typeof v === 'string' && v.length > 0 && v.length <= 512,
    ) ||
    !Number.isInteger(source.dataStartRow) ||
    source.dataStartRow < 0 ||
    source.dataStartRow > 100000 ||
    !/^sha256:[0-9a-f]{64}$/.test(source.fingerprint)
  )
    throw new Error('数据来源快照无效');
}
export function validateMarkerOverrides(value: MarkerOverrides) {
  record(value, ['source', 'points'], '单点覆盖');
  validateMarkerSource(value.source);
  if (!Array.isArray(value.points) || value.points.length > 2000)
    throw new Error('单点覆盖最多 2000 项');
  const seen = new Set<number>();
  for (const point of value.points) {
    record(point, ['row', 'style'], '单点覆盖');
    if (
      !Number.isInteger(point.row) ||
      point.row < 1 ||
      point.row > 100000 ||
      seen.has(point.row)
    )
      throw new Error('单点覆盖行须为 1–100000 的唯一整数');
    seen.add(point.row);
    record(
      point.style,
      [
        'visible',
        'shape',
        'sizePt',
        'fill',
        'stroke',
        'strokeWidthPt',
        'rotationDeg',
        'opacity',
        'followLineOpacity',
        'customVertices',
      ],
      '单点样式',
    );
    if (
      !Object.keys(point.style).length ||
      Object.values(point.style).some((v) => v === undefined)
    )
      throw new Error('单点样式不能为空');
    if (
      point.style.visible !== undefined &&
      typeof point.style.visible !== 'boolean'
    )
      throw new Error('符号显示须为开关值');
    for (const key of ['fill', 'stroke'] as const)
      if (
        point.style[key] !== undefined &&
        (typeof point.style[key] !== 'string' ||
          !point.style[key]!.trim() ||
          point.style[key]!.length > 128)
      )
        throw new Error('符号颜色不能为空或过长');
    if (point.style.customVertices && point.style.shape !== 'custom')
      throw new Error('自定义顶点须与自定义形状一起设置');
    if (point.style.shape === 'custom' && !point.style.customVertices)
      throw new Error('自定义符号需要顶点');
    for (const key of [
      'sizePt',
      'strokeWidthPt',
      'rotationDeg',
      'opacity',
    ] as const)
      if (
        Object.hasOwn(point.style, key) &&
        (typeof point.style[key] !== 'number' ||
          !Number.isFinite(point.style[key]))
      )
        throw new Error('单点数值属性须为有限数值');
    validateMarkerAppearance({ ...base, ...point.style });
    if (
      (point.style.sizePt ?? 0) > 1e6 ||
      (point.style.strokeWidthPt ?? 0) > 1e6
    )
      throw new Error('单点尺寸超过上限');
  }
}
export function validateMarkerMappingStructure(mapping: MarkerMapping) {
  const record = (value: unknown, keys: string[]) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).some((k) => !keys.includes(k))
    )
      throw new Error('符号映射结构无效或包含未知字段');
  };
  record(mapping, ['color', 'size', 'shape']);
  for (const key of ['color', 'size', 'shape'] as const) {
    const value = mapping[key];
    if (value === undefined) continue;
    record(
      value,
      key === 'color'
        ? ['mode', 'target', 'colors', 'domain']
        : key === 'size'
          ? ['mode', 'unit', 'minSize', 'maxSize', 'domain']
          : ['shapes'],
    );
    if (key === 'color' && !Array.isArray(mapping.color!.colors))
      throw new Error('颜色映射需要色表');
    if (key === 'shape' && !Array.isArray(mapping.shape!.shapes))
      throw new Error('形状映射需要形状列表');
    if (key !== 'shape' && 'domain' in value)
      record(value.domain, ['min', 'max']);
  }
}
