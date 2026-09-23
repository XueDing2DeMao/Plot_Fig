import { describe, expect, it } from 'vitest';
import { academicPalettes } from './academic-palettes.js';

describe('academic palette snapshot', () => {
  it('contains all 260 academic records with unique source ids and valid HEX values', () => {
    expect(academicPalettes).toHaveLength(260);
    expect(new Set(academicPalettes.map((palette) => palette.id)).size).toBe(
      260,
    );
    for (const palette of academicPalettes) {
      expect(palette.name.length).toBeGreaterThan(0);
      expect(palette.tags.length).toBeGreaterThan(0);
      expect(palette.colors.length).toBeGreaterThanOrEqual(3);
      for (const color of palette.colors)
        expect(color).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('preserves source color order for Nature, Lancet and Origin', () => {
    expect(
      academicPalettes.find((p) => p.id === 'sci-nature-1')?.colors,
    ).toEqual([
      '#E64B35',
      '#4DBBD5',
      '#00A087',
      '#3C5488',
      '#F39B7F',
      '#8491B4',
    ]);
    expect(
      academicPalettes.find((p) => p.id === 'sci-lancet-1')?.colors,
    ).toEqual([
      '#00468B',
      '#ED0000',
      '#42B540',
      '#0099B4',
      '#925E9F',
      '#FDAF91',
    ]);
    expect(
      academicPalettes.find((p) => p.id === 'sci-origin-classic')?.colors,
    ).toEqual([
      '#000000',
      '#FF0000',
      '#0000FF',
      '#008000',
      '#800080',
      '#FF8000',
    ]);
  });
});
