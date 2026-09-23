import type {
  Axis,
  AxisPlacement,
  TickDirection,
} from '@plot-fig/figure-schema';
import type { Rect } from './geometry.js';
import type { PlotScale } from './scales.js';
import { isPositiveLogAxis } from '@plot-fig/figure-schema';

export type { AxisPlacement, TickDirection } from '@plot-fig/figure-schema';
export type AxisLayoutOptions = {
  lineVisible?: boolean;
  placement?: AxisPlacement;
};
export type AxisLayoutContext = {
  axes: readonly Axis[];
  scales: ReadonlyMap<string, PlotScale>;
};
export type AxisSegment = { x1: number; y1: number; x2: number; y2: number };
export type AxisLayout = {
  rect: Rect;
  horizontal: boolean;
  outward: 1 | -1;
  coordinate: number;
  normalOffsetPt: number;
  line: AxisSegment | null;
};

function crossingRatio(
  axis: Axis,
  placement: Extract<AxisPlacement, { mode: 'cross' }>,
  context?: AxisLayoutContext,
): number {
  const opposite = context?.axes.find(
    (candidate) => candidate.axisId === placement.axisId,
  );
  if (!opposite) throw new Error('交叉位置需要同一图层内的有效对侧坐标轴');
  if (opposite.dimension === axis.dimension)
    throw new Error('交叉位置必须引用另一维度的坐标轴');
  const scale = context!.scales.get(opposite.axisId);
  if (!scale) throw new Error('交叉坐标轴尚无可用范围');
  if (
    opposite.scale === 'category' ||
    scale.scale === 'category' ||
    scale.categories
  )
    throw new Error('分类轴不支持数值交叉位置');
  if (scale.scale !== opposite.scale)
    throw new Error('交叉坐标轴尺度与映射不一致');
  if (!Number.isFinite(placement.value))
    throw new Error('交叉位置必须是有限数值');
  if (isPositiveLogAxis(opposite) && placement.value <= 0)
    throw new Error('对数轴交叉位置必须是有限正数');
  if (
    !Number.isFinite(scale.min) ||
    !Number.isFinite(scale.max) ||
    scale.min >= scale.max ||
    placement.value < scale.min ||
    placement.value > scale.max
  )
    throw new Error('交叉位置必须位于对侧坐标轴范围内');
  const ratio = scale.map(placement.value);
  if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1)
    throw new Error('交叉位置映射必须位于有限坐标范围内');
  return ratio;
}

export function layoutAxis(
  axis: Axis,
  rect: Rect,
  options: AxisLayoutOptions = {},
  context?: AxisLayoutContext,
): AxisLayout {
  const horizontal = axis.dimension === 'x';
  const outward =
    axis.position === 'bottom' || axis.position === 'right' ? 1 : -1;
  const frameCoordinate = horizontal
    ? axis.position === 'bottom'
      ? rect.y + rect.height
      : rect.y
    : axis.position === 'right'
      ? rect.x + rect.width
      : rect.x;
  const placement = options.placement ?? { mode: 'frame' };
  const offset = placement.offsetPt ?? 0;
  if (!Number.isFinite(offset)) throw new Error('坐标轴偏移必须是有限点数');
  let coordinate = frameCoordinate;
  if (placement.mode === 'cross') {
    const ratio = crossingRatio(axis, placement, context);
    coordinate = horizontal
      ? rect.y + (1 - ratio) * rect.height
      : rect.x + ratio * rect.width;
  } else if (placement.mode === 'percent') {
    const percent = placement.percent;
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      throw new Error('坐标轴位置百分比必须在 0–100 之间');
    coordinate = horizontal
      ? rect.y + (percent / 100) * rect.height
      : rect.x + (percent / 100) * rect.width;
  }
  coordinate += outward * offset;
  if (!Number.isFinite(coordinate))
    throw new Error('坐标轴位置超出有限坐标范围');
  const line =
    options.lineVisible === false
      ? null
      : horizontal
        ? {
            x1: rect.x,
            y1: coordinate,
            x2: rect.x + rect.width,
            y2: coordinate,
          }
        : {
            x1: coordinate,
            y1: rect.y,
            x2: coordinate,
            y2: rect.y + rect.height,
          };
  const normalOffsetPt =
    coordinate === frameCoordinate
      ? 0
      : (coordinate - frameCoordinate) * outward;
  if (
    !Number.isFinite(normalOffsetPt) ||
    (line && !Object.values(line).every(Number.isFinite))
  )
    throw new Error('坐标轴线段或法向位移超出有限坐标范围');
  return { rect, horizontal, outward, coordinate, normalOffsetPt, line };
}
export function axisPointAt(
  layout: AxisLayout,
  ratio: number,
): { x: number; y: number } {
  const { rect, horizontal, coordinate } = layout;
  // 保留旧版先乘比例再加起点的顺序，避免默认刻度 SVG 浮点坐标改变。
  const x = horizontal ? rect.x + ratio * rect.width : coordinate;
  const y = horizontal ? coordinate : rect.y + (1 - ratio) * rect.height;
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw new Error('刻度位置必须是有限坐标');
  return { x, y };
}
export function axisTickSegment(
  layout: AxisLayout,
  ratio: number,
  lengthPt: number,
  direction: TickDirection = 'out',
): AxisSegment {
  if (!Number.isFinite(lengthPt) || lengthPt < 0)
    throw new Error('刻度长度必须是有限非负点数');
  const point = axisPointAt(layout, ratio);
  const inner = direction === 'both' ? -layout.outward * lengthPt : 0;
  const outer =
    (direction === 'in' ? -layout.outward : layout.outward) * lengthPt;
  const segment = {
    x1: point.x + (layout.horizontal ? 0 : inner),
    y1: point.y + (layout.horizontal ? inner : 0),
    x2: point.x + (layout.horizontal ? 0 : outer),
    y2: point.y + (layout.horizontal ? outer : 0),
  };
  if (!Object.values(segment).every(Number.isFinite))
    throw new Error('刻度线段超出有限坐标范围');
  return segment;
}
