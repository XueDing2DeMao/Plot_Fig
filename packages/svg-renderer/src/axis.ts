import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import { generateMajorTicks, type PlotScale } from './scales.js';

type Axis = FigureTemplate['panels'][number]['axes'][number];

function tickValues(axis: Axis, scale: PlotScale): number[] {
  if (scale.scale === 'linear')
    return generateMajorTicks(scale.min, scale.max, 6);
  const transform = scale.scale === 'log10' ? Math.log10 : Math.log;
  const inverse =
    scale.scale === 'log10' ? (value: number) => 10 ** value : Math.exp;
  const low = Math.ceil(transform(scale.min));
  const high = Math.floor(transform(scale.max));
  const values: number[] = [];
  for (let exponent = low; exponent <= high; exponent += 1)
    values.push(inverse(exponent));
  if (values.length < 2) return [scale.min, scale.max];
  return values;
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
  value: number,
): string {
  const ratio = scale.map(value);
  const label = formatNumber(value);
  if (axis.dimension === 'x') {
    const x = rect.x + ratio * rect.width;
    const y = axis.position === 'bottom' ? rect.y + rect.height : rect.y;
    const direction = axis.position === 'bottom' ? 1 : -1;
    return `<line data-role="major-tick" x1="${formatNumber(x)}" y1="${formatNumber(y)}" x2="${formatNumber(x)}" y2="${formatNumber(y + direction * axis.majorTicks.lengthPt)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.majorTicks.widthPt)}" /><text data-role="tick-label" x="${formatNumber(x)}" y="${formatNumber(y + direction * (axis.majorTicks.lengthPt + axis.tickLabels.fontSizePt + 2))}" text-anchor="middle" fill="${escapeXml(axis.tickLabels.color)}" font-family="${escapeXml(axis.tickLabels.fontFamily)}" font-size="${formatNumber(axis.tickLabels.fontSizePt)}">${escapeXml(label)}</text>`;
  }
  const y = rect.y + (1 - ratio) * rect.height;
  const x = axis.position === 'left' ? rect.x : rect.x + rect.width;
  const direction = axis.position === 'left' ? -1 : 1;
  return `<line data-role="major-tick" x1="${formatNumber(x)}" y1="${formatNumber(y)}" x2="${formatNumber(x + direction * axis.majorTicks.lengthPt)}" y2="${formatNumber(y)}" stroke="${escapeXml(axis.line.color)}" stroke-width="${formatNumber(axis.majorTicks.widthPt)}" /><text data-role="tick-label" x="${formatNumber(x + direction * (axis.majorTicks.lengthPt + 2))}" y="${formatNumber(y + axis.tickLabels.fontSizePt / 3)}" text-anchor="${axis.position === 'left' ? 'end' : 'start'}" fill="${escapeXml(axis.tickLabels.color)}" font-family="${escapeXml(axis.tickLabels.fontFamily)}" font-size="${formatNumber(axis.tickLabels.fontSizePt)}">${escapeXml(label)}</text>`;
}

function renderTitle(axis: Axis, rect: Rect): string {
  if (!axis.title) return '';
  if (axis.dimension === 'x') {
    const y =
      axis.position === 'bottom' ? rect.y + rect.height + 38 : rect.y - 28;
    return `<text data-role="axis-title" x="${formatNumber(rect.x + rect.width / 2)}" y="${formatNumber(y)}" text-anchor="middle" fill="${escapeXml(axis.title.color)}" font-family="${escapeXml(axis.title.fontFamily)}" font-size="${formatNumber(axis.title.fontSizePt)}">${escapeXml(axis.title.text)}</text>`;
  }
  const x = axis.position === 'left' ? rect.x - 42 : rect.x + rect.width + 42;
  const y = rect.y + rect.height / 2;
  return `<text data-role="axis-title" x="${formatNumber(x)}" y="${formatNumber(y)}" text-anchor="middle" transform="rotate(-90 ${formatNumber(x)} ${formatNumber(y)})" fill="${escapeXml(axis.title.color)}" font-family="${escapeXml(axis.title.fontFamily)}" font-size="${formatNumber(axis.title.fontSizePt)}">${escapeXml(axis.title.text)}</text>`;
}

export function renderAxis(axis: Axis, rect: Rect, scale: PlotScale): string {
  const ticks = axis.tickLabels.visible ? tickValues(axis, scale) : [];
  const ticksSvg = axis.majorTicks.visible
    ? ticks.map((value) => renderTick(axis, rect, scale, value)).join('')
    : '';
  return `<g data-role="axis-${axis.dimension}">${axis.visible ? axisLine(axis, rect) : ''}${ticksSvg}${renderTitle(axis, rect)}</g>`;
}
