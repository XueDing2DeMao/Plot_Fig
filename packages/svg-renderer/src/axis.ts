import type {
  FigureTemplate,
  MajorTickGeneration,
} from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import type { PlotScale } from './scales.js';
import { planAxisTicks, type PlannedTick } from './tick-plan.js';
import { layoutAxisLabels } from './axis-label-layout.js';
import { renderAppearanceText } from './axis-appearance-text.js';

type Axis = FigureTemplate['panels'][number]['axes'][number];

function formatTick(axis: Axis, value: number, precise: boolean): string {
  const { notation, precision } = axis.tickLabels;
  if (notation === 'fixed') return value.toFixed(precision);
  if (notation === 'scientific') return value.toExponential(precision);
  return precise ? String(value) : formatNumber(value);
}

function axisLine(axis: Axis, rect: Rect): string {
  if (axis.dimension === 'x') {
    const y = axis.position === 'bottom' ? rect.y + rect.height : rect.y;
    return `<line data-role="axis-line" x1="${formatNumber(rect.x)}" y1="${formatNumber(y)}" x2="${formatNumber(rect.x + rect.width)}" y2="${formatNumber(y)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.line.widthPt)}" />`;
  }
  const x = axis.position === 'left' ? rect.x : rect.x + rect.width;
  return `<line data-role="axis-line" x1="${formatNumber(x)}" y1="${formatNumber(rect.y)}" x2="${formatNumber(x)}" y2="${formatNumber(rect.y + rect.height)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.line.widthPt)}" />`;
}

function renderTick(
  axis: Axis,
  rect: Rect,
  scale: PlotScale,
  tick: PlannedTick,
  precise: boolean,
): string {
  const { value, ratio } = tick;
  const label =
    scale.categories?.[value]?.label ?? formatTick(axis, value, precise);
  const horizontal = axis.dimension === 'x';
  const direction =
    axis.position === 'bottom' || axis.position === 'right' ? 1 : -1;
  const x = horizontal
    ? rect.x + ratio * rect.width
    : rect.x + (axis.position === 'right' ? rect.width : 0);
  const y = horizontal
    ? rect.y + (axis.position === 'bottom' ? rect.height : 0)
    : rect.y + (1 - ratio) * rect.height;
  const length = axis.majorTicks.lengthPt;
  const fontSize = axis.tickLabels.fontSizePt;
  const x2 = x + (horizontal ? 0 : direction * length);
  const y2 = y + (horizontal ? direction * length : 0);
  const tx = x + (horizontal ? 0 : direction * (length + 2));
  const ty =
    y + (horizontal ? direction * (length + fontSize + 2) : fontSize / 3);
  const anchor = horizontal
    ? 'middle'
    : axis.position === 'left'
      ? 'end'
      : 'start';
  const line = axis.majorTicks.visible
    ? `<line data-role="major-tick" x1="${formatNumber(x)}" y1="${formatNumber(y)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.majorTicks.widthPt)}" />`
    : '';
  const laidOut = layoutAxisLabels(
    [{ text: label, x: tx, y: ty, anchor }],
    {
      fontSizePt: fontSize,
      ...(axis.tickLabels.textFormat === undefined
        ? {}
        : { format: axis.tickLabels.textFormat }),
    },
    axis.dimension,
  )[0]!;
  const text = axis.tickLabels.visible
    ? laidOut.renderShared
      ? renderAppearanceText(laidOut, axis.tickLabels, 'tick-label')
      : `<text data-role="tick-label" x="${formatNumber(laidOut.x)}" y="${formatNumber(laidOut.y)}" text-anchor="${anchor}" fill="${escapeXml(axis.tickLabels.color)}" font-family="${escapeXml(axis.tickLabels.fontFamily)}" font-size="${formatNumber(fontSize)}">${escapeXml(label)}</text>`
    : '';
  return line + text;
}

function renderMinorTicks(
  axis: Axis,
  rect: Rect,
  minor: PlannedTick[],
): string {
  const parts: string[] = [];
  for (const { ratio: position } of minor) {
    if (axis.dimension === 'x') {
      const x = rect.x + position * rect.width;
      const y = axis.position === 'bottom' ? rect.y + rect.height : rect.y;
      const direction = axis.position === 'bottom' ? 1 : -1;
      parts.push(
        `<line data-role="minor-tick" x1="${formatNumber(x)}" y1="${formatNumber(y)}" x2="${formatNumber(x)}" y2="${formatNumber(y + direction * axis.minorTicks.lengthPt)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.minorTicks.widthPt)}" />`,
      );
    } else {
      const y = rect.y + (1 - position) * rect.height;
      const x = axis.position === 'left' ? rect.x : rect.x + rect.width;
      const direction = axis.position === 'left' ? -1 : 1;
      parts.push(
        `<line data-role="minor-tick" x1="${formatNumber(x)}" y1="${formatNumber(y)}" x2="${formatNumber(x + direction * axis.minorTicks.lengthPt)}" y2="${formatNumber(y)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.minorTicks.widthPt)}" />`,
      );
    }
  }
  return parts.join('');
}

function renderTitle(axis: Axis, rect: Rect): string {
  if (!axis.title) return '';
  if (axis.dimension === 'x') {
    const y =
      axis.position === 'bottom' ? rect.y + rect.height + 38 : rect.y - 28;
    const label = layoutAxisLabels(
      [
        {
          text: axis.title.text,
          x: rect.x + rect.width / 2,
          y,
          anchor: 'middle',
        },
      ],
      { fontSizePt: axis.title.fontSizePt, format: axis.title.format },
      axis.dimension,
    )[0]!;
    return renderAppearanceText(label, axis.title, 'axis-title');
  }
  const x = axis.position === 'left' ? rect.x - 42 : rect.x + rect.width + 42;
  const y = rect.y + rect.height / 2;
  const label = layoutAxisLabels(
    [{ text: axis.title.text, x, y, anchor: 'middle' }],
    {
      fontSizePt: axis.title.fontSizePt,
      rotation: -90,
      format: axis.title.format,
    },
    axis.dimension,
  )[0]!;
  return renderAppearanceText(label, axis.title, 'axis-title', true);
}

export function renderAxis(
  axis: Axis,
  rect: Rect,
  scale: PlotScale,
  generation: MajorTickGeneration | undefined = axis.majorTicks.generation,
): string {
  if (!axis.visible) return `<g data-role="axis-${axis.dimension}"></g>`;
  const ticks = planAxisTicks(axis, scale, generation);
  const precise = generation !== undefined && generation.mode !== 'auto';
  const ticksSvg = ticks.major
    .map((tick) => renderTick(axis, rect, scale, tick, precise))
    .join('');
  const minorSvg = renderMinorTicks(axis, rect, ticks.minor);
  return `<g data-role="axis-${axis.dimension}">${axisLine(axis, rect)}${minorSvg}${ticksSvg}${renderTitle(axis, rect)}</g>`;
}
