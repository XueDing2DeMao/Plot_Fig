import type { DataColumn, DataValue } from '@plot-fig/data-binding';
import type { ChartContext } from './charts/chart-point.js';
import {
  advancedMarkerShapes,
  validateMarkerAppearance,
  type AdvancedMarker,
  type AdvancedMarkerShape,
} from './marker-appearance.js';
import type { SeriesRow } from './series-rows.js';

import {
  validateMarkerMappingStructure,
  type MarkerMapping,
} from '@plot-fig/figure-schema';
export { validateMarkerMappingStructure };
export type { MarkerMapping };
type Domain = { min: number; max: number };
type Columns = { color?: DataColumn; size?: DataColumn; shape?: DataColumn };
type Diagnostic = {
  sourceIndex: number;
  property: keyof Columns;
  message: string;
};
const key = (value: DataValue | undefined) =>
  value === null ||
  value === undefined ||
  (typeof value === 'number' && !Number.isFinite(value))
    ? undefined
    : JSON.stringify([typeof value, value]);
const numeric = (value: DataValue | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function numericDomain(
  rows: readonly SeriesRow[],
  column: DataColumn,
  explicit?: Domain,
): Domain | undefined {
  if (explicit) {
    if (
      !Number.isFinite(explicit.min) ||
      !Number.isFinite(explicit.max) ||
      explicit.min >= explicit.max
    )
      throw new Error('映射范围须为递增的两个有限数值');
    return explicit;
  }
  let min = Infinity,
    max = -Infinity;
  for (const row of rows) {
    const v = column.values[row.sourceIndex];
    if (numeric(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  return min <= max ? { min, max } : undefined;
}
function fraction(value: number, domain: Domain) {
  if (domain.min === domain.max) return 0.5;
  if (value <= domain.min) return 0;
  if (value >= domain.max) return 1;
  const span = domain.max - domain.min;
  return Number.isFinite(span)
    ? (value - domain.min) / span
    : (value / 2 - domain.min / 2) / (domain.max / 2 - domain.min / 2);
}
function categories(rows: readonly SeriesRow[], column: DataColumn) {
  const values = new Map<string, number>();
  for (const row of [...rows].sort((a, b) => a.sourceIndex - b.sourceIndex)) {
    const k = key(column.values[row.sourceIndex]);
    if (k !== undefined && !values.has(k)) values.set(k, values.size);
  }
  return values;
}
function interpolate(colors: string[], t: number) {
  const index = Math.min(
      colors.length - 2,
      Math.floor(t * (colors.length - 1)),
    ),
    local = t * (colors.length - 1) - index;
  const from = colors[index]!,
    to = colors[index + 1]!;
  return (
    '#' +
    [1, 3, 5]
      .map((i) =>
        Math.round(
          parseInt(from.slice(i, i + 2), 16) * (1 - local) +
            parseInt(to.slice(i, i + 2), 16) * local,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

export function resolveMarkerMapping(
  base: AdvancedMarker,
  rows: readonly SeriesRow[],
  mapping: MarkerMapping,
  columns: Columns,
  context?: ChartContext,
  overrides: ReadonlyMap<string, Partial<AdvancedMarker>> = new Map(),
  baseForRow?: (row: SeriesRow) => Partial<AdvancedMarker> | undefined,
  referenceRows: readonly SeriesRow[] = rows,
) {
  validateMarkerMappingStructure(mapping);
  validateMarkerAppearance(base);
  if (rows.length > 100_000) throw new Error('符号映射超过十万行上限');
  const labels = { color: '颜色', size: '大小', shape: '形状' };
  const source = rows.find((row) => row.sourceTableId !== undefined);
  if (
    source &&
    rows.some(
      (row) =>
        row.sourceTableId !== source.sourceTableId ||
        row.sourceRow! - row.sourceIndex !==
          source.sourceRow! - source.sourceIndex,
    )
  )
    throw new Error('符号映射的原行须来自同一表格数据区');
  for (const property of ['color', 'size', 'shape'] as const)
    if (mapping[property]) {
      const column = columns[property];
      if (!column) throw new Error(`符号${labels[property]}尚未绑定数据列`);
      if (
        (property === 'size' ||
          (property === 'color' && mapping.color?.mode === 'continuous')) &&
        column.valueType !== 'number'
      )
        throw new Error(`符号${labels[property]}连续映射需要数值列`);
      if (
        source &&
        (!column.source ||
          column.source.tableId !== source.sourceTableId ||
          column.source.dataStartRow !==
            source.sourceRow! - source.sourceIndex - 1)
      )
        throw new Error(
          `符号${labels[property]}列须与 XY 数据来自同一表格数据区`,
        );
    }
  const { color, size, shape } = mapping;
  if (
    color &&
    (!['continuous', 'categorical'].includes(color.mode) ||
      !['fill', 'stroke', 'both'].includes(color.target) ||
      color.colors.length < (color.mode === 'continuous' ? 2 : 1) ||
      color.colors.length > 64 ||
      !color.colors.every((c) => /^#[\da-f]{6}$/i.test(c)))
  )
    throw new Error('映射色表须为 1–64 项十六进制颜色；渐变至少两色');
  if (
    size &&
    (!['area', 'diameter'].includes(size.mode) ||
      !['pt', 'x-data', 'y-data'].includes(size.unit) ||
      ![size.minSize, size.maxSize].every(
        (n) => Number.isFinite(n) && n >= 0 && n <= 1_000_000,
      ) ||
      size.minSize > size.maxSize)
  )
    throw new Error('符号映射尺寸须在 0–1000000 内且最小值不大于最大值');
  if (size && size.unit !== 'pt' && !context)
    throw new Error('按数据单位映射大小需要绑定的坐标轴');
  if (
    shape &&
    (!shape.shapes.length ||
      shape.shapes.length > 64 ||
      !shape.shapes.every((s) =>
        advancedMarkerShapes.some(
          (candidate) => candidate !== 'custom' && candidate === s,
        ),
      ))
  )
    throw new Error('形状映射须选择 1–64 个内置符号');
  if (color?.mode === 'categorical' && color.domain)
    throw new Error('分类颜色不使用数值范围');
  const colorDomain =
    color?.mode === 'continuous'
      ? numericDomain(referenceRows, columns.color!, color.domain)
      : undefined;
  const sizeDomain = size
    ? numericDomain(referenceRows, columns.size!, size.domain)
    : undefined;
  const colorCategories =
    color?.mode === 'categorical'
      ? categories(referenceRows, columns.color!)
      : undefined;
  const shapeCategories = shape
    ? categories(referenceRows, columns.shape!)
    : undefined;
  const diagnostics: Diagnostic[] = [];
  const inputRows = new Map(rows.map((row) => [row.sourceIndex, { ...row }]));
  if (inputRows.size !== rows.length)
    throw new Error('符号映射的原行索引不能重复');
  const resolved = new Map<number, AdvancedMarker>();
  for (const row of rows) {
    const override = row.identity ? overrides.get(row.identity) : undefined;
    let marker = { ...base, ...baseForRow?.(row) };
    let invalidDataSize = false;
    const warning = (property: keyof Columns, message: string) =>
      diagnostics.push({ sourceIndex: row.sourceIndex, property, message });
    if (color) {
      const value = columns.color!.values[row.sourceIndex],
        category = key(value);
      const mapped =
        color.mode === 'continuous'
          ? numeric(value) && colorDomain
            ? interpolate(color.colors, fraction(value, colorDomain))
            : undefined
          : category === undefined
            ? undefined
            : color.colors[
                colorCategories!.get(category)! % color.colors.length
              ];
      if (mapped === undefined)
        warning('color', '映射值缺失或不是有效数值，保留基础颜色');
      else {
        if (color.target !== 'stroke') marker.fill = mapped;
        if (color.target !== 'fill') marker.stroke = mapped;
      }
    }
    if (shape) {
      const category = key(columns.shape!.values[row.sourceIndex]);
      if (category === undefined)
        warning('shape', '形状分类缺失，保留基础形状');
      else {
        marker.shape =
          shape.shapes[shapeCategories!.get(category)! % shape.shapes.length]!;
        delete marker.customVertices;
      }
    }
    if (size && override?.sizePt === undefined) {
      const value = columns.size!.values[row.sourceIndex];
      if (!numeric(value) || !sizeDomain)
        warning('size', '大小映射值缺失或不是有效数值，保留基础大小');
      else {
        const t = fraction(value, sizeDomain);
        let diameter =
          size.mode === 'area'
            ? Math.sqrt(size.minSize ** 2 * (1 - t) + size.maxSize ** 2 * t)
            : size.minSize * (1 - t) + size.maxSize * t;
        if (size.unit !== 'pt') {
          const x = size.unit === 'x-data',
            scale = x ? context!.xScale : context!.yScale,
            center = x ? row.x : row.y;
          diameter =
            Math.abs(
              scale.map(center + diameter / 2) -
                scale.map(center - diameter / 2),
            ) * (x ? context!.rect.width : context!.rect.height);
        }
        if (!Number.isFinite(diameter) || diameter > 1_000_000) {
          invalidDataSize = true;
          marker.visible = false;
          warning('size', '数据尺寸超出坐标轴定义域或可绘制范围，跳过此符号');
        } else marker.sizePt = diameter;
      }
    }
    if (override) {
      marker = { ...marker, ...structuredClone(override) };
      if (marker.shape !== 'custom') delete marker.customVertices;
    }
    // 显示开关不能修复非法的数据跨度；有效单点 sizePt 在前面已替代大小映射。
    if (invalidDataSize) marker.visible = false;
    validateMarkerAppearance(marker);
    resolved.set(row.sourceIndex, marker);
  }
  return {
    diagnostics,
    style(row: SeriesRow): AdvancedMarker {
      const marker = resolved.get(row.sourceIndex);
      const source = inputRows.get(row.sourceIndex);
      if (
        !marker ||
        !source ||
        source.identity !== row.identity ||
        source.x !== row.x ||
        source.y !== row.y
      )
        throw new Error('符号映射不能用于其他数据行');
      return structuredClone(marker);
    },
  };
}
