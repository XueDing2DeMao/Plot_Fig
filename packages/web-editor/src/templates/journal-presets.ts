export type JournalPreset = {
  id: string;
  name: string;
  width: { value: number; unit: 'mm' | 'in' };
  fontSizePt: number;
  dpi: number;
  minFontPt: number;
  maxFontPt: number;
  sourceUrl: string;
  maxHeightMm?: number;
};
const nature =
  'https://research-figure-guide.nature.com/figures/preparing-figures-our-specifications/';
const ieee =
  'https://journals.ieeeauthorcenter.ieee.org/create-your-ieee-journal-article/create-graphics-for-your-article/resolution-and-size/';
export const journalPresets: JournalPreset[] = [
  {
    id: 'generic-single',
    name: '通用 · 单栏',
    width: { value: 89, unit: 'mm' },
    fontSizePt: 8,
    dpi: 600,
    minFontPt: 5,
    maxFontPt: 14,
    sourceUrl: '',
  },
  {
    id: 'generic-double',
    name: '通用 · 双栏',
    width: { value: 180, unit: 'mm' },
    fontSizePt: 8,
    dpi: 600,
    minFontPt: 5,
    maxFontPt: 14,
    sourceUrl: '',
  },
  {
    id: 'nature-single',
    name: 'Nature 最终图 · 单栏',
    width: { value: 89, unit: 'mm' },
    fontSizePt: 6.5,
    dpi: 600,
    minFontPt: 5,
    maxFontPt: 7,
    sourceUrl: nature,
    maxHeightMm: 170,
  },
  {
    id: 'nature-double',
    name: 'Nature 最终图 · 双栏',
    width: { value: 183, unit: 'mm' },
    fontSizePt: 6.5,
    dpi: 600,
    minFontPt: 5,
    maxFontPt: 7,
    sourceUrl: nature,
    maxHeightMm: 170,
  },
  {
    id: 'ieee-single',
    name: 'IEEE · 单栏',
    width: { value: 3.5, unit: 'in' },
    fontSizePt: 8,
    dpi: 1200,
    minFontPt: 5,
    maxFontPt: 14,
    sourceUrl: ieee,
  },
  {
    id: 'ieee-double',
    name: 'IEEE · 双栏',
    width: { value: 7.16, unit: 'in' },
    fontSizePt: 8,
    dpi: 1200,
    minFontPt: 5,
    maxFontPt: 14,
    sourceUrl: ieee,
  },
];
