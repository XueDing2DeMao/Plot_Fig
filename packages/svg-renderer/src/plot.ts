import type { DataBindingSet } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import type { LinearScale } from './scales.js';
import type { RenderDiagnostic } from './types.js';

function column(data: DataBindingSet, slotId: string) {
  const binding = data.bindings.find(
    (item) => item.dataSlotId === slotId && item.status === 'valid',
  );
  return binding
    ? data.columns.find((item) => item.columnId === binding.columnId)
    : undefined;
}

export function renderPlot(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  data: DataBindingSet,
  xScale: LinearScale,
  yScale: LinearScale,
  rect: Rect,
): { svg: string; skipped: number; diagnostics: RenderDiagnostic[] } | undefined {
  const x = column(data, plot.bindings.x);
  const y = column(data, plot.bindings.y);
  if (!x || !y) return undefined;
  const points: Array<{ x: number; y: number }> = [];
  let skipped = 0;
  const diagnostics: RenderDiagnostic[] = [];
  const count = Math.min(x.values.length, y.values.length);
  for (let index = 0; index < count; index += 1) {
    const xv = x.values[index];
    const yv = y.values[index];
    if (
      typeof xv !== 'number' ||
      typeof yv !== 'number' ||
      !Number.isFinite(xv) ||
      !Number.isFinite(yv)
    ) {
      skipped += 1;
      continue;
    }
    points.push({
      x: rect.x + xScale.map(xv) * rect.width,
      y: rect.y + (1 - yScale.map(yv)) * rect.height,
    });
  }
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${formatNumber(point.x)} ${formatNumber(point.y)}`,
    )
    .join(' ');
  let svg = '';
  if (plot.mode !== 'markers' && plot.lineStyle?.visible && path)
    svg += `<path d="${path}" fill="none" stroke="${escapeXml(plot.lineStyle.color)}" stroke-width="${formatNumber(plot.lineStyle.widthPt)}" />`;
  if (plot.mode !== 'line' && plot.markerStyle?.visible)
    for (const point of points)
      svg += `<circle data-role="marker" cx="${formatNumber(point.x)}" cy="${formatNumber(point.y)}" r="${formatNumber(plot.markerStyle.sizePt / 2)}" fill="${escapeXml(plot.markerStyle.fill)}" stroke="${escapeXml(plot.markerStyle.stroke)}" stroke-width="${formatNumber(plot.markerStyle.strokeWidthPt)}" />`;
  if (plot.errorBarStyle?.visible) {
    const xError = renderErrorBars(
      plot,
      data,
      x,
      y,
      points,
      xScale,
      yScale,
      rect,
      'x',
    );
    const yError = renderErrorBars(
      plot,
      data,
      x,
      y,
      points,
      xScale,
      yScale,
      rect,
      'y',
    );
    svg += xError.svg + yError.svg;
    diagnostics.push(...xError.diagnostics, ...yError.diagnostics);
  }
  if (plot.legendEntry.visible)
    svg += `<text data-role="legend" x="${formatNumber(rect.x + rect.width)}" y="${formatNumber(rect.y - 8)}">${escapeXml(plot.legendEntry.text)}</text>`;
  return { svg, skipped, diagnostics };
}

type ErrorDirection = 'x' | 'y';

function finiteAt(columnData: ReturnType<typeof column>, index: number): number | undefined {
  const value = columnData?.values[index];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function resolveError(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  data: DataBindingSet,
  direction: ErrorDirection,
  index: number,
  base: number,
): { lower: number; upper: number } | undefined {
  const bindings = plot.bindings;
  const symmetricId = direction === 'x' ? bindings.xError : bindings.yError;
  const lowerId = direction === 'x' ? bindings.xErrorLower : bindings.yErrorLower;
  const upperId = direction === 'x' ? bindings.xErrorUpper : bindings.yErrorUpper;
  const symmetric = finiteAt(symmetricId ? column(data, symmetricId) : undefined, index);
  if (symmetric !== undefined) return { lower: base - symmetric, upper: base + symmetric };
  const lower = finiteAt(lowerId ? column(data, lowerId) : undefined, index);
  const upper = finiteAt(upperId ? column(data, upperId) : undefined, index);
  if (lower !== undefined && upper !== undefined)
    return { lower: base - lower, upper: base + upper };
  return undefined;
}

function hasErrorBinding(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  direction: ErrorDirection,
): boolean {
  const bindings = plot.bindings;
  return direction === 'x'
    ? Boolean(bindings.xError || bindings.xErrorLower || bindings.xErrorUpper)
    : Boolean(bindings.yError || bindings.yErrorLower || bindings.yErrorUpper);
}

function renderErrorBars(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  data: DataBindingSet,
  x: NonNullable<ReturnType<typeof column>>,
  y: NonNullable<ReturnType<typeof column>>,
  points: Array<{ x: number; y: number }>,
  xScale: LinearScale,
  yScale: LinearScale,
  rect: Rect,
  direction: ErrorDirection,
): { svg: string; diagnostics: RenderDiagnostic[] } {
  const diagnostics: RenderDiagnostic[] = [];
  let svg = '';
  for (let index = 0; index < points.length; index += 1) {
    const baseX = x.values[index];
    const baseY = y.values[index];
    if (typeof baseX !== 'number' || typeof baseY !== 'number') continue;
    const resolved = resolveError(plot, data, direction, index, direction === 'x' ? baseX : baseY);
    if (!resolved) {
      if (hasErrorBinding(plot, direction))
        diagnostics.push({
          code: 'RENDER_DATA_INVALID',
          severity: 'warning',
          sourcePath: '/',
          message: `Invalid ${direction}-error value skipped`,
        });
      continue;
    }
    const point = points[index]!;
    const style = plot.errorBarStyle!;
    if (direction === 'x') {
      const left = rect.x + xScale.map(resolved.lower) * rect.width;
      const right = rect.x + xScale.map(resolved.upper) * rect.width;
      const cap = style.capWidthPt / 2;
      svg += `<line data-role="error-bar" x1="${formatNumber(left)}" y1="${formatNumber(point.y)}" x2="${formatNumber(right)}" y2="${formatNumber(point.y)}" stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}" /><line data-role="error-cap" x1="${formatNumber(left)}" y1="${formatNumber(point.y - cap)}" x2="${formatNumber(left)}" y2="${formatNumber(point.y + cap)}" stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}" /><line data-role="error-cap" x1="${formatNumber(right)}" y1="${formatNumber(point.y - cap)}" x2="${formatNumber(right)}" y2="${formatNumber(point.y + cap)}" stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}" />`;
    } else {
      const top = rect.y + (1 - yScale.map(resolved.upper)) * rect.height;
      const bottom = rect.y + (1 - yScale.map(resolved.lower)) * rect.height;
      const cap = style.capWidthPt / 2;
      svg += `<line data-role="error-bar" x1="${formatNumber(point.x)}" y1="${formatNumber(top)}" x2="${formatNumber(point.x)}" y2="${formatNumber(bottom)}" stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}" /><line data-role="error-cap" x1="${formatNumber(point.x - cap)}" y1="${formatNumber(top)}" x2="${formatNumber(point.x + cap)}" y2="${formatNumber(top)}" stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}" /><line data-role="error-cap" x1="${formatNumber(point.x - cap)}" y1="${formatNumber(bottom)}" x2="${formatNumber(point.x + cap)}" y2="${formatNumber(bottom)}" stroke="${escapeXml(style.color)}" stroke-width="${formatNumber(style.widthPt)}" />`;
    }
  }
  return { svg, diagnostics };
}
