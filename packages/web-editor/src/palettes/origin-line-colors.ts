import { academicPalettes } from './academic-palettes.js';
import { colorMaps } from './color-maps.js';

// 根据参考图整理的常用色列；不依赖操作系统颜色对话框。
export const originLineColors = [
  '#515151',
  '#ed3b3b',
  '#2070d4',
  '#32a872',
  '#ad76d5',
  '#c7a000',
  '#00bdc6',
  '#805555',
  '#929600',
  '#ff7100',
  '#649ac8',
  '#70ba00',
];

export const lineColorLists = [
  { id: 'color4line', name: 'Color4Line', colors: originLineColors },
  ...colorMaps,
  ...academicPalettes.filter((palette) => palette.tags.includes('Origin')),
  ...academicPalettes.filter((palette) => !palette.tags.includes('Origin')),
].map((list) => ({
  ...list,
  continuous:
    colorMaps.some((map) => map.id === list.id) ||
    ('tags' in list &&
      list.tags.some((tag) => tag === '渐变' || tag === '连续')),
}));
export const lineColorMaps = colorMaps;

export function sampleLineColor(
  colors: readonly string[],
  fraction: number,
): string {
  if (colors.length === 1) return colors[0]!;
  const position = Math.max(0, Math.min(1, fraction)) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(position));
  const local = position - index;
  return (
    '#' +
    [1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(colors[index]!.slice(offset, offset + 2), 16) * (1 - local) +
            parseInt(colors[index + 1]!.slice(offset, offset + 2), 16) * local,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

export function colorShades(colors: readonly string[]): string[][] {
  return [0.72, 0.45, 0.18, -0.22, -0.45].map((amount) =>
    colors.map((color) => {
      const channels = [1, 3, 5].map((offset) =>
        parseInt(color.slice(offset, offset + 2), 16),
      );
      return (
        '#' +
        channels
          .map((channel) =>
            Math.round(
              amount > 0
                ? channel + (255 - channel) * amount
                : channel * (1 + amount),
            )
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')
      );
    }),
  );
}
