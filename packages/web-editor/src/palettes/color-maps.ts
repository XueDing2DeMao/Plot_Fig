import { academicPalettes } from './academic-palettes.js';

// 默认色阶保持与已有热图一致，其余预设复用项目中的配色快照。
export const defaultHeatmapColors = [
  '#440154',
  '#3b528b',
  '#21918c',
  '#5ec962',
  '#fde725',
] as const;
const presets = [
  ['plasma', 'Plasma（紫红黄）', 'sci-heatmap-plasma'],
  ['inferno', 'Inferno（黑红黄）', 'sci-heatmap-inferno'],
  ['magma', 'Magma（黑紫白）', 'sci-heatmap-magma'],
  ['coolwarm', 'Coolwarm（蓝白红）', 'sci-3-coolwarm'],
  ['blues', 'Blues（浅蓝到深蓝）', 'sci-sequential-blues'],
  ['ylgnbu', 'YlGnBu（黄绿蓝）', 'sci-heatmap-ylgnbu'],
  ['spectral', 'Spectral（光谱发散）', 'sci-diverging-spectral'],
] as const;
export const colorMaps = [
  {
    id: 'viridis',
    name: 'Viridis（紫绿黄）',
    colors: [...defaultHeatmapColors],
  },
  ...presets.map(([id, name, sourceId]) => ({
    id,
    name,
    colors: academicPalettes
      .find((palette) => palette.id === sourceId)!
      .colors.map((color) => color.toLowerCase()),
  })),
  {
    id: 'grayscale',
    name: 'Grayscale（黑白灰度）',
    colors: ['#000000', '#ffffff'],
  },
];
