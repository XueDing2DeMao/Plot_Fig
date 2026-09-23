import { expect, it } from 'vitest';
import {
  createNumericScale,
  numericScaleCapability,
} from './advanced-scale.js';
it.each([
  ['probability', 50, 0],
  ['probit', 50, 5],
  ['logit', 50, 0],
  ['weibull', 1 - Math.exp(-1), 0],
] as const)('%s使用明确概率单位并可往返', (kind, value, expected) => {
  const cap = numericScaleCapability({ kind } as never);
  expect(cap.forward(value)).toBeCloseTo(expected, 8);
  for (const v of kind === 'weibull'
    ? [0.001, 0.1, 0.5, 0.9, 0.999]
    : [0.001, 1, 10, 50, 90, 99, 99.999])
    expect(cap.inverse(cap.forward(v))).toBeCloseTo(v, 7);
  expect(cap.accepts(0)).toBe(false);
  expect(cap.accepts(kind === 'weibull' ? 1 : 100)).toBe(false);
});
it('倒数允许递减变换但数据范围递增，不能跨越极点', () => {
  const s = createNumericScale({ kind: 'reciprocal' } as never, 1, 4);
  expect(s.map(1)).toBe(0);
  expect(s.map(4)).toBe(1);
  expect(s.map(2)).toBeCloseTo(2 / 3, 10);
  expect(s.invert(s.map(2))).toBeCloseTo(2, 10);
  expect(() =>
    createNumericScale({ kind: 'reciprocal' } as never, -1, 1),
  ).toThrow();
  const reverse = createNumericScale(
    { kind: 'offset-reciprocal', offset: 273.14 } as never,
    -100,
    100,
    true,
  );
  expect(reverse.invert(reverse.map(20))).toBeCloseTo(20, 8);
});
it('Discrete压缩缺口但可逆且保留范围外延伸', () => {
  const s = createNumericScale(
    { kind: 'discrete', values: [1, 2, 5] } as never,
    1,
    5,
  );
  expect(s.map(2)).toBe(0.5);
  expect(s.invert(0.5)).toBe(2);
  expect(s.map(3.5)).toBe(0.75);
  expect(s.invert(0.75)).toBe(3.5);
});
it('受限公式定义域与正逆校验，禁止代码执行和非单调变换', () => {
  const formula = { forward: 'x*x-4', inverse: 'sqrt(x+4)', min: 1, max: 5 };
  const s = createNumericScale({ kind: 'custom', formula } as never, 1, 5);
  expect(s.map(3)).toBeCloseTo(1 / 3, 10);
  expect(s.invert(s.map(3))).toBeCloseTo(3, 10);
  for (const patch of [
    { forward: 'globalThis.process.exit()' },
    { inverse: 'x+1' },
    { min: -5 },
    { forward: 'sin(x)' },
    { forward: 'x=2' },
  ])
    expect(() =>
      createNumericScale(
        { kind: 'custom', formula: { ...formula, ...patch } } as never,
        1,
        5,
      ),
    ).toThrow();
});
