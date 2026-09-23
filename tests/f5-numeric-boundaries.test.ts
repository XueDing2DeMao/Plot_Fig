import { expect, it } from 'vitest';
import {
  compileAxisFormula,
  validateFormulaPair,
} from '@plot-fig/figure-schema';
import { resolveNumericScaleRange } from '../packages/svg-renderer/src/advanced-scale-range.js';
import { createNumericScale } from '../packages/svg-renderer/src/advanced-scale.js';
import { planNumericScaleTicks } from '../packages/svg-renderer/src/advanced-scale-ticks.js';
it('公式函数名与数学幂优先级保持完整', () => {
  expect(compileAxisFormula('log10(x)').eval(100)).toBe(2);
  expect(compileAxisFormula('log2(x)').eval(8)).toBe(3);
  expect(compileAxisFormula('-x^2').eval(3)).toBe(-9);
  expect(compileAxisFormula('2^-2').eval(0)).toBe(0.25);
  expect(() =>
    validateFormulaPair({
      forward: '-x^2',
      inverse: 'sqrt(-x)',
      min: 1,
      max: 5,
    }),
  ).not.toThrow();
});
it('递减变换保留原始上下边距与单端固定语义', () => {
  const range = resolveNumericScaleRange({
    spec: { kind: 'reciprocal' },
    values: [1, 4],
    padding: { minPercent: 10, maxPercent: 0 },
  })!;
  expect(range.min).toBeCloseTo(1 / 1.075, 12);
  expect(range.max).toBe(4);
  const fixed = resolveNumericScaleRange({
    spec: { kind: 'reciprocal' },
    values: [4],
    min: 4,
  })!;
  expect(fixed.min).toBe(4);
  expect(fixed.max).toBeGreaterThan(4);
  const negative = resolveNumericScaleRange({
    spec: { kind: 'reciprocal' },
    values: [-4],
    max: -4,
  })!;
  expect(negative.max).toBe(-4);
  expect(negative.min).toBeLessThan(-4);
});
it('窄区间 Probit 与较大合并样本仍可生成范围和刻度', () => {
  expect(
    planNumericScaleTicks(createNumericScale({ kind: 'probit' }, 51, 55), {
      minorCount: 2,
    }).major.length,
  ).toBeGreaterThanOrEqual(2);
  expect(
    resolveNumericScaleRange({
      spec: { kind: 'logit' },
      values: Array.from({ length: 150000 }, (_, i) => ((i % 9999) + 1) / 100),
    }),
  ).toBeDefined();
});
