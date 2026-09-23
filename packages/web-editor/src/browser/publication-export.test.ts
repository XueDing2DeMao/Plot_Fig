// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { preparePngDpi, pngWithDpi } from './publication-export.js';
it('converts physical dimensions to pixels without assuming viewBox unit', () => {
  const svg = '<svg width="89mm" height="65mm" viewBox="0 0 1000 730"/>';
  expect(preparePngDpi(svg, 600)).toMatchObject({ width: 2102, height: 1535 });
  expect(() => preparePngDpi(svg, 9600)).toThrow();
});
it('writes a PNG pHYs chunk with metre units and correct density', () => {
  const minimal = new Uint8Array([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82,
    ...new Array(17).fill(0),
    0,
    0,
    0,
    0,
    73,
    69,
    78,
    68,
    174,
    66,
    96,
    130,
  ]);
  const next = pngWithDpi(minimal, 600),
    view = new DataView(next.buffer);
  expect(new TextDecoder().decode(next.slice(37, 41))).toBe('pHYs');
  expect(view.getUint32(41)).toBe(23622);
  expect(next[49]).toBe(1);
  expect(() => pngWithDpi(new Uint8Array(10), 600)).toThrow();
});
