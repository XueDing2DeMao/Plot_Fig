import { describe, expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import {
  axisPointAt,
  axisTickSegment,
  layoutAxis,
  type AxisLayoutContext,
} from './axis-layout.js';
import { createScale, type PlotScale } from './scales.js';
import { renderAxis } from './axis.js';
import { formatNumber } from './geometry.js';
import { planAxisTicks } from './tick-plan.js';

const rect = { x: 10, y: 20, width: 300, height: 200 };
function axisAt(position: Axis['position']): Axis {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.position = position;
  axis.dimension = ['top', 'bottom'].includes(position) ? 'x' : 'y';
  return axis;
}
function contextFor(axis: Axis, scale: PlotScale): AxisLayoutContext {
  return { axes: [axis], scales: new Map([[axis.axisId, scale]]) };
}
describe('frame geometry and tick directions', () => {
  it.each([
    ['bottom', { x1: 10, y1: 220, x2: 310, y2: 220 }, { x: 85, y: 220 }, 1],
    ['top', { x1: 10, y1: 20, x2: 310, y2: 20 }, { x: 85, y: 20 }, -1],
    ['left', { x1: 10, y1: 20, x2: 10, y2: 220 }, { x: 10, y: 170 }, -1],
    ['right', { x1: 310, y1: 20, x2: 310, y2: 220 }, { x: 310, y: 170 }, 1],
  ] as const)(
    'uses the existing %s frame and data-ratio convention',
    (side, line, point, outward) => {
      const layout = layoutAxis(axisAt(side), rect);
      expect(layout.line).toEqual(line);
      expect(axisPointAt(layout, 0.25)).toEqual(point);
      expect(layout.outward).toBe(outward);
      expect(layout.normalOffsetPt).toBe(0);
    },
  );
  it.each([
    ['bottom', 'out', [85, 220, 85, 224]],
    ['bottom', 'in', [85, 220, 85, 216]],
    ['bottom', 'both', [85, 216, 85, 224]],
    ['top', 'out', [85, 20, 85, 16]],
    ['top', 'in', [85, 20, 85, 24]],
    ['top', 'both', [85, 24, 85, 16]],
    ['left', 'out', [10, 170, 6, 170]],
    ['left', 'in', [10, 170, 14, 170]],
    ['left', 'both', [14, 170, 6, 170]],
    ['right', 'out', [310, 170, 314, 170]],
    ['right', 'in', [310, 170, 306, 170]],
    ['right', 'both', [306, 170, 314, 170]],
  ] as const)(
    '%s ticks point %s with full length on each selected side',
    (side, direction, [x1, y1, x2, y2]) => {
      expect(
        axisTickSegment(layoutAxis(axisAt(side), rect), 0.25, 4, direction),
      ).toEqual({ x1, y1, x2, y2 });
    },
  );
  it.each(['bottom', 'top', 'left', 'right'] as const)(
    'moves the %s axis by signed outward points and preserves ticks when its line is hidden',
    (side) => {
      const original = layoutAxis(axisAt(side), rect);
      const shifted = layoutAxis(axisAt(side), rect, {
        lineVisible: false,
        placement: { mode: 'frame', offsetPt: 7 },
      });
      expect(shifted.line).toBeNull();
      expect(shifted.coordinate - original.coordinate).toBe(
        original.outward * 7,
      );
      expect(shifted.normalOffsetPt).toBe(7);
      expect(axisTickSegment(shifted, 0.25, 4)).not.toEqual(
        axisTickSegment(original, 0.25, 4),
      );
      const inward = layoutAxis(axisAt(side), rect, {
        placement: { mode: 'frame', offsetPt: -7 },
      });
      expect(inward.coordinate - original.coordinate).toBe(
        original.outward * -7,
      );
    },
  );
  it.each(['bottom', 'top', 'left', 'right'] as const)(
    'preserves formatted legacy %s line and major/minor tick coordinates exactly',
    (side) => {
      const axis = axisAt(side);
      axis.minorTicks = { ...axis.minorTicks, visible: true, count: 3 };
      const area = {
        x: 17.1234567,
        y: 8.7654321,
        width: 289.3333333,
        height: 188.2222222,
      };
      const scale = createScale(axis, -0.1, 7.25)!;
      const plan = planAxisTicks(axis, scale);
      const layout = layoutAxis(axis, area);
      const svg = renderAxis(axis, area, scale);
      expect(layout.line).not.toBeNull();
      const coords = (segment: NonNullable<typeof layout.line>) =>
        Object.entries(segment)
          .map(([key, value]) => `${key}="${formatNumber(value)}"`)
          .join(' ');
      expect(svg).toContain(`data-role="axis-line" ${coords(layout.line!)}`);
      for (const tick of plan.major)
        expect(svg).toContain(
          `data-role="major-tick" ${coords(axisTickSegment(layout, tick.ratio, axis.majorTicks.lengthPt))}`,
        );
      for (const tick of plan.minor)
        expect(svg).toContain(
          `data-role="minor-tick" ${coords(axisTickSegment(layout, tick.ratio, axis.minorTicks.lengthPt))}`,
        );
    },
  );
});
describe('screen-based percentage placement', () => {
  it.each([
    ['bottom', 0, 20],
    ['bottom', 25, 70],
    ['bottom', 100, 220],
    ['top', 0, 20],
    ['top', 25, 70],
    ['top', 100, 220],
    ['left', 0, 10],
    ['left', 25, 85],
    ['left', 100, 310],
    ['right', 0, 10],
    ['right', 25, 85],
    ['right', 100, 310],
  ] as const)(
    'places %s at %s percent without following data reverse',
    (side, percent, coordinate) => {
      const axis = axisAt(side),
        options = { placement: { mode: 'percent' as const, percent } };
      expect(layoutAxis(axis, rect, options).coordinate).toBe(coordinate);
      axis.reverse = true;
      expect(layoutAxis(axis, rect, options).coordinate).toBe(coordinate);
    },
  );
  it('combines percent with outward offsets for the selected screen side', () => {
    expect(
      layoutAxis(axisAt('top'), rect, {
        placement: { mode: 'percent', percent: 25, offsetPt: 3 },
      }).coordinate,
    ).toBe(67);
    expect(
      layoutAxis(axisAt('right'), rect, {
        placement: { mode: 'percent', percent: 25, offsetPt: 3 },
      }).coordinate,
    ).toBe(88);
  });
  it.each([-1, 101, NaN, Infinity])(
    'rejects invalid percentage %s rather than clamping',
    (percent) => {
      expect(() =>
        layoutAxis(axisAt('bottom'), rect, {
          placement: { mode: 'percent', percent },
        }),
      ).toThrow(/百分比/);
    },
  );
});
describe('crossing geometry', () => {
  it('uses the specified opposite numeric axis, its reverse mapping, and an additional outward offset', () => {
    const opposite = axisAt('left');
    opposite.axisId = 'secondary-y';
    const axis = axisAt('bottom');
    const options = {
      placement: {
        mode: 'cross' as const,
        axisId: opposite.axisId,
        value: 0,
        offsetPt: 3,
      },
    };
    const normal = layoutAxis(
      axis,
      rect,
      options,
      contextFor(opposite, createScale(opposite, -2, 6)!),
    );
    expect(normal.coordinate).toBe(173);
    expect(normal.normalOffsetPt).toBe(-47);
    opposite.reverse = true;
    const reverse = layoutAxis(
      axis,
      rect,
      options,
      contextFor(opposite, createScale(opposite, -2, 6)!),
    );
    expect(reverse.coordinate).toBe(73);
  });
  it.each(['log10', 'ln'] as const)(
    'crosses a vertical axis using raw positive %s data rather than an exponent',
    (kind) => {
      const opposite = axisAt('bottom');
      opposite.scale = kind;
      const low = kind === 'log10' ? 1 : Math.exp(1),
        high = kind === 'log10' ? 100 : Math.exp(3),
        value = kind === 'log10' ? 10 : Math.exp(2);
      const layout = layoutAxis(
        axisAt('right'),
        rect,
        { placement: { mode: 'cross', axisId: opposite.axisId, value } },
        contextFor(opposite, createScale(opposite, low, high)!),
      );
      expect(layout.coordinate).toBeCloseTo(160, 12);
      expect(layout.normalOffsetPt).toBeCloseTo(-150, 12);
    },
  );
  it.each([-2, 6])(
    'accepts an exact opposite-axis range endpoint %s',
    (value) => {
      const opposite = axisAt('left');
      const layout = layoutAxis(
        axisAt('bottom'),
        rect,
        { placement: { mode: 'cross', axisId: opposite.axisId, value } },
        contextFor(opposite, createScale(opposite, -2, 6)!),
      );
      expect(layout.coordinate).toBe(value === -2 ? 220 : 20);
    },
  );
  it.each([-2.0000001, 6.0000001, NaN, Infinity, -Infinity])(
    'rejects invalid/out-of-range crossing value %s rather than clamping',
    (value) => {
      const opposite = axisAt('left');
      expect(() =>
        layoutAxis(
          axisAt('bottom'),
          rect,
          { placement: { mode: 'cross', axisId: opposite.axisId, value } },
          contextFor(opposite, createScale(opposite, -2, 6)!),
        ),
      ).toThrow(/交叉|范围|有限/);
    },
  );
  it('requires the named opposite axis and its resolved scale in the current panel', () => {
    const opposite = axisAt('left');
    opposite.axisId = 'another-y';
    const axis = axisAt('bottom'),
      placement = { mode: 'cross' as const, axisId: opposite.axisId, value: 0 };
    expect(() => layoutAxis(axis, rect, { placement })).toThrow(
      /交叉|同一图层/,
    );
    expect(() =>
      layoutAxis(
        axis,
        rect,
        { placement },
        {
          axes: [],
          scales: new Map([[opposite.axisId, createScale(opposite, -2, 6)!]]),
        },
      ),
    ).toThrow(/交叉|同一图层/);
    expect(() =>
      layoutAxis(
        axis,
        rect,
        { placement },
        { axes: [opposite], scales: new Map() },
      ),
    ).toThrow(/交叉|范围/);
    opposite.dimension = 'x';
    opposite.position = 'top';
    expect(() =>
      layoutAxis(
        axis,
        rect,
        { placement },
        contextFor(opposite, createScale(opposite, -2, 6)!),
      ),
    ).toThrow(/交叉|另一维度/);
  });
  it('rejects categorical target scales and nonpositive logarithmic values', () => {
    const opposite = axisAt('left');
    const scale = createScale(opposite, 1, 100)!;
    opposite.scale = 'category';
    scale.scale = 'category';
    expect(() =>
      layoutAxis(
        axisAt('bottom'),
        rect,
        { placement: { mode: 'cross', axisId: opposite.axisId, value: 2 } },
        contextFor(opposite, scale),
      ),
    ).toThrow(/分类/);
    opposite.scale = 'log10';
    expect(() =>
      layoutAxis(
        axisAt('bottom'),
        rect,
        { placement: { mode: 'cross', axisId: opposite.axisId, value: 0 } },
        contextFor(opposite, createScale(opposite, 1, 100)!),
      ),
    ).toThrow(/正数/);
  });
  it('rejects nonfinite mapped coordinates, offsets and tick lengths', () => {
    const opposite = axisAt('left'),
      scale = createScale(opposite, -2, 6)!;
    scale.map = () => NaN;
    expect(() =>
      layoutAxis(
        axisAt('bottom'),
        rect,
        { placement: { mode: 'cross', axisId: opposite.axisId, value: 0 } },
        contextFor(opposite, scale),
      ),
    ).toThrow(/有限/);
    expect(() =>
      layoutAxis(axisAt('bottom'), rect, {
        placement: { mode: 'frame', offsetPt: Infinity },
      }),
    ).toThrow(/有限/);
    const layout = layoutAxis(axisAt('bottom'), rect);
    expect(() => axisTickSegment(layout, 0.25, Infinity)).toThrow(/长度/);
    expect(() => axisTickSegment(layout, 0.25, -1)).toThrow(/长度/);
  });
});

describe('finite input arithmetic overflow', () => {
  it.each([
    ['bottom', { x: 1e308, y: 0, width: 1e308, height: 10 }],
    ['right', { x: 0, y: 1e308, width: 10, height: 1e308 }],
  ] as const)(
    'rejects the overflowing final %s axis line endpoint',
    (side, area) => {
      expect(() => layoutAxis(axisAt(side), area)).toThrow(/有限/);
    },
  );
  it.each([
    ['bottom', { x: 0, y: 0, width: 10, height: 1e308 }],
    ['top', { x: 0, y: -1e308, width: 10, height: 10 }],
    ['left', { x: -1e308, y: 0, width: 10, height: 10 }],
    ['right', { x: 0, y: 0, width: 1e308, height: 10 }],
  ] as const)(
    'rejects the overflowing final %s tick endpoint',
    (side, area) => {
      const layout = layoutAxis(axisAt(side), area);
      expect(() => axisTickSegment(layout, 0.5, 1e308, 'out')).toThrow(/有限/);
      expect(() => axisTickSegment(layout, 0.5, 1e308, 'both')).toThrow(/有限/);
    },
  );
  it('rejects overflowing normal displacement even when the moved line itself remains finite', () => {
    expect(() =>
      layoutAxis(
        axisAt('bottom'),
        { x: 0, y: 0, width: 10, height: 1e308 },
        { placement: { mode: 'percent', percent: 0, offsetPt: -1e308 } },
      ),
    ).toThrow(/有限/);
  });
});
