import { expect, it } from 'vitest';
import { resolveNumericScaleRange } from './advanced-scale-range.js';
import { numericScaleCapability } from './advanced-scale.js';
const sym = {
  kind: 'log10' as const,
  symLog: { threshold: 1, linearLength: 1 },
};
it('SymLog 自动范围保留负数和零，不改原表且零边距保持原端点', () => {
  const values = [-100, -1, 0, 1, 100, NaN];
  expect(resolveNumericScaleRange({ spec: sym, values })).toEqual({
    min: -100,
    max: 100,
  });
  expect(values.slice(0, 5)).toEqual([-100, -1, 0, 1, 100]);
});
it('固定端保持原数，边距在尺度空间增长且可逆', () => {
  const range = resolveNumericScaleRange({
    spec: sym,
    values: [-10, 10],
    min: -10,
    padding: { minPercent: 10, maxPercent: 10 },
  })!;
  expect(range.min).toBe(-10);
  expect(numericScaleCapability(sym).forward(range.max)).toBeCloseTo(2.4, 12);
});
it('单侧固定端与数据另一端重合时保留自动扩展结果', () => {
  const upper = resolveNumericScaleRange({
    spec: sym,
    values: [-10, 10],
    min: 10,
  })!;
  const lower = resolveNumericScaleRange({
    spec: sym,
    values: [-10, 10],
    max: -10,
  })!;
  expect(upper.min).toBe(10);
  expect(numericScaleCapability(sym).forward(upper.max)).toBeCloseTo(2.5, 12);
  expect(lower.max).toBe(-10);
  expect(numericScaleCapability(sym).forward(lower.min)).toBeCloseTo(-2.5, 12);
});
it('零单值产生有限对称范围，对数过滤非正数', () => {
  expect(resolveNumericScaleRange({ spec: sym, values: [0] })).toEqual({
    min: -0.5,
    max: 0.5,
  });
  expect(
    resolveNumericScaleRange({ spec: { kind: 'log2' }, values: [-1, 0, 2, 8] }),
  ).toEqual({ min: 2, max: 8 });
  expect(
    resolveNumericScaleRange({ spec: { kind: 'log2' }, values: [-1, 0] }),
  ).toBeUndefined();
});
it('非法固定端、负边距与逆变换溢出拒绝', () => {
  expect(() =>
    resolveNumericScaleRange({
      spec: { kind: 'log2' },
      values: [1, 2],
      min: 0,
    }),
  ).toThrow();
  expect(() =>
    resolveNumericScaleRange({
      spec: sym,
      values: [-10, 10],
      padding: { maxPercent: -1 },
    }),
  ).toThrow();
  expect(() =>
    resolveNumericScaleRange({
      spec: sym,
      values: [-1e308, 1e308],
      padding: { maxPercent: 100 },
    }),
  ).toThrow();
});
