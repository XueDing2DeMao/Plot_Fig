import type { FigureTemplate } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber, type Rect } from './geometry.js';
import { renderAdvancedMarker } from './marker-appearance.js';
import { renderLineExtras, lineSymbolGapRadius } from './xy-line-extras.js';
import {
  lineAppearanceAttributes,
  hasLineAppearance,
} from './line-appearance.js';
import { fillAttributes, lineAttributes } from './charts/svg-marks.js';
export function legendSample(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  width: number,
): string {
  const x = 0,
    y = 0;
  let svg = '';
  if (plot.kind === 'box') {
    const line = lineAttributes(plot.lineStyle);
    return `<g data-role="legend-box"><line x1="${x + width / 2}" x2="${x + width / 2}" y1="${y - 7}" y2="${y + 7}" ${line} /><rect x="${x + 3}" y="${y - 4}" width="12" height="8" ${fillAttributes(plot.fillStyle)} /><line x1="${x + 3}" x2="${x + 15}" y1="${y}" y2="${y}" ${line} /></g>`;
  }
  if ('fillStyle' in plot)
    return (
      `<rect data-role="legend-fill" x="${formatNumber(x)}" y="${formatNumber(y - 4)}" width="${formatNumber(width)}" height="8" ${fillAttributes(plot.fillStyle)} />` +
      (plot.kind === 'area' &&
      plot.lineStyle.visible &&
      hasLineAppearance(plot.lineStyle)
        ? `<line data-role="legend-line" x1="0" x2="${formatNumber(width)}" y1="-4" y2="-4" ${lineAttributes(plot.lineStyle)} />`
        : '')
    );
  // 旧等高线图例没有样线；仅启用新样式时补充，保持旧图 SVG 输出。
  if (
    plot.kind === 'contour' &&
    plot.mode === 'lines' &&
    plot.lineStyle.visible &&
    hasLineAppearance(plot.lineStyle)
  )
    return `<line data-role="legend-line" x1="0" x2="${formatNumber(width)}" y1="0" y2="0" ${lineAttributes(plot.lineStyle)} />`;
  if (plot.kind !== 'xy') return '';
  const gapRadius = plot.lineStyle
    ? lineSymbolGapRadius(
        plot.lineStyle,
        plot.mode === 'line' ? undefined : plot.markerStyle,
        plot.symbolGapPct ?? 0,
      )
    : 0;
  // 样线只表达箭头样式：在固定图例宽度内缩短箭头，不改曲线保存的物理长度。
  const arrows = plot.lineArrows
    ? {
        ...plot.lineArrows,
        lengthPt: Math.max(
          1,
          Math.min(plot.lineArrows.lengthPt, (width / 2 - gapRadius) * 0.8),
        ),
      }
    : undefined;
  if (
    plot.mode !== 'markers' &&
    plot.lineStyle?.visible &&
    (plot.symbolGapPct || plot.lineArrows)
  )
    svg += `<g data-role="legend-line">${renderLineExtras({
      points: [
        { x, y },
        { x: x + width, y },
      ],
      symbols: [{ x: x + width / 2, y }],
      connection: 'straight',
      line: plot.lineStyle,
      ...(plot.mode !== 'line' && plot.markerStyle
        ? { marker: plot.markerStyle }
        : {}),
      extras: {
        ...(plot.symbolGapPct === undefined
          ? {}
          : { symbolGapPct: plot.symbolGapPct }),
        ...(arrows ? { lineArrows: arrows } : {}),
      },
    })}</g>`;
  else if (plot.mode !== 'markers' && plot.lineStyle?.visible)
    svg += `<line data-role="legend-line" x1="${formatNumber(x)}" x2="${formatNumber(x + width)}" y1="${formatNumber(y)}" y2="${formatNumber(y)}" stroke="${escapeXml(plot.lineStyle.color)}" stroke-width="${formatNumber(plot.lineStyle.widthPt)}"${lineAppearanceAttributes(plot.lineStyle)} />`;
  if (plot.mode !== 'line' && plot.markerStyle?.visible)
    svg += renderAdvancedMarker(
      { x: x + width / 2, y },
      plot.markerStyle,
      plot.lineStyle?.opacity,
    ).replace('data-role="marker"', 'data-role="legend-marker"');
  return svg;
}
