import { colorbarGeometry } from '../layout-geometry.js';
import type { ColorScale } from '@plot-fig/figure-schema';
import { extent, finite } from './statistics.js';
import { escapeXml as esc, formatNumber as n, type Rect } from '../geometry.js';

function ratioFor(
  value: number,
  min: number,
  max: number,
  transform: 'linear' | 'log10' = 'linear',
) {
  if (transform === 'log10') {
    if (value <= 0 || min <= 0 || max <= 0)
      throw new Error('对数颜色映射要求所有映射值与范围大于零');
    value = Math.log10(value);
    min = Math.log10(min);
    max = Math.log10(max);
  }
  if (min === max) return 0.5;
  if (value <= min) return 0;
  if (value >= max) return 1;
  const span = max - min;
  return finite(span)
    ? (value - min) / span
    : (value / 2 - min / 2) / (max / 2 - min / 2);
}

export function makeColorScale(
  config: ColorScale,
  values: Array<number | null>,
) {
  const valid = values
    .filter(finite)
    .filter((value) => config.transform !== 'log10' || value > 0);
  const [low, high] = extent(valid);
  const min = config.range.mode === 'fixed' ? config.range.min : low,
    max = config.range.mode === 'fixed' ? config.range.max : high;
  if (!finite(min) || !finite(max)) throw new Error('颜色范围没有有限数值');
  const colors = config.reverse ? [...config.colors].reverse() : config.colors;
  const color = (value: number) => {
    const ratio = ratioFor(value, min, max, config.transform);
    if (config.interpolation === 'discrete')
      return colors[
        Math.min(colors.length - 1, Math.floor(ratio * colors.length))
      ]!;
    const position = ratio * (colors.length - 1),
      i = Math.min(colors.length - 2, Math.floor(position)),
      t = position - i;
    const channel = (hex: string, k: number) =>
      parseInt(hex.slice(1 + k * 2, 3 + k * 2), 16);
    return (
      '#' +
      [0, 1, 2]
        .map((k) =>
          Math.round(
            channel(colors[i]!, k) * (1 - t) + channel(colors[i + 1]!, k) * t,
          )
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  };
  return { min, max, color };
}
export function renderColorbar(
  config: ColorScale,
  values: Array<number | null>,
  layout: {
    rect: Rect;
    index: number;
    id: string;
    offset?: number | undefined;
    availableHeight?: number | undefined;
  },
) {
  if (!config.colorbar.visible) return '';
  const scaleConfig: ColorScale =
      config.colorbar.mode === 'independent' && config.colorbar.range
        ? { ...config, range: { mode: 'fixed', ...config.colorbar.range } }
        : config,
    scale = makeColorScale(scaleConfig, values),
    { rect, index, id } = layout,
    orientation = config.colorbar.orientation ?? 'vertical',
    side =
      config.colorbar.side ?? (orientation === 'vertical' ? 'right' : 'bottom'),
    vertical = orientation === 'vertical';
  const defaultGeometry = colorbarGeometry(rect, index, layout.availableHeight),
    length = config.colorbar.length ?? 1,
    width = config.colorbar.widthPt ?? 10,
    offset = layout.offset ?? index * (vertical ? width + 50 : width + 58),
    height = vertical ? defaultGeometry.height * length : width,
    barWidth = vertical ? width : rect.width * length,
    x = vertical
      ? side === 'left'
        ? rect.x - 18 - width - offset
        : rect.x + rect.width + 18 + offset
      : rect.x + (rect.width - barWidth) / 2,
    y = vertical
      ? defaultGeometry.y + (defaultGeometry.height - height) / 2
      : side === 'top'
        ? rect.y - height - 48 - offset
        : rect.y + rect.height + 48 + offset;
  const fontSize =
    8 *
    (layout.availableHeight === undefined
      ? 1
      : Math.min(1, layout.availableHeight / 60));
  const stops =
    config.interpolation === 'discrete'
      ? (config.reverse ? [...config.colors].reverse() : config.colors)
          .map(
            (color, index, colors) =>
              `<stop offset="${index / colors.length}" stop-color="${color}" /><stop offset="${(index + 1) / colors.length}" stop-color="${color}" />`,
          )
          .join('')
      : Array.from(
          { length: 33 },
          (_, i) =>
            `<stop offset="${i / 32}" stop-color="${scale.color(scale.min * (1 - i / 32) + scale.max * (i / 32))}" />`,
        ).join('');
  const tickCount = config.colorbar.majorTicks ?? 3,
    tickValues =
      scale.min === scale.max
        ? [scale.min]
        : Array.from({ length: tickCount }, (_, i) =>
            config.transform === 'log10'
              ? 10 **
                (Math.log10(scale.min) * (1 - i / (tickCount - 1)) +
                  Math.log10(scale.max) * (i / (tickCount - 1)))
              : scale.min * (1 - i / (tickCount - 1)) +
                scale.max * (i / (tickCount - 1)),
          ),
    major = tickValues
      .map((value) => {
        const ratio = ratioFor(value, scale.min, scale.max, config.transform),
          precision = config.colorbar.precision ?? 6,
          notation = config.colorbar.notation ?? 'auto',
          label =
            notation === 'scientific'
              ? value.toExponential(precision)
              : notation === 'fixed'
                ? value.toFixed(precision)
                : n(value);
        if (vertical) {
          const yy = y + (1 - ratio) * height,
            direction = side === 'left' ? -1 : 1,
            tickX = side === 'left' ? x : x + width,
            textX = tickX + direction * 5;
          return `<line data-role="colorbar-major-tick" x1="${n(tickX)}" y1="${n(yy)}" x2="${n(tickX + direction * 3)}" y2="${n(yy)}" stroke="currentColor"/><text x="${n(textX)}" y="${n(yy)}" text-anchor="${side === 'left' ? 'end' : 'start'}" dominant-baseline="middle" font-size="${n(fontSize)}">${label}</text>`;
        }
        const xx = x + ratio * barWidth,
          direction = side === 'top' ? -1 : 1,
          tickY = side === 'top' ? y : y + height,
          textY = tickY + direction * (fontSize + 2);
        return `<line data-role="colorbar-major-tick" x1="${n(xx)}" y1="${n(tickY)}" x2="${n(xx)}" y2="${n(tickY + direction * 3)}" stroke="currentColor"/><text x="${n(xx)}" y="${n(textY)}" text-anchor="middle" font-size="${n(fontSize)}">${label}</text>`;
      })
      .join('');
  const minorCount = config.colorbar.minorTicks ?? 0,
    minor =
      minorCount > 0 && tickValues.length > 1
        ? tickValues
            .slice(0, -1)
            .flatMap((from, index) => {
              const to = tickValues[index + 1]!;
              return Array.from({ length: minorCount }, (_, minorIndex) => {
                const t = (minorIndex + 1) / (minorCount + 1),
                  value =
                    config.transform === 'log10'
                      ? 10 ** (Math.log10(from) * (1 - t) + Math.log10(to) * t)
                      : from * (1 - t) + to * t,
                  ratio = ratioFor(
                    value,
                    scale.min,
                    scale.max,
                    config.transform,
                  );
                if (vertical) {
                  const yy = y + (1 - ratio) * height,
                    direction = side === 'left' ? -1 : 1,
                    tickX = side === 'left' ? x : x + width;
                  return `<line data-role="colorbar-minor-tick" x1="${n(tickX)}" y1="${n(yy)}" x2="${n(tickX + direction * 2)}" y2="${n(yy)}" stroke="currentColor"/>`;
                }
                const xx = x + ratio * barWidth,
                  direction = side === 'top' ? -1 : 1,
                  tickY = side === 'top' ? y : y + height;
                return `<line data-role="colorbar-minor-tick" x1="${n(xx)}" y1="${n(tickY)}" x2="${n(xx)}" y2="${n(tickY + direction * 2)}" stroke="currentColor"/>`;
              });
            })
            .join('')
        : '';
  const gradient = vertical
    ? `x1="0" x2="0" y1="1" y2="0"`
    : `x1="0" x2="1" y1="0" y2="0"`;
  const endpoint = config.colorbar.endpoints;
  const triangles =
    endpoint === 'triangles' || endpoint === 'both'
      ? vertical
        ? `<path data-role="colorbar-endpoint" d="M${n(x)} ${n(y)} L${n(x + width)} ${n(y)} L${n(x + width / 2)} ${n(y - width / 2)} Z" fill="${scale.color(scale.max)}"/><path data-role="colorbar-endpoint" d="M${n(x)} ${n(y + height)} L${n(x + width)} ${n(y + height)} L${n(x + width / 2)} ${n(y + height + width / 2)} Z" fill="${scale.color(scale.min)}"/>`
        : `<path data-role="colorbar-endpoint" d="M${n(x)} ${n(y)} L${n(x)} ${n(y + height)} L${n(x - height / 2)} ${n(y + height / 2)} Z" fill="${scale.color(scale.min)}"/><path data-role="colorbar-endpoint" d="M${n(x + barWidth)} ${n(y)} L${n(x + barWidth)} ${n(y + height)} L${n(x + barWidth + height / 2)} ${n(y + height / 2)} Z" fill="${scale.color(scale.max)}"/>`
      : '';
  const endpointCaps =
    endpoint === 'both'
      ? vertical
        ? `<line data-role="colorbar-endpoint-cap" x1="${n(x)}" y1="${n(y)}" x2="${n(x + width)}" y2="${n(y)}" stroke="currentColor"/><line data-role="colorbar-endpoint-cap" x1="${n(x)}" y1="${n(y + height)}" x2="${n(x + width)}" y2="${n(y + height)}" stroke="currentColor"/>`
        : `<line data-role="colorbar-endpoint-cap" x1="${n(x)}" y1="${n(y)}" x2="${n(x)}" y2="${n(y + height)}" stroke="currentColor"/><line data-role="colorbar-endpoint-cap" x1="${n(x + barWidth)}" y1="${n(y)}" x2="${n(x + barWidth)}" y2="${n(y + height)}" stroke="currentColor"/>`
      : '';
  return `<g data-role="colorbar" data-orientation="${orientation}" data-side="${side}" data-mode="${config.colorbar.mode ?? 'linked'}"><defs><linearGradient id="${esc(id)}" ${gradient}>${stops}</linearGradient></defs><text x="${n(x)}" y="${n(y - fontSize)}" font-size="${n(fontSize)}">${esc(config.colorbar.title)}</text><rect x="${n(x)}" y="${n(y)}" width="${n(barWidth)}" height="${n(height)}" fill="url(#${esc(id)})" />${triangles}${endpointCaps}${major}${minor}</g>`;
}
