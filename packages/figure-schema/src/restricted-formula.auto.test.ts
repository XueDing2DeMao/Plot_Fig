import { expect, it } from 'vitest';
import { validateFormulaPair } from './restricted-formula.js';

it('使用 auto 根据正向公式和定义域自动反解递增公式', () => {
  const formula = validateFormulaPair({
    forward: 'x*9/5+32',
    inverse: 'auto',
    min: -40,
    max: 100,
  });

  expect(formula.forward(100)).toBeCloseTo(212, 12);
  expect(formula.inverse(212)).toBeCloseTo(100, 10);
  expect(formula.inverse(-40)).toBeCloseTo(-40, 10);
});

it('自动反解支持严格递减公式并拒绝目标值域之外的数值', () => {
  const formula = validateFormulaPair({
    forward: '10-x',
    inverse: 'auto',
    min: 0,
    max: 10,
  });

  expect(formula.inverse(7)).toBeCloseTo(3, 10);
  expect(formula.inverse(-1)).toBeNaN();
  expect(formula.inverse(11)).toBeNaN();
});

it('自动反解仍拒绝定义域内无法确认严格单调的公式', () => {
  expect(() =>
    validateFormulaPair({
      forward: 'x^2',
      inverse: 'auto',
      min: -1,
      max: 1,
    }),
  ).toThrow('严格单调');
});
