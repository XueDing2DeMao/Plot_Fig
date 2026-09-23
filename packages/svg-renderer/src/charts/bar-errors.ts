import type {
  ErrorBarStyle,
  ErrorDirectionDetails,
} from '@plot-fig/figure-schema';
import { escapeXml as esc, formatNumber as n } from '../geometry.js';
import { point, type ChartContext } from './chart-point.js';
export function renderBarError(
  context: ChartContext,
  options: { center: number; bounds: [number, number]; horizontal: boolean },
  style: ErrorBarStyle,
  advanced?: {
    details?: ErrorDirectionDetails;
    base?: number;
    followColor?: string;
  },
): string {
  const clip = context.dataClip,
    h = options.horizontal,
    lo = h ? clip?.xMin : clip?.yMin,
    hi = h ? clip?.xMax : clip?.yMax;
  if (
    clip &&
    (options.center < (h ? clip.yMin : clip.xMin) ||
      options.center > (h ? clip.yMax : clip.xMax) ||
      options.bounds[1] < lo! ||
      options.bounds[0] > hi!)
  )
    return '';
  const p = (value: number) =>
    options.horizontal
      ? point(context, value, options.center)
      : point(context, options.center, value);
  const a = p(options.bounds[0]),
    b = p(options.bounds[1]),
    cap = style.capWidthPt / 2;
  const details = advanced?.details;
  const color = details?.followColor
    ? (advanced?.followColor ?? style.color)
    : style.color;
  const patterns = {
    solid: '',
    dash: '6 3',
    dot: '1 3',
    'dash-dot': '6 3 1 3',
  };
  const dash = details ? patterns[details.dash ?? 'solid'] : '';
  const attrs = `stroke="${esc(color)}" stroke-width="${n(style.widthPt)}"${details ? ` stroke-opacity="${n(details.opacity ?? 1)}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}`;
  const line = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    role: string,
  ) =>
    `<line data-role="${role}" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" ${attrs} />`;
  let direction = details?.direction ?? 'both';
  const positive =
    (advanced?.base ?? (options.bounds[0] + options.bounds[1]) / 2) >=
    (details?.baseline ?? 0);
  if (direction === 'away-baseline')
    direction = positive ? 'positive' : 'negative';
  if (direction === 'toward-baseline')
    direction = positive ? 'negative' : 'positive';
  const caps = (
    direction === 'positive'
      ? [{ p: b, v: options.bounds[1] }]
      : direction === 'negative'
        ? [{ p: a, v: options.bounds[0] }]
        : [
            { p: a, v: options.bounds[0] },
            { p: b, v: options.bounds[1] },
          ]
  )
    .filter((e) => !clip || (e.v >= lo! && e.v <= hi!))
    .map((e) => e.p)
    .map((p) =>
      line(
        {
          x: p.x - (options.horizontal ? 0 : cap),
          y: p.y - (options.horizontal ? cap : 0),
        },
        {
          x: p.x + (options.horizontal ? 0 : cap),
          y: p.y + (options.horizontal ? cap : 0),
        },
        'error-cap',
      ),
    )
    .join('');
  return line(a, b, 'error-bar') + caps;
}
