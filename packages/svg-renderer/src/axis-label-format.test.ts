import { expect, it } from 'vitest';
import {
  formatAxisCategoryLabel,
  formatAxisLabel,
} from './axis-label-format.js';
import { escapeXml } from './geometry.js';

it.each([
  { value: 1e-9, options: {}, expected: '0' },
  { value: 1e-9, options: { preciseAuto: true }, expected: '1e-9' },
  { value: -1.23456789, options: {}, expected: '-1.234568' },
  {
    value: -1.25,
    options: { notation: 'fixed' as const, precision: 3 },
    expected: '-1.250',
  },
  {
    value: 1234,
    options: { notation: 'scientific' as const, precision: 2 },
    expected: '1.23e+3',
  },
])(
  'preserves the old formatter output $expected',
  ({ value, options, expected }) => {
    expect(formatAxisLabel(value, options)).toBe(expected);
  },
);

it.each([
  [12345, 2, '12.35e+3'],
  [1.005, 2, '1.01e+0'],
  [-0.000012345, 3, '-12.345e-6'],
  [999.999, 2, '1.00e+3'],
  [-999.999, 2, '-1.00e+3'],
  [0, 2, '0.00e+0'],
  [-0, 2, '0.00e+0'],
  [Number.MIN_VALUE, 2, '5.00e-324'],
  [Number.MAX_VALUE, 3, '179.769e+306'],
] as const)(
  'formats %s with %s engineering decimal places',
  (value, precision, expected) => {
    expect(formatAxisLabel(value, { notation: 'engineering', precision })).toBe(
      expected,
    );
  },
);

it('applies the divisor only to display and keeps prefix and suffix as unescaped text', () => {
  const tick = Object.freeze({ value: 1250, ratio: 0.4375 });
  const label = formatAxisLabel(tick.value, {
    notation: 'fixed',
    precision: 2,
    divisor: 1000,
    prefix: '<&"',
    suffix: "' kN\n(m/s²)",
  });
  expect(label).toBe('<&"1.25\' kN\n(m/s²)');
  expect(escapeXml(label)).toBe('&lt;&amp;&quot;1.25&apos; kN\n(m/s²)');
  expect(tick).toEqual({ value: 1250, ratio: 0.4375 });
});

it('applies a non-monotonic display formula before divisor, notation and affixes', () => {
  expect(
    formatAxisLabel(-3, {
      formula: 'abs(x)*2',
      divisor: 2,
      notation: 'fixed',
      precision: 1,
      prefix: '[',
      suffix: ']',
    }),
  ).toBe('[3.0]');
  expect(formatAxisLabel(-2, { formula: 'x^2' })).toBe('4');
});

it.each(['globalThis.process.exit()', '1/(x-1)'])(
  'rejects unsafe, invalid or non-finite label formula %s',
  (formula) => {
    expect(() => formatAxisLabel(1, { formula })).toThrow(/公式|字符/);
  },
);

it.each([
  [1, 1e9, '1e-9'],
  [-1, 1e9, '-1e-9'],
  [0.123456789, 1000, '0.000123456789'],
  [Number.MAX_VALUE, 1e300, '179769313.48623157'],
] as const)(
  'retains the automatic display precision of %s divided by %s',
  (value, divisor, expected) => {
    expect(formatAxisLabel(value, { divisor })).toBe(expected);
    expect(
      formatAxisLabel(value, { notation: 'auto', divisor, preciseAuto: false }),
    ).toBe(expected);
  },
);

it('keeps identity divisors and explicitly chosen numeric notation compatible', () => {
  expect(formatAxisLabel(1e-9, { divisor: 1 })).toBe('0');
  expect(formatAxisLabel(1e-9, { divisor: 1, preciseAuto: true })).toBe('1e-9');
  expect(
    formatAxisLabel(1, { divisor: 1e9, notation: 'fixed', precision: 6 }),
  ).toBe('0.000000');
  expect(
    formatAxisLabel(1, { divisor: 1e9, notation: 'scientific', precision: 2 }),
  ).toBe('1.00e-9');
  expect(
    formatAxisLabel(1, { divisor: 1e9, notation: 'engineering', precision: 2 }),
  ).toBe('1.00e-9');
});

it.each([0, -1, Infinity, NaN])(
  'rejects divisor %s instead of manufacturing a label',
  (divisor) => {
    expect(() => formatAxisLabel(10, { divisor })).toThrow(/除数/);
  },
);

it.each([-1, 2.5, 16, Infinity])('rejects precision %s', (precision) => {
  expect(() =>
    formatAxisLabel(10, { notation: 'engineering', precision }),
  ).toThrow(/小数位/);
});

it('rejects division overflow and nonzero underflow', () => {
  expect(() =>
    formatAxisLabel(Number.MAX_VALUE, { divisor: Number.MIN_VALUE }),
  ).toThrow(/显示值/);
  expect(() =>
    formatAxisLabel(Number.MIN_VALUE, { divisor: Number.MAX_VALUE }),
  ).toThrow(/显示值/);
});

it('bounds literal prefix and suffix without rejecting surrogate-pair codepoints', () => {
  expect(formatAxisLabel(1, { prefix: '😀'.repeat(1024) })).toBe(
    '😀'.repeat(1024) + '1',
  );
  expect(() => formatAxisLabel(1, { prefix: 'x'.repeat(1025) })).toThrow(
    /前缀/,
  );
  expect(() => formatAxisLabel(1, { suffix: 'x'.repeat(1025) })).toThrow(
    /后缀/,
  );
});

it.each(['auto', 'fixed', 'scientific'] as const)(
  'preserves category text with %s legacy notation and applies literal affixes',
  (notation) => {
    expect(
      formatAxisCategoryLabel('A<&\n汉字', {
        notation,
        precision: 3,
        prefix: '[',
        suffix: ']',
      }),
    ).toBe('[A<&\n汉字]');
  },
);

it.each([
  { notation: 'engineering' as const },
  { divisor: 2 },
  { divisor: 0 },
  { divisor: NaN },
  { formula: 'x*2' },
])('rejects new numeric-only category formatting %j', (options) => {
  expect(() => formatAxisCategoryLabel('A', options)).toThrow(/分类轴/);
});

it('shares affix limits on category labels and permits an explicit unit divisor', () => {
  expect(formatAxisCategoryLabel('1.2e-3', { divisor: 1 })).toBe('1.2e-3');
  expect(() =>
    formatAxisCategoryLabel('A', { prefix: 'x'.repeat(1025) }),
  ).toThrow(/前缀/);
  expect(() =>
    formatAxisCategoryLabel('A', { suffix: 'x'.repeat(1025) }),
  ).toThrow(/后缀/);
});
