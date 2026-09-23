import { describe, expect, it } from 'vitest';
import type { Axis } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import {
  planAxisGridTicks,
  renderAxisGrid,
  type GridStyle,
} from './axis-grid.js';
import { createScale } from './scales.js';
import { planAxisTicks, type AxisTickPlan } from './tick-plan.js';

const rect = { x: 10, y: 20, width: 300, height: 200 };
const major: GridStyle = {
  visible: true,
  color: '#123456',
  widthPt: 0.7,
  dash: 'dashed',
};
const minor: GridStyle = {
  visible: true,
  color: '#abcdef',
  widthPt: 0.3,
  dash: 'dotted',
};
function axisAt(side: Axis['position'] = 'bottom'): Axis {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.position = side;
  axis.dimension = ['top', 'bottom'].includes(side) ? 'x' : 'y';
  axis.majorTicks.generation = { mode: 'endpoints' };
  axis.minorTicks = { ...axis.minorTicks, visible: false, count: 1 };
  return axis;
}
describe('shared grid tick planning', () => {
  it('generates minor grid values while minor tick marks are hidden, without mutating axis settings', () => {
    const axis = axisAt(),
      before = structuredClone(axis),
      scale = createScale(axis, 0, 10)!;
    const plan = planAxisGridTicks(axis, scale, { minor });
    expect(plan).toEqual({
      major: [
        { value: 0, ratio: 0 },
        { value: 10, ratio: 1 },
      ],
      minor: [{ value: 5, ratio: 0.5 }],
    });
    expect(axis).toEqual(before);
    expect(planAxisTicks(axis, scale).minor).toEqual([]);
  });
  it('retains minor ticks required by the visible axis even when minor grids are disabled', () => {
    const axis = axisAt();
    axis.minorTicks.visible = true;
    const scale = createScale(axis, 0, 10)!;
    expect(planAxisGridTicks(axis, scale, {})).toEqual(
      planAxisTicks(axis, scale),
    );
  });
  it.each(['linear', 'log10', 'ln'] as const)(
    'shares exact reversed %s tick ratios with the existing planner',
    (kind) => {
      const axis = axisAt();
      axis.scale = kind;
      axis.reverse = true;
      const scale = createScale(
        axis,
        kind === 'linear' ? -2 : 1,
        kind === 'ln' ? Math.exp(2) : 100,
      )!;
      const plan = planAxisGridTicks(axis, scale, { major, minor });
      const visible = {
        ...axis,
        minorTicks: { ...axis.minorTicks, visible: true },
      };
      expect(plan).toEqual(planAxisTicks(visible, scale));
      expect(plan.minor[0]!.ratio).toBe(0.5);
    },
  );
  it('enforces the shared 10,000-tick budget before generating minor grid lines', () => {
    const axis = axisAt();
    axis.minorTicks.count = 10_000;
    expect(() =>
      planAxisGridTicks(axis, createScale(axis, 0, 10)!, { minor }),
    ).toThrow(/10000/);
  });
  it('preserves F2.1 hidden-axis budget bypass, even if its grid styles are enabled', () => {
    const axis = axisAt();
    axis.visible = false;
    axis.minorTicks.count = 10_000;
    expect(
      planAxisGridTicks(axis, createScale(axis, 0, 10)!, { major, minor }),
    ).toEqual({ major: [], minor: [] });
  });
});
describe('clipped grid SVG', () => {
  it.each(['bottom', 'top', 'left', 'right'] as const)(
    'spans the plot frame for %s grids and applies independent major/minor styles',
    (side) => {
      const axis = axisAt(side),
        plan = planAxisGridTicks(axis, createScale(axis, 0, 10)!, {
          major,
          minor,
        });
      const svg = renderAxisGrid(
        axis,
        rect,
        plan,
        { major, minor },
        'clip-layer1',
      );
      expect(svg).toContain('clip-path="url(#clip-layer1)"');
      expect(svg.match(/data-role="major-grid"/g)).toHaveLength(2);
      expect(svg.match(/data-role="minor-grid"/g)).toHaveLength(1);
      expect(svg).toContain(
        'stroke="#123456" stroke-width="0.7" stroke-dasharray="6 4"',
      );
      expect(svg).toContain(
        'stroke="#abcdef" stroke-width="0.3" stroke-dasharray="1 3"',
      );
      expect(svg).toContain(
        axis.dimension === 'x'
          ? 'x1="160" y1="20" x2="160" y2="220"'
          : 'x1="10" y1="120" x2="310" y2="120"',
      );
    },
  );
  it('uses noncentral planned ratios unchanged for reversed scales', () => {
    const axis = axisAt();
    axis.reverse = true;
    axis.majorTicks.generation = { mode: 'increment', step: 2, anchor: 1 };
    const plan = planAxisGridTicks(axis, createScale(axis, 0, 10)!, { major });
    const svg = renderAxisGrid(axis, rect, plan, { major }, 'clip');
    expect(svg).toContain('x1="280" y1="20" x2="280" y2="220"');
    expect(svg).toContain('x1="40" y1="20" x2="40" y2="220"');
  });
  it('defaults absent grids to off and permits minor-only grids independently of major tick marks', () => {
    const axis = axisAt();
    axis.majorTicks.visible = false;
    const plan = planAxisGridTicks(axis, createScale(axis, 0, 10)!, { minor });
    expect(renderAxisGrid(axis, rect, plan, {}, 'clip')).toBe('');
    const svg = renderAxisGrid(axis, rect, plan, { minor }, 'clip');
    expect(svg).not.toContain('data-role="major-grid"');
    expect(svg).toContain('data-role="minor-grid"');
  });
  it('never renders grids for a hidden axis and skips invalid hidden plans', () => {
    const axis = axisAt();
    axis.visible = false;
    const plan: AxisTickPlan = {
      major: Array(10_001).fill({ value: 0, ratio: NaN }),
      minor: [],
    };
    expect(renderAxisGrid(axis, rect, plan, { major, minor }, 'clip')).toBe('');
  });
  it('rejects over-budget and nonfinite external plans before producing SVG', () => {
    const axis = axisAt();
    expect(() =>
      renderAxisGrid(
        axis,
        rect,
        { major: Array(10_001).fill({ value: 0, ratio: 0 }), minor: [] },
        { major },
        'clip',
      ),
    ).toThrow(/10000/);
    expect(() =>
      renderAxisGrid(
        axis,
        rect,
        { major: [{ value: 0, ratio: NaN }], minor: [] },
        { major },
        'clip',
      ),
    ).toThrow(/有限/);
  });
  it('escapes independent styles and the clip reference', () => {
    const axis = axisAt(),
      plan = planAxisGridTicks(axis, createScale(axis, 0, 10)!, { major });
    const svg = renderAxisGrid(
      axis,
      rect,
      plan,
      { major: { ...major, color: '" & <', dash: 'solid' } },
      'clip-&-"',
    );
    expect(svg).toContain('stroke="&quot; &amp; &lt;"');
    expect(svg).toContain('url(#clip-&amp;-&quot;)');
    expect(svg).not.toContain('stroke-dasharray');
  });
});
