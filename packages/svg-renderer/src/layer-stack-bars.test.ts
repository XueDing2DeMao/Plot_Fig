import { describe, expect, it } from 'vitest';
import { createLayerStack, type LayerStack } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { arrangeBands, preparePlot } from './charts/prepare.js';
import { arrangeLayerStackBars } from './layer-stack-bars.js';
import { renderBars } from './charts/svg-marks.js';
import { createScale } from './scales.js';
import { renderFigureSvg } from './index.js';

function fixture(values: number[][], mode: LayerStack['mode'] = 'cumulative') {
  const panel = chartTemplate('bar').panels[0]!;
  const source = panel.plotSlots[0]!;
  const plots = values.map((value, i) =>
    preparePlot(
      { ...structuredClone(source), plotSlotId: `b${i}` },
      chartData({ category: value.map((_, j) => `C${j}`), value }),
    ),
  );
  panel.plotSlots = plots.map((p) => p.plot);
  panel.layerStack = {
    ...createLayerStack(plots.map((p) => p.plot.plotSlotId)),
    mode,
  };
  return { panel, plots, stack: panel.layerStack };
}
const endpoints = (f: ReturnType<typeof fixture>) =>
  f.plots.map((p) => p.bars.map((b) => [b.start, b.end]));
function svg(f: ReturnType<typeof fixture>, horizontal = false) {
  const cat = {
    ...createScale({ scale: 'linear' }, -0.5, 1.5)!,
    categories: f.plots[0]!.categories,
  };
  const value = createScale({ scale: 'linear' }, -10, 20)!;
  const context = {
    rect: { x: 0, y: 0, width: 200, height: 300 },
    xScale: horizontal ? value : cat,
    yScale: horizontal ? cat : value,
  };
  return f.plots.map((p) => renderBars(p, context)).join('');
}
describe('layer stack bars', () => {
  it('accumulates positive and negative category values independently and shifts errors', () => {
    const f = fixture([
      [2, -3],
      [6, -1],
    ]);
    f.plots[1]!.bars[0]!.error = [5, 7];
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([
      [
        [0, 2],
        [0, -3],
      ],
      [
        [2, 8],
        [-3, -4],
      ],
    ]);
    expect(f.plots[1]!.bars[0]!.error).toEqual([7, 9]);
    expect(f.plots[1]!.yValues).toContain(9);
  });
  it('normalizes each sign and its errors without overflowing extreme finite totals', () => {
    const f = fixture([
      [1e308, -2],
      [1e308, -6],
    ]);
    f.stack.normalizePercent = true;
    f.plots[1]!.bars[1]!.error = [-7, -5];
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([
      [
        [0, 50],
        [0, -25],
      ],
      [
        [50, 100],
        [-25, -100],
      ],
    ]);
    expect(f.plots[1]!.bars[1]!.error).toEqual([
      expect.closeTo(-112.5),
      expect.closeTo(-87.5),
    ]);
  });
  it('sorts cumulative layers separately for each category', () => {
    const f = fixture([
      [2, 9],
      [6, 3],
    ]);
    f.stack.sort = 'ascending';
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([
      [
        [0, 2],
        [3, 12],
      ],
      [
        [2, 8],
        [0, 3],
      ],
    ]);
  });
  it('preserves a previous cumulative sort setting without sorting none-mode bands', () => {
    const cumulative = fixture([[2], [6]]);
    cumulative.stack.sort = 'descending';
    arrangeLayerStackBars(cumulative.panel, cumulative.plots);
    expect(endpoints(cumulative)).toEqual([[[6, 8]], [[0, 6]]]);
    const restored = fixture([[2], [6]], 'none');
    restored.stack.sort = cumulative.stack.sort;
    arrangeLayerStackBars(restored.panel, restored.plots);
    expect(restored.stack.sort).toBe('descending');
    expect(
      restored.plots.map((p) => p.bars[0]!.bandIndex ?? p.bandIndex),
    ).toEqual([0, 1]);
    expect(endpoints(restored)).toEqual([[[0, 2]], [[0, 6]]]);
  });
  it('stacks subgroups independently and leaves hidden members out of totals', () => {
    const f = fixture([[2], [1000], [3], [4]]);
    f.plots[1]!.plot.visible = false;
    f.stack.withinSubgroup = true;
    f.stack.subgroups = [{ groupId: 'a', members: ['b0', 'b1', 'b2'] }];
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([[[0, 2]], [[0, 1000]], [[2, 5]], [[0, 4]]]);
    expect(f.plots[0]!.bandIndex).toBe(0);
    expect(f.plots[2]!.bandIndex).toBe(0);
    expect(f.plots[3]!.bandIndex).toBe(1);
  });
  it('draws incremental bars from largest to smallest independently per category', () => {
    const f = fixture(
      [
        [2, 9],
        [6, 3],
      ],
      'incremental',
    );
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([
      [
        [0, 2],
        [0, 9],
      ],
      [
        [0, 6],
        [0, 3],
      ],
    ]);
    expect(
      f.plots
        .at(-1)!
        .layerStackBarMarks!.map(({ item, bar }) => [
          item.plot.plotSlotId,
          bar.category,
        ]),
    ).toEqual([
      ['b1', 's:C0'],
      ['b0', 's:C0'],
      ['b0', 's:C1'],
      ['b1', 's:C1'],
    ]);
    const output = svg(f);
    expect(output.match(/data-role="bar"/g)).toHaveLength(4);
    expect(output.indexOf('data-stack-member="b1"')).toBeLessThan(
      output.indexOf('data-stack-member="b0"'),
    );
  });
  it('shares the actual category width between equivalent incremental values', () => {
    const f = fixture([[3], [3], [8]], 'incremental');
    f.stack.showOverlapped = true;
    arrangeLayerStackBars(f.panel, f.plots);
    expect(f.plots[0]!.bars[0]!.bandSlice).toEqual({ index: 0, count: 2 });
    expect(f.plots[1]!.bars[0]!.bandSlice).toEqual({ index: 1, count: 2 });
    const widths = [
      ...svg(f).matchAll(/data-role="bar"[^>]*? width="([^"]+)"/g),
    ].map((m) => Number(m[1]));
    expect(widths).toEqual([72, 36, 36]);
  });
  it('returns controlled legacy stacks to grouped original values in none mode', () => {
    const f = fixture([[2], [6]], 'none');
    for (const p of f.plots)
      if (p.plot.kind === 'bar') p.plot.layout = 'stacked';
    expect(arrangeBands(f.plots, f.panel)).toEqual([]);
    expect(endpoints(f)).toEqual([[[0, 2]], [[0, 6]]]);
    expect(f.plots.map((p) => p.bandIndex)).toEqual([0, 1]);
    expect(f.plots.map((p) => p.bandCount)).toEqual([2, 2]);
  });
  it('does not repeat legacy cumulative or percentage transforms for controlled bars', () => {
    const f = fixture([[2], [6]]);
    for (const p of f.plots)
      if (p.plot.kind === 'bar') {
        p.plot.layout = 'stacked';
        p.plot.options = { baseline: 0, missing: 'gap', percentage: true };
      }
    expect(arrangeBands(f.plots, f.panel)).toEqual([]);
    expect(endpoints(f)).toEqual([[[0, 2]], [[2, 8]]]);
  });
  it('keeps the legacy stack of nonmembers and uses a separate member band', () => {
    const f = fixture([[2], [6], [3], [4]]);
    f.stack.members = ['b0', 'b1'];
    for (const p of f.plots)
      if (p.plot.kind === 'bar') p.plot.layout = 'stacked';
    expect(arrangeBands(f.plots, f.panel)).toEqual([]);
    expect(endpoints(f)).toEqual([[[0, 2]], [[2, 8]], [[0, 3]], [[3, 7]]]);
    expect(f.plots.map((p) => p.bandIndex)).toEqual([0, 0, 1, 1]);
  });
  it('supports repeated relative constants and absolute constants on the value axis', () => {
    const relative = fixture([[2], [2], [2], [2], [2]], 'constant');
    relative.stack.constant.values = [0, 10];
    arrangeLayerStackBars(relative.panel, relative.plots);
    expect(relative.plots.map((p) => p.bars[0]!.start)).toEqual([
      0, 0, 10, 10, 20,
    ]);
    const absolute = fixture([[2], [2], [2]], 'constant');
    absolute.stack.constant = { values: [10, 20], absolute: true };
    arrangeLayerStackBars(absolute.panel, absolute.plots);
    expect(absolute.plots.map((p) => p.bars[0]!.start)).toEqual([10, 20, 10]);
  });
  it('uses adjacent auto spans and shared offsets between subgroups', () => {
    const f = fixture([[10], [20], [5]], 'auto');
    f.stack.auto.gap = 0.1;
    arrangeLayerStackBars(f.panel, f.plots);
    expect(f.plots.map((p) => p.bars[0]!.start)).toEqual([0, 12, 34]);
    const grouped = fixture([[10], [20], [5]], 'auto');
    grouped.stack.auto.gap = 0.1;
    grouped.stack.betweenSubgroups = true;
    grouped.stack.subgroups = [{ groupId: 'a', members: ['b0', 'b1'] }];
    arrangeLayerStackBars(grouped.panel, grouped.plots);
    expect(grouped.plots.map((p) => p.bars[0]!.start)).toEqual([0, 0, 22]);
  });
  it('applies individual horizontal multipliers and offsets to marks, errors and range', () => {
    const f = fixture([[2], [6]], 'individual');
    for (const p of f.plots)
      if (p.plot.kind === 'bar') {
        p.plot.orientation = 'horizontal';
        p.xValues = p.yValues;
        p.yValues = [];
      }
    f.stack.individual = {
      x: true,
      y: false,
      values: [
        {
          plotSlotId: 'b1',
          xOffset: 10,
          xMultiplier: -2,
          yOffset: 0,
          yMultiplier: 1,
        },
      ],
    };
    f.plots[1]!.bars[0]!.error = [5, 7];
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)[1]).toEqual([[10, -2]]);
    expect(f.plots[1]!.bars[0]!.error).toEqual([-4, 0]);
    expect(f.plots[1]!.xValues).toEqual(expect.arrayContaining([-4, 10]));
    expect(svg(f, true)).toContain('data-role="bar"');
  });
  it('renders signed total labels and connectors between adjacent category stack edges', () => {
    const f = fixture([
      [2, 4],
      [6, -1],
    ]);
    f.stack.connectLines = true;
    f.stack.totalLabels.visible = true;
    arrangeLayerStackBars(f.panel, f.plots);
    const output = svg(f);
    expect(output.match(/data-role="bar-stack-total"/g)).toHaveLength(3);
    expect(output).toContain('>8</text>');
    expect(output).toContain('>-1</text>');
    expect(output.match(/data-role="bar-stack-connector"/g)).toHaveLength(2);
    expect(output).toContain('x1="86"');
    expect(output).toContain('x2="114"');
  });
  it('ignores options disabled for the active mode', () => {
    const f = fixture([[2], [6]], 'none');
    f.stack.normalizePercent =
      f.stack.showOverlapped =
      f.stack.connectLines =
      f.stack.totalLabels.visible =
        true;
    f.stack.withinSubgroup = f.stack.betweenSubgroups = true;
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([[[0, 2]], [[0, 6]]]);
    expect(svg(f)).not.toContain('bar-stack-total');
  });
  it('keeps zero percent totals at zero and suppresses meaningless 100 percent labels', () => {
    const f = fixture([[0], [0]]);
    f.stack.normalizePercent = f.stack.totalLabels.visible = true;
    arrangeLayerStackBars(f.panel, f.plots);
    expect(endpoints(f)).toEqual([[[0, 0]], [[0, 0]]]);
    expect(svg(f)).not.toContain('bar-stack-total');
  });
  it('anchors labels at each subdivided incremental bar center', () => {
    const f = fixture([[3], [3]], 'incremental');
    f.stack.showOverlapped = true;
    for (const p of f.plots)
      if (p.plot.kind === 'bar')
        p.plot.dataLabels = { visible: true, source: 'y', position: 'center' };
    arrangeLayerStackBars(f.panel, f.plots);
    const categoryScale = {
      ...createScale({ scale: 'linear' }, -0.5, 1.5)!,
      categories: f.plots[0]!.categories,
    };
    const context = {
      rect: { x: 0, y: 0, width: 200, height: 300 },
      xScale: categoryScale,
      yScale: createScale({ scale: 'linear' }, -10, 20)!,
    };
    const output = f.plots
      .map((p) =>
        renderBars(p, context, {
          data: chartData({ category: ['C0'], value: [3] }),
          diagnostics: [],
        }),
      )
      .join('');
    const positions = [
      ...output.matchAll(/transform="translate\(([^ ]+) ([^)]+)\)/g),
    ].map((m) => [Number(m[1]), Number(m[2])]);
    expect(positions).toEqual([
      [expect.closeTo(32), 170],
      [expect.closeTo(68), 170],
    ]);
    expect(output.lastIndexOf('data-role="bar"')).toBeLessThan(
      output.indexOf('data-role="data-labels"'),
    );
  });
  it('keeps labels from earlier managed members when the final draw host has no labels', () => {
    const f = fixture([[2], [6]], 'incremental');
    if (f.plots[0]!.plot.kind === 'bar')
      f.plots[0]!.plot.dataLabels = {
        visible: true,
        source: 'y',
        position: 'center',
      };
    arrangeLayerStackBars(f.panel, f.plots);
    const context = {
      rect: { x: 0, y: 0, width: 200, height: 300 },
      xScale: {
        ...createScale({ scale: 'linear' }, -0.5, 1.5)!,
        categories: f.plots[0]!.categories,
      },
      yScale: createScale({ scale: 'linear' }, -10, 20)!,
    };
    const output = f.plots
      .map((p) =>
        renderBars(p, context, {
          data: chartData({ category: ['C0'], value: [2] }),
          diagnostics: [],
        }),
      )
      .join('');
    expect(output).toContain('data-role="data-label"');
    expect(output.lastIndexOf('data-role="bar"')).toBeLessThan(
      output.indexOf('data-role="data-labels"'),
    );
  });
  it('renders horizontal cumulative endpoints and signed total label positions', () => {
    const f = fixture([
      [2, -3],
      [6, -1],
    ]);
    for (const p of f.plots)
      if (p.plot.kind === 'bar') p.plot.orientation = 'horizontal';
    f.stack.totalLabels.visible = true;
    arrangeLayerStackBars(f.panel, f.plots);
    const output = svg(f, true);
    expect(f.plots[1]!.xValues).toEqual(expect.arrayContaining([8, -4]));
    expect(output).toMatch(
      /data-role="bar-stack-total" x="124"[^>]*text-anchor="start"[^>]*>8<\/text>/,
    );
    expect(output).toMatch(
      /data-role="bar-stack-total" x="36"[^>]*text-anchor="end"[^>]*>-4<\/text>/,
    );
  });
  it('connects adjacent displayed categories after an axis category reorder', () => {
    const f = fixture([
      [2, 4, 6],
      [3, 5, 7],
    ]);
    f.stack.connectLines = true;
    arrangeLayerStackBars(f.panel, f.plots);
    const categories = [
      f.plots[0]!.categories[0]!,
      f.plots[0]!.categories[2]!,
      f.plots[0]!.categories[1]!,
    ];
    const context = {
      rect: { x: 0, y: 0, width: 300, height: 300 },
      xScale: { ...createScale({ scale: 'linear' }, -0.5, 2.5)!, categories },
      yScale: createScale({ scale: 'linear' }, -10, 20)!,
    };
    const output = f.plots.map((p) => renderBars(p, context)).join('');
    const edges = [
      ...output.matchAll(
        /data-role="bar-stack-connector" x1="([^"]+)"[^>]*x2="([^"]+)"/g,
      ),
    ].map((m) => [Number(m[1]), Number(m[2])]);
    expect(edges).toEqual([
      [86, 114],
      [186, 214],
      [86, 114],
      [186, 214],
    ]);
  });
  it('exports the new cumulative bar path through full panel preparation without legacy stacking twice', () => {
    const template = chartTemplate('bar');
    const f = fixture([
      [2, -3],
      [6, -1],
    ]);
    for (const [i, p] of f.plots.entries())
      if (p.plot.kind === 'bar') {
        p.plot.layout = 'stacked';
        p.plot.stackGroup = 'legacy';
        p.plot.bindings.value = `slot-value${i}`;
      }
    f.stack.totalLabels.visible = true;
    template.panels = [f.panel];
    const valueSlot = template.dataSlots.find((s) => s.role === 'value')!;
    template.dataSlots = [
      template.dataSlots.find((s) => s.role === 'category')!,
      ...f.plots.map((_, i) => ({
        ...valueSlot,
        dataSlotId: `slot-value${i}`,
      })),
    ];
    const output = renderFigureSvg(
      template,
      chartData({ category: ['C0', 'C1'], value0: [2, -3], value1: [6, -1] }),
    );
    expect(output.ok, JSON.stringify(output.diagnostics)).toBe(true);
    expect(output.svg.match(/data-role="bar"/g)).toHaveLength(4);
    expect(output.svg).toContain('>8</text>');
    expect(output.svg).toContain('>-4</text>');
  });
});
