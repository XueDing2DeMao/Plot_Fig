import { expect, it } from 'vitest';
import { layoutText } from './layout.js';
import type { TextMeasure } from './types.js';

const measure: TextMeasure = (text, font) => ({
  advanceWidth: Array.from(text).length * font.fontSizePt,
  ascent: font.fontSizePt * 0.8,
  descent: font.fontSizePt * 0.2,
});
const font = { fontSizePt: 10, fontFamily: 'test', color: '#222' };

it('computes content, padding, stroke and rotation from one measured box', () => {
  const result = layoutText(
    'AB\nC',
    font,
    {
      paddingPt: { top: 1, right: 2, bottom: 3, left: 4 },
      border: { widthPt: 2, color: '#123' },
    },
    { measure },
  );
  expect(result.contentBounds).toMatchObject({ width: 20, height: 22 });
  expect(result.boxBounds).toMatchObject({ width: 26, height: 26 });
  expect(result.bounds).toMatchObject({ width: 28, height: 28 });
  const rotated = layoutText('AB', font, { rotation: 90 }, { measure });
  expect(rotated.bounds.width).toBeCloseTo(10);
  expect(rotated.bounds.height).toBeCloseTo(20);
});

it('keeps alignment within the content box independent of its anchor', () => {
  const result = layoutText(
    'AB\nC',
    font,
    {
      x: 100,
      y: 20,
      anchor: 'end',
      align: 'center',
      wrapWidthPt: 40,
    },
    { measure },
  );
  expect(result.contentBounds.x).toBe(60);
  expect(result.lines.map((line) => line.x)).toEqual([70, 75]);
  expect(result.lines.map((line) => line.y)).toEqual([20, 32]);
});

it('expands baselines for script ink and tall math instead of overlapping', () => {
  const scripts = layoutText(
    'x^{2}\nx_{2}',
    font,
    { format: 'rich', lineHeight: 0.5 },
    { measure },
  );
  expect(scripts.lines[0]!.ascent).toBeCloseTo(9.6);
  expect(scripts.lines[1]!.descent).toBeCloseTo(3.4);
  expect(scripts.lines[1]!.y - scripts.lines[0]!.y).toBeGreaterThanOrEqual(10);
  const formula = layoutText(
    'A\\(frac\\)\nB',
    font,
    { format: 'rich' },
    {
      measure,
      measureMath: () => ({ advanceWidth: 30, ascent: 20, descent: 10 }),
    },
  );
  expect(formula.lines[1]!.y - formula.lines[0]!.y).toBe(18);
  expect(() => layoutText('x', font, { format: 'latex' }, { measure })).toThrow(
    /公式.*准备/,
  );
});

it('wraps at word boundaries and never splits a grapheme', () => {
  const result = layoutText('ab cd', font, { wrapWidthPt: 40 }, { measure });
  expect(result.lines.map((line) => line.text)).toEqual(['ab ', 'cd']);
  const clusters = layoutText(
    'e\u0301👨‍👩‍👧‍👦中',
    font,
    { wrapWidthPt: 1 },
    { measure },
  );
  expect(clusters.lines.map((line) => line.text)).toEqual([
    'e\u0301',
    '👨‍👩‍👧‍👦',
    '中',
  ]);
  expect(clusters.diagnostics).toHaveLength(3);
});

it('keeps blank lines and rejects invalid geometry and measurement results', () => {
  expect(
    layoutText('A\r\n\rB\n', font, {}, { measure }).lines.map(
      (line) => line.text,
    ),
  ).toEqual(['A', '', 'B', '']);
  for (const options of [
    { wrapWidthPt: 0 },
    { x: Infinity },
    { rotation: NaN },
    { paddingPt: { top: -1, right: 0, bottom: 0, left: 0 } },
  ])
    expect(() => layoutText('A', font, options, { measure })).toThrow();
  expect(() =>
    layoutText(
      'A',
      font,
      {},
      { measure: () => ({ advanceWidth: NaN, ascent: 8, descent: 2 }) },
    ),
  ).toThrow(/测量/);
  expect(() => layoutText('\n'.repeat(256), font, {}, { measure })).toThrow(
    /行数/,
  );
});

it('preserves legacy numeric wrapping through the shared character mode', () => {
  const result = layoutText(
    '-800.0e-3 V',
    font,
    { format: 'plain', wrapMode: 'character', wrapWidthPt: 60 },
    { measure },
  );
  expect(result.lines.map((line) => line.text)).toEqual(['-800.0', 'e-3 V']);
});
