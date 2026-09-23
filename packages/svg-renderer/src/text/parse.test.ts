import { expect, it } from 'vitest';
import { parseText } from './parse.js';

it('keeps plain syntax literal and normalizes explicit line endings', () => {
  expect(parseText('sample_1 x^2 $x$\r\nB\r', 'plain')).toEqual([
    { kind: 'text', text: 'sample_1 x^2 $x$', script: 'normal' },
    { kind: 'break' },
    { kind: 'text', text: 'B', script: 'normal' },
    { kind: 'break' },
  ]);
});

it('auto-detects unambiguous rich text and LaTeX while keeping bare underscores and carets literal', () => {
  expect(parseText('sample_1 A^B CO_{2} $x_i^2$')).toEqual([
    { kind: 'text', text: 'sample_1 A^B CO', script: 'normal' },
    { kind: 'text', text: '2', script: 'sub' },
    { kind: 'text', text: ' ', script: 'normal' },
    { kind: 'math', text: 'x_i^2' },
  ]);
  expect(parseText(String.raw`\frac{x_i}{2}`)).toEqual([
    { kind: 'math', text: String.raw`\frac{x_i}{2}` },
  ]);
  expect(parseText('x_i^2')).toEqual([
    { kind: 'text', text: 'x_i^2', script: 'normal' },
  ]);
  expect(parseText('CO_{2}', 'plain')).toEqual([
    { kind: 'text', text: 'CO_{2}', script: 'normal' },
  ]);
});

it('parses explicit scripts, escaped syntax and inline math without interpreting math newlines', () => {
  expect(
    parseText(String.raw`CO_{2} x^{2} \^ \(\frac{a}{b}\\c\)`, 'rich'),
  ).toEqual([
    { kind: 'text', text: 'CO', script: 'normal' },
    { kind: 'text', text: '2', script: 'sub' },
    { kind: 'text', text: ' x', script: 'normal' },
    { kind: 'text', text: '2', script: 'super' },
    { kind: 'text', text: ' ^ ', script: 'normal' },
    { kind: 'math', text: String.raw`\frac{a}{b}\\c` },
  ]);
});

it('treats latex as a single atom and enforces bounded, located errors', () => {
  expect(parseText('x_i^2', 'latex')).toEqual([
    { kind: 'math', text: 'x_i^2' },
  ]);
  for (const source of ['a^{b', 'a_{x^{2}}', String.raw`\(x`, 'a_{}'])
    expect(() => parseText(source, 'rich', '/title')).toThrow(/\/title.*位置/);
  expect(() => parseText('x'.repeat(16385))).toThrow(/长度/);
  expect(() => parseText('x'.repeat(4097), 'latex')).toThrow(/公式/);
  expect(() => parseText('x^{a}'.repeat(600), 'rich')).toThrow(/片段/);
});
