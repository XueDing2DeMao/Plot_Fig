import { expect, it } from 'vitest';
import { lineDash } from './plot-style.js';
import {
  lineAppearanceAttributes,
  parseCustomDash,
  type LineAppearance,
} from './line-appearance.js';

it.each(['solid', 'dashed', 'dotted', 'dash-dot'] as const)(
  'keeps the existing %s preset byte-identical when no advanced settings exist',
  (dash) => expect(lineAppearanceAttributes({ dash })).toBe(lineDash(dash)),
);
it('writes independent cap, join, miter limit and stroke opacity', () => {
  const attrs = lineAppearanceAttributes({
    dash: 'solid',
    cap: 'round',
    join: 'bevel',
    miterLimit: 3,
    opacity: 0.25,
  });
  expect(attrs).toContain(' stroke-linecap="round"');
  expect(attrs).toContain(' stroke-linejoin="bevel"');
  expect(attrs).toContain(' stroke-miterlimit="3"');
  expect(attrs).toContain(' stroke-opacity="0.25"');
  expect(attrs).not.toMatch(/(?:^| )opacity=/);
  expect(attrs).not.toContain('fill-opacity');
});
it('overrides a preset with a custom point-unit pattern and accepts negative offset', () => {
  expect(
    lineAppearanceAttributes({
      dash: 'dotted',
      customDash: { lengthsPt: [8, 3, 1, 3], offsetPt: -0.25 },
    }),
  ).toBe(' stroke-dasharray="8 3 1 3" stroke-dashoffset="-0.25"');
});
it('supports fully transparent and opaque strokes without rounding transparency away', () => {
  expect(lineAppearanceAttributes({ dash: 'solid', opacity: 0 })).toContain(
    'stroke-opacity="0"',
  );
  expect(lineAppearanceAttributes({ dash: 'solid', opacity: 1 })).toContain(
    'stroke-opacity="1"',
  );
});
it.each([
  { opacity: -0.1 },
  { opacity: 1.1 },
  { opacity: NaN },
  { cap: 'round" onload="alert(1)' },
  { join: 'arcs' },
  { miterLimit: 0 },
  { miterLimit: 101 },
  { miterLimit: Infinity },
  { customDash: { lengthsPt: [] } },
  { customDash: { lengthsPt: [2] } },
  { customDash: { lengthsPt: [2, 3, 4] } },
  { customDash: { lengthsPt: [0, 2] } },
  { customDash: { lengthsPt: [-1, 2] } },
  { customDash: { lengthsPt: [1e-9, 2] } },
  { customDash: { lengthsPt: [1001, 2] } },
  { customDash: { lengthsPt: [Infinity, 2] } },
  { customDash: { lengthsPt: Array(18).fill(1) } },
  { customDash: { lengthsPt: [1, 2], offsetPt: 10001 } },
  { customDash: { lengthsPt: [1, 2], offsetPt: NaN } },
] as const)('rejects an invalid advanced setting %j', (patch) => {
  expect(() =>
    lineAppearanceAttributes({ dash: 'solid', ...patch } as LineAppearance),
  ).toThrow();
});
it('retains caller arrays and accepts the documented pattern boundaries', () => {
  const lengthsPt = Array.from({ length: 16 }, (_, i) => (i % 2 ? 1000 : 0.1));
  const original = [...lengthsPt];
  expect(
    lineAppearanceAttributes({
      dash: 'solid',
      customDash: { lengthsPt, offsetPt: -10000 },
      miterLimit: 100,
    }),
  ).toContain('stroke-dasharray');
  expect(lengthsPt).toEqual(original);
});
it('parses decimal and scientific notation without losing partially typed input', () => {
  expect(parseCustomDash(' 8, 2.5，1e-1 3 ')).toEqual([8, 2.5, 0.1, 3]);
  expect(parseCustomDash('')).toBeUndefined();
  for (const value of [
    '1e-',
    '8,',
    '8,,3',
    '8， ，3',
    '8 3 2',
    '-1,2',
    '0x10,2',
    'Infinity,2',
  ])
    expect(() => parseCustomDash(value)).toThrow();
});
