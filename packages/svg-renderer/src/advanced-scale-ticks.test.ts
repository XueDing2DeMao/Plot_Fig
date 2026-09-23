import { describe, expect, it } from 'vitest';
import { createNumericScale } from './advanced-scale.js';
import { planNumericScaleTicks } from './advanced-scale-ticks.js';
import { createScale } from './scales.js';
import { planAxisTicks } from './tick-plan.js';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
describe('F5.1A 高级刻度', () => {
  it('对数细分预算按范围内且不与主刻度重复的最终数量计算', () => {
    const scale = createNumericScale({ kind: 'log10' }, 1, 10);
    const plan = planNumericScaleTicks(scale, {
      logPolicy: 'logarithmic',
      minorCount: 9998,
    });
    expect(plan.major).toHaveLength(2);
    expect(plan.minor).toHaveLength(9998);
    expect(() =>
      planNumericScaleTicks(scale, {
        logPolicy: 'logarithmic',
        minorCount: 9999,
      }),
    ).toThrow(/10000/);
  });
  it('恰好一个数量级的窄区间判断不随单位缩放改变', () => {
    const plan = planNumericScaleTicks(
      createNumericScale({ kind: 'log10' }, 8.2e-18, 8.2e-17),
      { logPolicy: 'origin-log10' },
    );
    const expected = [8.2e-18, 2e-17, 4e-17, 6e-17, 8e-17, 8.2e-17];
    expect(plan.major).toHaveLength(expected.length);
    plan.major.forEach((tick, i) =>
      expect(tick.value / expected[i]!).toBeCloseTo(1, 12),
    );
  });
  it('外部草稿中的空值、未知字段和非布尔值不能降级为默认设置', () => {
    const scale = createNumericScale({ kind: 'log2' }, 1, 16);
    for (const options of [
      { minorCount: null },
      { minorVisible: 'false' },
      { major: null },
      { major: { mode: 'auto', code: 'x' } },
      { logPolicy: null },
      { extra: true },
    ]) {
      expect(() => planNumericScaleTicks(scale, options as never)).toThrow();
    }
  });
  it('Log2 自动主刻度为底数幂，反向只镜像', () => {
    const normal = planNumericScaleTicks(
      createNumericScale({ kind: 'log2' }, 1, 16),
    );
    const reversed = planNumericScaleTicks(
      createNumericScale({ kind: 'log2' }, 1, 16, true),
    );
    expect(normal.major.map((t) => t.value)).toEqual([1, 2, 4, 8, 16]);
    expect(reversed.major.map((t) => t.ratio)).toEqual(
      normal.major.map((t) => 1 - t.ratio),
    );
  });
  it('显式 Log10 细分将2…9映射到真实对数位置', () => {
    const plan = planNumericScaleTicks(
      createNumericScale({ kind: 'log10' }, 1, 1000),
      { logPolicy: 'logarithmic', minorCount: 8 },
    );
    expect(plan.major.map((t) => t.value)).toEqual([1, 10, 100, 1000]);
    expect(plan.minor).toHaveLength(24);
    expect(plan.minor.slice(0, 8).map((t) => t.value)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9,
    ]);
    expect(plan.minor[0]!.ratio).toBeCloseTo(Math.log10(2) / 3, 14);
  });
  it('窄区间[2,8]使用线性刻度数值，网格位置仍为对数', () => {
    const scale = createNumericScale({ kind: 'log10' }, 2, 8);
    const plan = planNumericScaleTicks(scale, {
      logPolicy: 'origin-log10',
      minorCount: 1,
    });
    expect(plan.major.map((t) => t.value)).toEqual([2, 4, 6, 8]);
    expect(plan.minor.map((t) => t.value)).toEqual([3, 5, 7]);
    expect(plan.minor[0]!.ratio).toBeCloseTo(scale.map(3), 14);
    expect(plan.minor[0]!.ratio).not.toBeCloseTo(0.25, 3);
  });
  it('SymLog正负主刻度与零点、线性小区间均可用', () => {
    const spec = {
      kind: 'log10' as const,
      symLog: { threshold: 1, linearLength: 1 },
    };
    const plan = planNumericScaleTicks(createNumericScale(spec, -100, 100), {
      minorCount: 1,
    });
    expect(plan.major.map((t) => t.value)).toEqual([
      -100, -10, -1, 0, 1, 10, 100,
    ]);
    expect(plan.major[3]!.ratio).toBe(0.5);
    expect(
      plan.minor.every(
        (t) => Number.isFinite(t.value) && Number.isFinite(t.ratio),
      ),
    ).toBe(true);
    const small = planNumericScaleTicks(createNumericScale(spec, -0.5, 0.5));
    expect(small.major.some((t) => t.value === 0)).toBe(true);
  });
  it('指定增量和锚点在变换空间工作，锚点保持原数', () => {
    const plan = planNumericScaleTicks(
      createNumericScale({ kind: 'log2' }, 1, 64),
      { major: { mode: 'increment', step: 2, anchor: 2 }, minorCount: 0 },
    );
    expect(plan.major.map((t) => t.value)).toEqual([2, 8, 32]);
  });
  it.each(['linear', 'log10', 'ln'] as const)(
    'legacy %s 保留既有主次值和比率',
    (kind) => {
      const axis = { ...chartTemplate('xy').panels[0]!.axes[0]!, scale: kind };
      axis.minorTicks = { ...axis.minorTicks, visible: true, count: 3 };
      const expected = planAxisTicks(axis, createScale(axis, 1, 100)!);
      expect(
        planNumericScaleTicks(createNumericScale({ kind }, 1, 100), {
          minorCount: 3,
          logPolicy: 'legacy',
        }),
      ).toEqual(expected);
    },
  );
  it('刻度预算和不适用策略明确报错', () => {
    const scale = createNumericScale({ kind: 'log2' }, 1, 16);
    expect(() => planNumericScaleTicks(scale, { minorCount: 10000 })).toThrow(
      /10000|10,000/,
    );
    expect(() => planNumericScaleTicks(scale, { minorCount: -1 })).toThrow();
    expect(() =>
      planNumericScaleTicks(scale, {
        major: { mode: 'increment', step: 1e-8 },
      }),
    ).toThrow();
    expect(() =>
      planNumericScaleTicks(createNumericScale({ kind: 'linear' }, 0, 1), {
        logPolicy: 'logarithmic',
      }),
    ).toThrow(/对数/);
    expect(() =>
      planNumericScaleTicks(createNumericScale({ kind: 'ln' }, 1, 10), {
        logPolicy: 'origin-log10',
      }),
    ).toThrow(/Log10/);
    expect(() =>
      planNumericScaleTicks(
        createNumericScale({ kind: 'log2' }, 1, 1 + Number.EPSILON),
        { minorCount: 1 },
      ),
    ).toThrow(/精度/);
  });
});
