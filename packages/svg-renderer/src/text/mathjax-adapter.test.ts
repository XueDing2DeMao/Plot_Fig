// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { typesetMath } from './mathjax-adapter.js';

it('typesets TeX to a self-contained measured SVG atom', () => {
  const result = typesetMath(String.raw`\frac{a}{b}+\sqrt{x}`, 12, 'formula-a');
  expect(result.advanceWidth).toBeGreaterThan(0);
  expect(result.ascent).toBeGreaterThan(0);
  expect(result.descent).toBeGreaterThan(0);
  expect(result.svg).toContain('<svg');
  expect(result.svg).toContain('<path');
  expect(result.svg).toContain('formula-a-');
  expect(result.svg).not.toMatch(/(?:src|href)="https?:\/\//);
  expect(result.svg).toMatch(/<rect[^>]+width=/);
  const document = new DOMParser().parseFromString(
    result.svg!,
    'image/svg+xml',
  );
  expect(document.querySelector('parsererror')).toBeNull();
  for (const use of document.querySelectorAll('use')) {
    const reference =
      use.getAttribute('href') ?? use.getAttribute('xlink:href');
    expect(reference).toMatch(/^#formula-a-/);
    expect(document.querySelector(reference!)).not.toBeNull();
  }
});

it('uses unique local identifiers and rejects malformed TeX', () => {
  const first = typesetMath('x^2', 10, 'one').svg!;
  const second = typesetMath('x^2', 10, 'two').svg!;
  expect(first).toContain('id="one-');
  expect(second).toContain('id="two-');
  expect(() => typesetMath(String.raw`\frac{`, 10, 'bad')).toThrow();
});

it.each(['CO_2', 'CO_{2}', 'x_i^2', 'A_{i}^{2}', String.raw`\frac{x_i}{2}`])(
  'keeps valid geometry for subscript formula %s',
  (source) => {
    const result = typesetMath(source, 12, `script-${source}`);
    expect(result.advanceWidth).toBeGreaterThan(0);
    expect(result.ascent).toBeGreaterThan(0);
    expect(result.descent).toBeGreaterThanOrEqual(0);
    const document = new DOMParser().parseFromString(
      result.svg!,
      'image/svg+xml',
    );
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelectorAll('use').length).toBeGreaterThan(1);
  },
);
