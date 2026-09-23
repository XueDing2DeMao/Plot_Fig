import type { Panel } from '@plot-fig/figure-schema';
import { escapeXml, formatNumber as n, type Rect } from './geometry.js';
import { lineDash } from './plot-style.js';

function rect(role: string, box: Rect, style: string) {
  return `<rect data-role="${role}" x="${n(box.x)}" y="${n(box.y)}" width="${n(box.width)}" height="${n(box.height)}" ${style} />`;
}
export function renderLayerAppearance(panel: Panel, box: Rect) {
  const { background, border, shadow } = panel.appearance ?? {};
  const behind =
    (shadow?.visible
      ? rect(
          'layer-shadow',
          {
            ...box,
            x: box.x + shadow.offsetXPt,
            y: box.y + shadow.offsetYPt,
          },
          `fill="${escapeXml(shadow.color)}" fill-opacity="${n(shadow.opacity)}"`,
        )
      : '') +
    (background
      ? rect(
          'layer-background',
          box,
          `fill="${escapeXml(background.color)}" fill-opacity="${n(background.opacity)}"`,
        )
      : '');
  const ahead = border?.visible
    ? rect(
        'layer-border',
        box,
        `fill="none" stroke="${escapeXml(border.color)}" stroke-width="${n(border.widthPt)}"${lineDash(border.dash)}`,
      )
    : '';
  return { behind, ahead };
}
