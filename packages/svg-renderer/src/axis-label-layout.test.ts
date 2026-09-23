import { expect, it } from 'vitest';
import {
  layoutAxisLabels,
  type AxisLabelPlacement,
} from './axis-label-layout.js';

const label = (
  text: string,
  x = 0,
  y = 0,
  anchor: AxisLabelPlacement['anchor'] = 'middle',
) => ({ text, x, y, anchor });

it('keeps default single-line coordinates, text and visibility intact', () => {
  const result = layoutAxisLabels(
    [label('123', 20, 30)],
    { fontSizePt: 10 },
    'x',
  )[0]!;
  expect(result).toMatchObject({
    x: 20,
    y: 30,
    rotation: 0,
    visible: true,
    lines: [{ text: '123', x: 20, y: 30 }],
  });
  expect(result.bounds).toEqual({ x: 11, y: 22, width: 18, height: 10 });
});

it('keeps overlaps by default and ignores empty labels in the hide pass', () => {
  const labels = [
    label('AAAA', 0),
    label('', 10),
    label('BBBB', 12),
    label('CCCC', 30),
  ];
  expect(
    layoutAxisLabels(labels, { fontSizePt: 10 }, 'x').map((v) => v.visible),
  ).toEqual([true, false, true, true]);
  expect(
    layoutAxisLabels(labels, { fontSizePt: 10, overlap: 'hide' }, 'x').map(
      (v) => v.visible,
    ),
  ).toEqual([true, false, false, true]);
});

it('chooses labels by increasing screen position while preserving the input order', () => {
  const result = layoutAxisLabels(
    [label('CCCC', 30), label('BBBB', 12), label('AAAA', 0)],
    { fontSizePt: 10, overlap: 'hide' },
    'x',
  );
  expect(result.map((v) => v.visible)).toEqual([true, false, true]);
  expect(result.map((v) => v.text)).toEqual(['CCCC', 'BBBB', 'AAAA']);
});

it('greedily hides vertical screen overlaps and uses input index to break ties', () => {
  const result = layoutAxisLabels(
    [label('A', 0, 20), label('B', 0, 0), label('C', 0, 5), label('D', 0, 20)],
    { fontSizePt: 10, overlap: 'hide' },
    'y',
  );
  expect(result.map((v) => v.visible)).toEqual([true, true, false, false]);
});

it('places explicit newlines on separate baselines without requiring wrap width', () => {
  const result = layoutAxisLabels(
    [label('one\r\ntwo\n', 10, 20)],
    { fontSizePt: 10 },
    'x',
  )[0]!;
  expect(result.lines).toEqual([
    { text: 'one', x: 10, y: 20 },
    { text: 'two', x: 10, y: 32 },
    { text: '', x: 10, y: 44 },
  ]);
  expect(result.bounds).toEqual({ x: 1, y: 12, width: 18, height: 34 });
});

it('wraps codepoints without splitting surrogate pairs and always makes progress at tiny widths', () => {
  const result = layoutAxisLabels(
    [label('A😀BC')],
    { fontSizePt: 10, wrapWidthPt: 12 },
    'x',
  )[0]!;
  expect(result.lines.map((line) => line.text)).toEqual(['A', '😀', 'BC']);
  expect(
    layoutAxisLabels(
      [label('汉字')],
      { fontSizePt: 10, wrapWidthPt: 1 },
      'x',
    )[0]!.lines.map((line) => line.text),
  ).toEqual(['汉', '字']);
});

it('applies screen x/y offsets before rotating the estimated font box around the baseline origin', () => {
  const result = layoutAxisLabels(
    [label('AB', 10, 20, 'start')],
    { fontSizePt: 10, offsetPt: { x: 3, y: -4 }, rotation: 90 },
    'x',
  )[0]!;
  expect(result.lines).toEqual([{ text: 'AB', x: 13, y: 16 }]);
  expect(result.bounds.x).toBeCloseTo(11);
  expect(result.bounds.y).toBeCloseTo(16);
  expect(result.bounds.width).toBeCloseTo(10);
  expect(result.bounds.height).toBeCloseTo(12);
  expect(result.unrotatedBounds).toEqual({
    x: 13,
    y: 8,
    width: 12,
    height: 10,
  });
});

it('uses an explicit line-height multiplier and exposes the unrotated white-background box', () => {
  const result = layoutAxisLabels(
    [label('AB\nC', 10, 20, 'end')],
    { fontSizePt: 10, lineHeight: 2, background: 'white' },
    'x',
  )[0]!;
  expect(result.lines.map((line) => line.y)).toEqual([20, 40]);
  expect(result.unrotatedBounds).toEqual({
    x: -2,
    y: 12,
    width: 12,
    height: 30,
  });
  expect(result.background).toBe('white');
  for (const lineHeight of [0, 0.49, 5.01, NaN])
    expect(() =>
      layoutAxisLabels([label('AB')], { fontSizePt: 10, lineHeight }, 'x'),
    ).toThrow(/标签/);
});

it('uses rotation and font emphasis in collision estimates without changing source text', () => {
  const labels = [label('AAAA', 0), label('BBBB', 15)];
  expect(
    layoutAxisLabels(labels, { fontSizePt: 10, overlap: 'hide' }, 'x').map(
      (v) => v.visible,
    ),
  ).toEqual([true, false]);
  expect(
    layoutAxisLabels(
      labels,
      { fontSizePt: 10, rotation: 90, overlap: 'hide' },
      'x',
    ).map((v) => v.visible),
  ).toEqual([true, true]);
  const plain = layoutAxisLabels(labels, { fontSizePt: 10 }, 'x')[0]!;
  const emphasized = layoutAxisLabels(
    labels,
    { fontSizePt: 10, bold: true, italic: true },
    'x',
  )[0]!;
  expect(emphasized.bounds.width).toBeGreaterThan(plain.bounds.width);
  expect(emphasized).toMatchObject({ text: 'AAAA', bold: true, italic: true });
});

it('allows touching bounds and hides repeated positions deterministically', () => {
  const result = layoutAxisLabels(
    [label('A', 0), label('A', 6), label('B', 6)],
    { fontSizePt: 10, overlap: 'hide' },
    'x',
  );
  expect(result.map((v) => v.visible)).toEqual([true, true, false]);
});

it('handles ten thousand labels without comparing every pair', () => {
  const labels = Array.from({ length: 10000 }, (_, index) =>
    label('A', index * 6),
  );
  const result = layoutAxisLabels(
    labels,
    { fontSizePt: 10, overlap: 'hide' },
    'x',
  );
  expect(result.filter((v) => v.visible)).toHaveLength(10000);
});

it.each([
  { rotation: 181 },
  { rotation: -181 },
  { rotation: NaN },
  { wrapWidthPt: 0 },
  { offsetPt: { x: Infinity, y: 0 } },
])('rejects invalid geometry options %j', (options) => {
  expect(() =>
    layoutAxisLabels([label('A')], { fontSizePt: 10, ...options }, 'x'),
  ).toThrow(/标签/);
});
