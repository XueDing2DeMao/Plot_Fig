import { describe, expect, it } from 'vitest';
import {
  createNumericScale,
  numericScaleCapability,
  validateNumericScaleSpec,
} from './advanced-scale.js';

describe('F5.1A 数值尺度能力', () => {
  it('Log2 将每次翻倍映射为等距，并能从屏幕位置还原原值', () => {
    const scale = createNumericScale({ kind: 'log2' }, 1, 16);
    expect([1, 2, 4, 8, 16].map(scale.map)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    for (const value of [1, 1.5, 4, 9, 16])
      expect(scale.invert(scale.map(value))).toBeCloseTo(value, 12);
    expect(Number.isNaN(scale.map(0))).toBe(true);
    expect(Number.isNaN(scale.map(-1))).toBe(true);
  });
  it.each(['log10', 'ln', 'log2'] as const)(
    'SymLog %s 零点居中，正负值与阈值连续、可逆',
    (kind) => {
      const spec = { kind, symLog: { threshold: 2, linearLength: 1.5 } };
      const cap = numericScaleCapability(spec);
      const scale = createNumericScale(spec, -100, 100);
      expect(scale.map(0)).toBe(0.5);
      expect(cap.forward(2)).toBe(1.5);
      expect(cap.forward(-2)).toBe(-1.5);
      expect(cap.forward(1)).toBe(0.75);
      expect(cap.forward(2 + 1e-10)).toBeCloseTo(1.5, 9);
      for (const value of [-100, -3, -2, -0.25, 0, 0.25, 2, 3, 100]) {
        expect(scale.invert(scale.map(value))).toBeCloseTo(value, 10);
        expect(scale.map(-value)).toBeCloseTo(1 - scale.map(value), 14);
      }
    },
  );
  it('反向只镜像映射，定义域和正逆语义保持', () => {
    const scale = createNumericScale({ kind: 'log2' }, 1, 16, true);
    expect(scale.map(2)).toBe(0.75);
    expect(scale.invert(0.75)).toBe(2);
    expect(scale.invert(0)).toBe(16);
    expect(scale.invert(1)).toBe(1);
  });
  it('极大线性跨度与极小对数阈值不因中间计算溢出而失效', () => {
    const linear = createNumericScale({ kind: 'linear' }, -1e308, 1e308);
    expect(linear.map(0)).toBe(0.5);
    expect(linear.invert(0.75)).toBe(5e307);
    const spec = {
      kind: 'log10' as const,
      symLog: { threshold: 1e-300, linearLength: 1 },
    };
    const scale = createNumericScale(spec, -1e300, 1e300);
    expect(scale.map(0)).toBe(0.5);
    expect(Number.isFinite(scale.map(1e299))).toBe(true);
    expect(scale.invert(scale.map(1e299)) / 1e299).toBeCloseTo(1, 10);
    expect(scale.invert(0)).toBe(-1e300);
    expect(scale.invert(1)).toBe(1e300);
  });
  it('无穷、非法配置和塌缩范围明确拒绝', () => {
    for (const value of [
      null,
      {},
      { kind: 'category' },
      { kind: 'log2', unknown: 1 },
      { kind: 'linear', symLog: { threshold: 1, linearLength: 1 } },
      { kind: 'ln', symLog: { threshold: 0, linearLength: 1 } },
      { kind: 'ln', symLog: { threshold: 1, linearLength: Infinity } },
    ]) {
      expect(() => validateNumericScaleSpec(value)).toThrow();
    }
    expect(() => createNumericScale({ kind: 'log2' }, 0, 10)).toThrow(/定义域/);
    expect(() => createNumericScale({ kind: 'linear' }, 1, 1)).toThrow(/范围/);
    expect(() => createNumericScale({ kind: 'linear' }, 0, Infinity)).toThrow(
      /范围/,
    );
    const cap = numericScaleCapability({ kind: 'log2' });
    expect(cap.accepts(Infinity)).toBe(false);
    expect(Number.isNaN(cap.inverse(Infinity))).toBe(true);
    expect(cap.canReverse).toBe(true);
    expect(cap.canSegment).toBe(true);
  });
});
