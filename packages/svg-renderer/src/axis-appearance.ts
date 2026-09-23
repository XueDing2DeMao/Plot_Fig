import type { Axis } from '@plot-fig/figure-schema';
import { isAdvancedAxis } from '@plot-fig/figure-schema';
import { renderAxis } from './axis.js';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';
import {
  planAxisGridTicks,
  renderAxisGrid,
  type AxisGridOptions,
} from './axis-grid.js';
import {
  layoutAxis,
  axisPointAt,
  axisTickSegment,
  type AxisLayout,
  type AxisSegment,
  type AxisLayoutContext,
  type AxisPlacement,
  type TickDirection,
} from './axis-layout.js';
import {
  formatAxisLabel,
  formatAxisCategoryLabel,
  type AxisLabelFormatOptions,
} from './axis-label-format.js';
import {
  layoutAxisLabels,
  type AxisLabelLayoutOptions,
  type AxisLabelPlacement,
} from './axis-label-layout.js';
import {
  renderAppearanceText,
  renderAppearanceTitle,
} from './axis-appearance-text.js';
import type { AxisTickPlan, PlannedTick } from './tick-plan.js';
import type {
  TextContentFormat,
  TextLayoutOptions as SchemaTextLayoutOptions,
} from '@plot-fig/figure-schema';
import { MAX_AXIS_TICKS, planAxisTicks } from './tick-plan.js';
import { advancedAxisLabel } from './axis-advanced-labels.js';

export type AxisAppearance = {
  /** 内部尺度能力产生的位置计划；不读取或保存到图形 schema。 */
  tickPlan?: AxisTickPlan;
  lineVisible?: boolean;
  placement?: AxisPlacement;
  majorTicks?: { direction?: TickDirection; color?: string };
  minorTicks?: {
    direction?: TickDirection;
    color?: string;
    lengthMode?: 'manual' | 'auto';
  };
  grid?: AxisGridOptions;
  tickLabels?: AxisLabelFormatOptions &
    Omit<AxisLabelLayoutOptions, 'fontSizePt'> & {
      anchor?: 'start' | 'middle' | 'end';
      position?: 'tick' | 'interval';
      textFormat?: TextContentFormat;
      layout?: SchemaTextLayoutOptions;
    };
  title?: {
    position?: number;
    rotation?: number;
    offsetPt?: { x: number; y: number };
    bold?: boolean;
    italic?: boolean;
  };
};

function segmentSvg(
  role: string,
  segment: AxisSegment,
  color: string,
  widthPt: number,
): string {
  const coordinates = Object.entries(segment)
    .map(([key, value]) => `${key}="${formatNumber(value)}"`)
    .join(' ');
  return `<line data-role="${role}" ${coordinates} stroke="${escapeXml(color)}" stroke-width="${formatNumber(widthPt)}" />`;
}

function labelPlacement(
  axis: Axis,
  layout: AxisLayout,
  scale: PlotScale,
  tick: PlannedTick,
  ratio: number,
  options: AxisAppearance,
): AxisLabelPlacement {
  const labelOptions = options.tickLabels;
  const generation = axis.majorTicks.generation;
  let displayValue =
    axis.scale === 'probit'
      ? scale.numeric!.capability.forward(tick.value)
      : tick.value;
  if (
    !['linear', 'log10', 'ln', 'log2', 'category'].includes(axis.scale) &&
    axis.tickLabels.notation === 'auto' &&
    !axis.advanced?.ticks?.major &&
    (!generation || generation.mode === 'auto')
  ) {
    const span =
      axis.scale === 'probit'
        ? Math.abs(
            scale.numeric!.capability.forward(scale.max) -
              scale.numeric!.capability.forward(scale.min),
          )
        : scale.max - scale.min;
    const digits = Math.min(
      15,
      Math.max(6, Math.ceil(Math.log10(Math.abs(displayValue) / span)) + 5),
    );
    if (Number.isFinite(digits))
      displayValue = Number(displayValue.toPrecision(digits));
  }
  const text =
    tick.label ??
    (scale.categories
      ? formatAxisCategoryLabel(
          scale.categories[tick.value]?.label ?? '',
          labelOptions,
        )
      : formatAxisLabel(displayValue, {
          notation: axis.tickLabels.notation,
          precision: axis.tickLabels.precision,
          preciseAuto:
            options.tickPlan !== undefined ||
            isAdvancedAxis(axis) ||
            (generation !== undefined && generation.mode !== 'auto'),
          ...labelOptions,
          ...tick.labelStyle,
        }));
  const { x, y } = axisPointAt(layout, ratio);
  const length =
    (options.majorTicks?.direction === 'in'
      ? 0
      : (tick.special?.lengthPt ?? axis.majorTicks.lengthPt)) +
    (tick.special?.leaderPt ?? 0);
  const fontSize = tick.special?.fontSizePt ?? axis.tickLabels.fontSizePt;
  return {
    text,
    ...(tick.special?.fontSizePt === undefined
      ? {}
      : { fontSizePt: tick.special.fontSizePt }),
    x: x + (layout.horizontal ? 0 : layout.outward * (length + 2)),
    y:
      y +
      (layout.horizontal
        ? layout.outward * (length + fontSize + 2)
        : fontSize / 3),
    anchor:
      labelOptions?.anchor ??
      (layout.horizontal
        ? 'middle'
        : axis.position === 'left'
          ? 'end'
          : 'start'),
  };
}

function prepareAppearance(
  axis: Axis,
  rect: Rect,
  scale: PlotScale,
  options: AxisAppearance,
  context?: AxisLayoutContext,
) {
  const layout = layoutAxis(
    axis,
    rect,
    {
      ...(options.lineVisible === undefined
        ? {}
        : { lineVisible: options.lineVisible }),
      ...(options.placement === undefined
        ? {}
        : { placement: options.placement }),
    },
    context,
  );
  const plan = options.tickPlan ?? planAxisGridTicks(axis, scale, options.grid);
  if (
    (options.tickPlan || isAdvancedAxis(axis)) &&
    plan.major.length + plan.minor.length > MAX_AXIS_TICKS
  )
    throw new Error(`坐标轴刻度总数不能超过 ${MAX_AXIS_TICKS}`);
  for (const ticks of options.tickPlan || isAdvancedAxis(axis)
    ? [plan.major, plan.minor]
    : []) {
    let previous = -Infinity;
    for (const tick of ticks) {
      if (
        !Number.isFinite(tick.value) ||
        !Number.isFinite(tick.ratio) ||
        tick.ratio < 0 ||
        tick.ratio > 1 ||
        tick.value <= previous
      )
        throw new Error('刻度计划必须具有有限递增数值和绘图区内的位置');
      previous = tick.value;
    }
  }
  const placements = axis.tickLabels.visible
    ? plan.major.flatMap((tick, index) => {
        const interval = options.tickLabels?.position === 'interval';
        const next = plan.major[index + 1];
        if (interval && !next) return [];
        const ratio = interval
          ? tick.ratio + (next!.ratio - tick.ratio) / 2
          : tick.ratio;
        return [labelPlacement(axis, layout, scale, tick, ratio, options)];
      })
    : [];
  const labelLayoutEnabled = (
    [
      'anchor',
      'position',
      'rotation',
      'offsetPt',
      'wrapWidthPt',
      'lineHeight',
      'overlap',
    ] as const
  ).some((key) => options.tickLabels?.[key] !== undefined);
  // 字体、颜色、格式和前后缀不应顺带把旧类别文字重排为多行。
  // 未启用标签布局时按 SVG 的空白折叠估计边界，输出仍保留原始文字。
  const labels = layoutAxisLabels(
    labelLayoutEnabled
      ? placements
      : placements.map((item) => ({
          ...item,
          text: item.text.replace(/\r\n?|\n/g, ' '),
        })),
    {
      fontSizePt: axis.tickLabels.fontSizePt,
      ...options.tickLabels,
      ...(options.tickLabels?.textFormat === undefined
        ? {}
        : { format: options.tickLabels.textFormat }),
      mathIdPrefix: `axis-${axis.axisId}-tick`,
    },
    axis.dimension,
  );
  if (!labelLayoutEnabled)
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]!;
      label.text = placements[i]!.text;
      label.lines = [{ text: label.text, x: label.x, y: label.y }];
    }
  return { layout, plan, labels };
}

// 共用布局与数值校验，但不构造整幅刻度/标签 SVG，供无数据时的草稿门禁使用。
export function validateAxisAppearance(
  axis: Axis,
  rect: Rect,
  scale: PlotScale,
  options: AxisAppearance,
  context?: AxisLayoutContext,
): void {
  if (!axis.visible) return;
  if (Object.keys(options).length === 0 && !isAdvancedAxis(axis)) {
    planAxisTicks(axis, scale);
    return;
  }
  const { layout, plan } = prepareAppearance(
    axis,
    rect,
    scale,
    options,
    context,
  );
  if (axis.majorTicks.visible)
    for (const tick of plan.major)
      axisTickSegment(
        layout,
        tick.ratio,
        axis.majorTicks.lengthPt,
        options.majorTicks?.direction,
      );
  if (axis.minorTicks.visible)
    for (const tick of plan.minor)
      axisTickSegment(
        layout,
        tick.ratio,
        options.minorTicks?.lengthMode === 'auto'
          ? axis.majorTicks.lengthPt / 2
          : axis.minorTicks.lengthPt,
        options.minorTicks?.direction,
      );
  renderAppearanceTitle(axis, layout, options.title);
}

export function renderAxisAppearance(
  axis: Axis,
  rect: Rect,
  scale: PlotScale,
  options: AxisAppearance = {},
  context?: AxisLayoutContext & { gridClipId?: string },
): { axisSvg: string; gridSvg: string; gridLayer: 'back' | 'front' } {
  const gridLayer = options.grid?.layer ?? 'back';
  if (
    !axis.visible ||
    (Object.keys(options).length === 0 && !isAdvancedAxis(axis))
  )
    return { axisSvg: renderAxis(axis, rect, scale), gridSvg: '', gridLayer };
  const { layout, plan, labels } = prepareAppearance(
    axis,
    rect,
    scale,
    options,
    context,
  );
  const line = layout.line
    ? scale.segments
      ? scale.segments
          .map((s) => {
            const a = axisPointAt(layout, s.from),
              b = axisPointAt(layout, s.to);
            return segmentSvg(
              'axis-line',
              { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
              axis.line.color,
              axis.line.widthPt,
            );
          })
          .join('')
      : segmentSvg('axis-line', layout.line, axis.line.color, axis.line.widthPt)
    : '';
  const minorLength =
    options.minorTicks?.lengthMode === 'auto'
      ? axis.majorTicks.lengthPt / 2
      : axis.minorTicks.lengthPt;
  const minors = axis.minorTicks.visible
    ? plan.minor
        .map((tick) =>
          segmentSvg(
            'minor-tick',
            axisTickSegment(
              layout,
              tick.ratio,
              minorLength,
              options.minorTicks?.direction,
            ),
            options.minorTicks?.color ?? axis.line.color,
            axis.minorTicks.widthPt,
          ),
        )
        .join('')
    : '';
  const majors = plan.major
    .map((tick, index) => {
      const mark = axis.majorTicks.visible
        ? segmentSvg(
            'major-tick',
            axisTickSegment(
              layout,
              tick.ratio,
              tick.special?.lengthPt ?? axis.majorTicks.lengthPt,
              options.majorTicks?.direction,
            ),
            tick.special?.color ?? options.majorTicks?.color ?? axis.line.color,
            axis.majorTicks.widthPt,
          )
        : '';
      return (
        mark +
        (labels[index]
          ? renderAppearanceText(
              labels[index]!,
              {
                ...axis.tickLabels,
                ...(tick.special?.color ? { color: tick.special.color } : {}),
                ...(tick.special?.fontSizePt
                  ? { fontSizePt: tick.special.fontSizePt }
                  : {}),
              },
              'tick-label',
            )
          : '')
      );
    })
    .join('');
  const clipId = context?.gridClipId ?? `axis-grid-clip-${axis.axisId}`;
  let extras = '';
  for (const tick of plan.major)
    if (tick.special?.leaderPt) {
      const p = axisPointAt(layout, tick.ratio),
        length = tick.special.leaderPt * layout.outward;
      extras += segmentSvg(
        'special-tick-leader',
        {
          x1: p.x,
          y1: p.y,
          x2: p.x + (layout.horizontal ? 0 : length),
          y2: p.y + (layout.horizontal ? length : 0),
        },
        tick.special.color ?? axis.line.color,
        axis.line.widthPt,
      );
    }
  if (scale.segments)
    for (let i = 1; i < scale.segments.length; i++) {
      const ratio = (scale.segments[i - 1]!.to + scale.segments[i]!.from) / 2,
        p = axisPointAt(layout, ratio),
        size = axis.advanced?.breaks?.markSizePt ?? 5;
      const shape = axis.advanced?.breaks?.mark ?? 'slash';
      if (shape === 'zigzag') {
        const coords = layout.horizontal
          ? `${p.x - size},${p.y - size / 2} ${p.x - size / 3},${p.y + size / 2} ${p.x + size / 3},${p.y - size / 2} ${p.x + size},${p.y + size / 2}`
          : `${p.x - size / 2},${p.y - size} ${p.x + size / 2},${p.y - size / 3} ${p.x - size / 2},${p.y + size / 3} ${p.x + size / 2},${p.y + size}`;
        extras += `<polyline data-role="axis-break" points="${coords}" fill="none" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.line.widthPt)}"/>`;
      } else
        for (const offset of [-size / 3, size / 3])
          extras += segmentSvg(
            'axis-break',
            layout.horizontal
              ? {
                  x1: p.x + offset - size / 4,
                  y1: p.y + size / 2,
                  x2: p.x + offset + size / 4,
                  y2: p.y - size / 2,
                }
              : {
                  x1: p.x - size / 2,
                  y1: p.y + offset + size / 4,
                  x2: p.x + size / 2,
                  y2: p.y + offset - size / 4,
                },
            axis.line.color,
            axis.line.widthPt,
          );
    }
  if (axis.advanced?.arrow && layout.line)
    for (const end of axis.advanced.arrow === 'both'
      ? [0, 1]
      : [axis.advanced.arrow === 'start' ? 0 : 1]) {
      const p = axisPointAt(layout, end),
        direction = end === 0 ? -1 : 1,
        size = 6;
      const points = layout.horizontal
        ? `${p.x},${p.y} ${p.x - direction * size},${p.y - size / 2} ${p.x - direction * size},${p.y + size / 2}`
        : `${p.x},${p.y} ${p.x - size / 2},${p.y + direction * size} ${p.x + size / 2},${p.y + direction * size}`;
      extras += `<polygon data-role="axis-arrow" points="${points}" fill="${escapeXml(axis.line.color)}"/>`;
    }
  const extraLabel = (
    tick: PlannedTick,
    text: string,
    distance: number,
    fontSize: number,
    color: string,
    role: string,
  ) => {
    const p = axisPointAt(layout, tick.ratio),
      x = p.x + (layout.horizontal ? 0 : layout.outward * distance),
      y = p.y + (layout.horizontal ? layout.outward * distance : fontSize / 3);
    return `<text data-role="${role}" x="${formatNumber(x)}" y="${formatNumber(y)}" text-anchor="${layout.horizontal ? 'middle' : layout.outward < 0 ? 'end' : 'start'}" font-family="${escapeXml(axis.tickLabels.fontFamily)}" font-size="${formatNumber(fontSize)}" fill="${escapeXml(color)}">${escapeXml(text)}</text>`;
  };
  let tableExtent = 0;
  if (axis.advanced?.labelTable) {
    const fontSize = axis.tickLabels.fontSizePt,
      gap = axis.advanced.labelTable.gapPt ?? 3;
    tableExtent = axis.majorTicks.lengthPt + fontSize + 2;
    for (const label of labels)
      if (label.visible) {
        const b = label.bounds;
        tableExtent = Math.max(
          tableExtent,
          layout.horizontal
            ? (label.y - layout.coordinate) * layout.outward
            : layout.outward < 0
              ? layout.coordinate - b.x
              : b.x + b.width - layout.coordinate,
        );
      }
    for (const row of axis.advanced.labelTable.rows) {
      const texts = plan.major.map(
        (tick, i) =>
          (row.title ? row.title + ': ' : '') +
          (advancedAxisLabel(axis, scale, tick.value, i, row) ??
            formatAxisLabel(tick.value, axis.tickLabels)),
      );
      const distance = tableExtent + gap + (layout.horizontal ? fontSize : 0);
      plan.major.forEach((tick, i) => {
        extras += extraLabel(
          tick,
          texts[i]!,
          distance,
          fontSize,
          axis.tickLabels.color,
          'axis-label-table',
        );
      });
      const widths = layout.horizontal
        ? []
        : layoutAxisLabels(
            texts.map((text) => ({
              text,
              x: 0,
              y: 0,
              anchor: 'middle' as const,
            })),
            { fontSizePt: fontSize },
            axis.dimension,
          ).map((label) => label.bounds.width);
      tableExtent = distance + (layout.horizontal ? 0 : Math.max(0, ...widths));
    }
  }
  let titleOptions = options.title;
  if (tableExtent && axis.title) {
    const base = layout.horizontal
      ? axis.position === 'bottom'
        ? 38
        : 28
      : 42;
    const extra = Math.max(0, tableExtent + axis.title.fontSizePt + 8 - base);
    titleOptions = {
      ...options.title,
      offsetPt: {
        x:
          (options.title?.offsetPt?.x ?? 0) +
          (layout.horizontal ? 0 : layout.outward * extra),
        y:
          (options.title?.offsetPt?.y ?? 0) +
          (layout.horizontal ? layout.outward * extra : 0),
      },
    };
  }
  if (axis.advanced?.minorLabels?.visible)
    for (const [i, tick] of plan.minor.entries()) {
      const config = axis.advanced.minorLabels,
        size = config.fontSizePt ?? axis.tickLabels.fontSizePt * 0.8;
      extras += extraLabel(
        tick,
        advancedAxisLabel(axis, scale, tick.value, i) ??
          formatAxisLabel(tick.value, {
            ...axis.tickLabels,
            preciseAuto: true,
          }),
        axis.minorTicks.lengthPt + size + 2,
        size,
        config.color ?? axis.tickLabels.color,
        'minor-tick-label',
      );
    }
  const grid = renderAxisGrid(axis, rect, plan, options.grid ?? {}, clipId);
  const gridSvg = grid
    ? context?.gridClipId
      ? grid
      : `<defs><clipPath id="${escapeXml(clipId)}"><rect x="${formatNumber(rect.x)}" y="${formatNumber(rect.y)}" width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}" /></clipPath></defs>${grid}`
    : '';
  return {
    axisSvg: `<g data-role="axis-${axis.dimension}">${line}${minors}${majors}${extras}${renderAppearanceTitle(axis, layout, titleOptions)}</g>`,
    gridSvg,
    gridLayer,
  };
}
