import { expect, it } from 'vitest';
import { validateSvg, validateRequest } from './security.js';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="89mm" height="65mm" viewBox="0 0 250 180"><text x="1" y="10" font-family="Arial">Unicode α中文</text></svg>';
const gradient =
  '<defs><linearGradient id="color-1" x1="0" x2="0" y1="1" y2="0"><stop offset="0" stop-color="#440154"/><stop offset="1" stop-color="#fde725"/></linearGradient></defs><rect width="10" height="100" fill="url(#color-1)"/>';
it('accepts the renderer colorbar gradient for PDF and opaque EPS', () => {
  for (const format of ['pdf', 'eps'])
    expect(
      validateRequest({
        svg: svg.replace('</svg>', gradient + '</svg>'),
        format,
        dpi: 300,
        textToPath: false,
        flattenTransparency: false,
      }).format,
    ).toBe(format);
});
it.each([
  gradient.replace('url(#color-1)', 'url(https://evil/color)'),
  gradient.replace('url(#color-1)', 'url(file:///secret)'),
  gradient.replace('url(#color-1)', 'url(#missing)'),
  gradient.replace('<linearGradient ', '<linearGradient href="https://evil/" '),
  gradient.replace('#440154', 'url(https://evil/)'),
  gradient.replace('#440154', 'color-mix(in srgb, red, transparent)'),
])('rejects external or unresolved colorbar paints', (content) => {
  expect(() =>
    validateSvg(svg.replace('</svg>', content + '</svg>')),
  ).toThrow();
});
it.each([
  'stop-opacity="0.5" stop-color="#440154"',
  'stop-color="#44015480"',
  'stop-color="rgba(10,20,30,0.5)"',
  'stop-opacity="50%" stop-color="#440154"',
  'stop-color="#f008"',
  'stop-color="rgb(255 0 0 / 50%)"',
  'stop-color="transparent"',
])('detects gradient transparency for EPS: %s', (stop) => {
  const input = svg.replace(
    '</svg>',
    gradient.replace('stop-color="#440154"', stop) + '</svg>',
  );
  expect(validateSvg(input).transparent).toBe(true);
  expect(() =>
    validateRequest({
      svg: input,
      format: 'eps',
      dpi: 300,
      textToPath: false,
      flattenTransparency: false,
    }),
  ).toThrow(/透明/);
});
it('accepts self-contained SVG and controlled export options', () => {
  expect(validateSvg(svg).transparent).toBe(false);
  expect(
    validateRequest({
      svg,
      format: 'pdf',
      dpi: 600,
      textToPath: false,
      flattenTransparency: false,
    }).format,
  ).toBe('pdf');
});
it.each([
  '<script>alert(1)</script>',
  '<image href="https://evil/secret"/>',
  '<use href="file:///etc/passwd"/>',
  '<rect style="fill:url(https://evil)"/>',
  '<foreignObject/>',
  '<text onclick="x()"/>',
  '<style>@import "https://evil";</style>',
])('rejects active content and external resources: %s', (part) => {
  expect(() => validateSvg(svg.replace('</svg>', part + '</svg>'))).toThrow();
});
it('rejects entities, invalid dimensions and uncontrolled formats', () => {
  expect(() =>
    validateSvg(
      '<!DOCTYPE svg [<!ENTITY e SYSTEM "file:///etc/passwd">]>' + svg,
    ),
  ).toThrow();
  expect(() => validateSvg(svg.replace('250 180', '0 180'))).toThrow();
  expect(() => validateSvg(svg.replace('89mm', '999999mm'))).toThrow();
  expect(() => validateRequest({ svg, format: '../../secret' })).toThrow();
});
it('requires explicit flattening when EPS contains transparency', () => {
  const input = {
    svg: svg.replace('<text', '<text opacity="0.5"'),
    format: 'eps',
    dpi: 600,
    textToPath: false,
    flattenTransparency: false,
  };
  expect(() => validateRequest(input)).toThrow(/透明/);
  expect(
    validateRequest({ ...input, flattenTransparency: true })
      .flattenTransparency,
  ).toBe(true);
});
