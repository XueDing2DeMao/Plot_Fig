import type { Axis } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';
import {
  MAX_AXIS_TICKS,
  planAxisTicks,
  type AxisTickPlan,
  type PlannedTick,
} from './tick-plan.js';
import { lineDash } from './plot-style.js';

export type AxisGridOptions = NonNullable<Axis['grid']>;
export type GridStyle = NonNullable<AxisGridOptions['major']>;

export function planAxisGridTicks(
  axis: Axis,
  scale: PlotScale,
  options: AxisGridOptions = {},
): AxisTickPlan {
  if (!axis.visible) return { major: [], minor: [] };
  const needsMinor = axis.minorTicks.visible || options.minor?.visible === true;
  const effective =
    needsMinor === axis.minorTicks.visible
      ? axis
      : { ...axis, minorTicks: { ...axis.minorTicks, visible: needsMinor } };
  return planAxisTicks(effective, scale);
}

function gridLine(
  axis: Axis,
  rect: Rect,
  tick: PlannedTick,
  style: GridStyle,
  role: 'major-grid' | 'minor-grid',
): string {
  if (!Number.isFinite(tick.ratio)) throw new Error('网格位置必须是有限坐标');
  const x = rect.x + tick.ratio * rect.width;
  const y = rect.y + (1 - tick.ratio) * rect.height;
  const segment =
    axis.dimension === 'x'
      ? { x1: x, y1: rect.y, x2: x, y2: rect.y + rect.height }
      : { x1: rect.x, y1: y, x2: rect.x + rect.width, y2: y };
  if (Object.values(segment).some((value) => !Number.isFinite(value)))
    throw new Error('网格位置必须是有限坐标');
  const coordinates = Object.entries(segment)
    .map(([key, value]) => `${key}="${formatNumber(value)}"`)
    .join(' ');
  return `<line data-role="${role}" ${coordinates} stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}"${lineDash(style.dash)} />`;
}

export function renderAxisGrid(
  axis: Axis,
  rect: Rect,
  plan: AxisTickPlan,
  options: AxisGridOptions,
  clipId: string,
): string {
  if (!axis.visible || (!options.major?.visible && !options.minor?.visible))
    return '';
  if (plan.major.length + plan.minor.length > MAX_AXIS_TICKS)
    throw new Error(
      `坐标轴刻度总数不能超过 ${MAX_AXIS_TICKS}，请增大间隔或减少刻度数量`,
    );
  const minor = options.minor?.visible
    ? plan.minor
        .map((tick) => gridLine(axis, rect, tick, options.minor!, 'minor-grid'))
        .join('')
    : '';
  const major = options.major?.visible
    ? plan.major
        .map((tick) => gridLine(axis, rect, tick, options.major!, 'major-grid'))
        .join('')
    : '';
  return `<g data-role="axis-grid" data-axis-id="${escapeXml(axis.axisId)}" clip-path="url(#${escapeXml(clipId)})">${minor}${major}</g>`;
}
