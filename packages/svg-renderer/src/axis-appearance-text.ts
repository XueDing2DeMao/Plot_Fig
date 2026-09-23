import type { Axis } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber } from './geometry.js';
import { layoutAxisLabels, type AxisLabelLayout } from './axis-label-layout.js';
import type { AxisLayout } from './axis-layout.js';
import { layoutText } from './text/layout.js';
import { renderText } from './text/render.js';
import { typesetMath } from './text/mathjax-adapter.js';
import { resolveTextFormat } from './text/parse.js';

type Font = { fontFamily: string; fontSizePt: number; color: string };
export type AxisTitleAppearance = {
  position?: number;
  rotation?: number;
  offsetPt?: { x: number; y: number };
  bold?: boolean;
  italic?: boolean;
};

export function renderAppearanceText(
  label: AxisLabelLayout,
  font: Font,
  role: 'tick-label' | 'axis-title',
  legacyTransformOrder = false,
): string {
  if (!label.visible) return '';
  if (label.renderShared)
    return renderText(
      { ...label.sharedLayout, font: { ...label.sharedLayout.font, ...font } },
      role,
    );
  const transform = label.rotation
    ? ` transform="rotate(${formatNumber(label.rotation)} ${formatNumber(label.x)} ${formatNumber(label.y)})"`
    : '';
  const style = `${label.bold ? ' font-weight="bold"' : ''}${label.italic ? ' font-style="italic"' : ''}`;
  const body =
    label.lines.length === 1
      ? escapeXml(label.lines[0]!.text)
      : label.lines
          .map(
            (line) =>
              `<tspan x="${formatNumber(line.x)}" y="${formatNumber(line.y)}">${escapeXml(line.text)}</tspan>`,
          )
          .join('');
  const bounds = label.unrotatedBounds;
  const background =
    label.background === 'white' && label.text.trim()
      ? `<rect data-role="${role}-background" x="${formatNumber(bounds.x)}" y="${formatNumber(bounds.y)}" width="${formatNumber(bounds.width)}" height="${formatNumber(bounds.height)}" fill="#ffffff"${transform} />`
      : '';
  return `${background}<text data-role="${role}" x="${formatNumber(label.x)}" y="${formatNumber(label.y)}" text-anchor="${label.anchor}"${legacyTransformOrder ? transform : ''} fill="${escapeXml(font.color)}" font-family="${escapeXml(font.fontFamily)}" font-size="${formatNumber(font.fontSizePt)}"${style}${legacyTransformOrder ? '' : transform}>${body}</text>`;
}

export function renderAppearanceTitle(
  axis: Axis,
  layout: AxisLayout,
  options: AxisTitleAppearance = {},
): string {
  if (!axis.title) return '';
  const position = options.position ?? 0.5;
  if (!Number.isFinite(position) || position < 0 || position > 1)
    throw new Error('标题位置必须在 0–1 之间');
  const { rect, horizontal } = layout;
  const x = horizontal
    ? rect.x + position * rect.width
    : layout.coordinate + layout.outward * 42;
  const y = horizontal
    ? layout.coordinate + (axis.position === 'bottom' ? 38 : -28)
    : rect.y + position * rect.height;
  const resolvedFormat = resolveTextFormat(axis.title.text, axis.title.format);
  if (resolvedFormat !== 'plain' || axis.title.layout !== undefined) {
    const resolvedX = x + (options.offsetPt?.x ?? 0);
    const resolvedY = y + (options.offsetPt?.y ?? 0);
    return renderText(
      layoutText(
        axis.title.text,
        {
          fontFamily: axis.title.fontFamily,
          fontSizePt: axis.title.fontSizePt,
          color: axis.title.color,
          bold: options.bold ?? false,
          italic: options.italic ?? false,
        },
        {
          format: axis.title.format,
          x: resolvedX,
          y: resolvedY,
          anchor: 'middle',
          align: 'center',
          rotation: options.rotation ?? (horizontal ? 0 : -90),
          ...axis.title.layout,
          sourcePath: `/axes/${axis.axisId}/title`,
        },
        resolvedFormat === 'plain'
          ? {}
          : {
              measureMath: (source, font) =>
                typesetMath(source, font.fontSizePt, `axis-${axis.axisId}`),
            },
      ),
      'axis-title',
    );
  }
  const labels = layoutAxisLabels(
    [{ text: axis.title.text, x, y, anchor: 'middle' }],
    {
      fontSizePt: axis.title.fontSizePt,
      rotation: options.rotation ?? (horizontal ? 0 : -90),
      ...options,
    },
    axis.dimension,
  );
  return renderAppearanceText(labels[0]!, axis.title, 'axis-title');
}
