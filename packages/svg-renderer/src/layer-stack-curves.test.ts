import { describe, expect, it } from 'vitest';
import { createLayerStack } from '@plot-fig/figure-schema';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { prepareSeriesRows } from './series-rows.js';
import type { PreparedPlot } from './charts/prepared.js';
import {
  materializeLayerStackOffsets,
  prepareLayerStackTransforms,
} from './layer-stack-curves.js';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';

function fixture(values = Array.from({ length: 6 }, () => [1, 3])) {
  const panel = structuredClone(validTemplate.panels[0]!);
  const source = panel.plotSlots[0]!;
  const prepared: PreparedPlot[] = values.map((ys, i) => {
    const plot = { ...structuredClone(source), plotSlotId: `p${i}` };
    const rows = prepareSeriesRows(
      { columnId: 'x', name: 'X', values: ys.map((_, x) => x + 1) },
      { columnId: 'y', name: 'Y', values: ys },
    );
    return {
      plot,
      xyRows: rows,
      segments: rows.segments,
      xValues: rows.rawRows.map((r) => r.x),
      yValues: ys,
      categories: [],
      bars: [],
      boxes: [],
      skipped: 0,
      bandIndex: 0,
      bandCount: 1,
    };
  });
  panel.plotSlots = prepared.map((p) => p.plot);
  panel.layerStack = createLayerStack(panel.plotSlots.map((p) => p.plotSlotId));
  const data = { columns: [], bindings: [], diagnostics: [] };
  return { panel, prepared, data, stack: panel.layerStack };
}
function run(f: ReturnType<typeof fixture>) {
  return prepareLayerStackTransforms(f.panel, f.prepared, f.data);
}
describe('Origin layer curve stacking', () => {
  it('shares the geometry budget across cumulative subgroups', () => {
    const f = fixture(
      Array.from({ length: 4 }, () => Array.from({ length: 50_001 }, () => 1)),
    );
    f.stack.mode = 'cumulative';
    f.stack.withinSubgroup = true;
    f.stack.subgroups = [
      { groupId: 'a', members: ['p0', 'p1'] },
      { groupId: 'b', members: ['p2', 'p3'] },
    ];
    expect(() => run(f)).toThrow(/二十万/);
  });
  it('preserves legacy metadata offsets when converting to individual values', () => {
    const panel = chartTemplate('xy').panels[0]!;
    const plot = panel.plotSlots[0]!;
    if (plot.kind !== 'xy') throw new Error('fixture');
    plot.transform = { offsetY: { mode: 'metadata', metadata: 'name' } };
    const data = chartData({ x: [1, 2], y: [3, 4] });
    data.columns.find((c) => c.columnId === 'y')!.name = '25';
    expect(materializeLayerStackOffsets(panel, data)[0]!.yOffset).toBe(25);
    expect(() => materializeLayerStackOffsets(panel)).toThrow(/原始数据/);
  });
  it('repeats incremental constants and applies absolute values to the first curve too', () => {
    const f = fixture();
    f.stack.mode = 'constant';
    f.stack.constant.values = [0, 10];
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      1, 1, 11, 11, 21, 21,
    ]);
    f.stack.constant.absolute = true;
    f.stack.constant.values = [5, -5];
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      6, -4, 6, -4, 6, -4,
    ]);
    expect(f.prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      1, 1, 1, 1, 1, 1,
    ]);
  });
  it('keeps subgroups together and skips hidden curves', () => {
    const f = fixture();
    f.stack.mode = 'constant';
    f.stack.constant.values = [10];
    f.stack.betweenSubgroups = true;
    f.stack.subgroups = [
      { groupId: 'a', members: ['p0', 'p1'] },
      { groupId: 'b', members: ['p2', 'p3'] },
    ];
    f.prepared[4]!.plot.visible = false;
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      1, 1, 11, 11, 1, 21,
    ]);
  });
  it('accumulates independently within subgroups and normalizes each stack', () => {
    const f = fixture([
      [1, 2],
      [3, 6],
      [2, 4],
      [6, 12],
    ]);
    f.stack.mode = 'cumulative';
    f.stack.withinSubgroup = true;
    f.stack.subgroups = [
      { groupId: 'a', members: ['p0', 'p1'] },
      { groupId: 'b', members: ['p2', 'p3'] },
    ];
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      1, 4, 2, 8,
    ]);
    f.stack.normalizePercent = true;
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      25, 100, 25, 100,
    ]);
  });
  it('preserves log-axis displayed proportions and applies individual X and Y multipliers to error endpoints', () => {
    const f = fixture([
      [1, 10],
      [1, 100],
    ]);
    f.stack.mode = 'auto';
    f.stack.auto = { gap: 0.1, preserveScale: true };
    f.panel.axes.find((a) => a.axisId === f.prepared[0]!.plot.yAxisId)!.scale =
      'log10';
    const result = run(f);
    expect(result.prepared[1]!.segments[0]![0]!.y).toBeCloseTo(10 ** 1.2);
    expect(
      result.prepared[1]!.segments[0]![1]!.y /
        result.prepared[1]!.segments[0]![0]!.y,
    ).toBeCloseTo(100);
    f.stack.mode = 'individual';
    f.stack.individual = {
      x: true,
      y: true,
      values: [
        {
          plotSlotId: 'p1',
          xOffset: 3,
          yOffset: 4,
          xMultiplier: 2,
          yMultiplier: -2,
        },
      ],
    };
    const transformed = run(f);
    expect(transformed.prepared[1]!.segments[0]![0]).toMatchObject({
      x: 5,
      y: 2,
    });
    const error = transformed.errorTransforms.get('p1')!(
      f.prepared[1]!.xyRows!.rawRows[0]!,
    )!;
    expect(error.mapX!(2)).toBe(7);
    expect(error.mapY(2)).toBe(0);
  });
  it('moves custom baselines and drop targets only with the relative option', () => {
    const f = fixture([
      [2, 4],
      [2, 4],
    ]);
    const p = f.prepared[1]!.plot;
    if (p.kind !== 'xy') throw new Error('fixture');
    p.transform = {
      fill: {
        target: 'baseline',
        baseline: 1,
        positiveColor: '#ff0000',
        negativeColor: '#0000ff',
        opacity: 0.5,
      },
    };
    p.dropLines = { vertical: { target: { mode: 'value', value: 1 } } };
    f.stack.mode = 'constant';
    f.stack.constant.values = [10];
    const fixed = run(f);
    expect(
      fixed.fills.find((g) => g.plotSlotId === 'p1')!.points.at(-1)!.y,
    ).toBe(1);
    f.stack.relativeAdditionalLine = true;
    const moved = run(f);
    expect(
      moved.fills.find((g) => g.plotSlotId === 'p1')!.points.at(-1)!.y,
    ).toBe(11);
    expect(moved.prepared[1]!.plot).toMatchObject({
      dropLines: { vertical: { target: { value: 11 } } },
    });
  });
  it('does not double apply legacy offsets or change nonmembers', () => {
    const f = fixture([
      [1, 3],
      [1, 3],
      [1, 3],
    ]);
    f.prepared.forEach((p) => {
      if (p.plot.kind === 'xy')
        p.plot.transform = { offsetY: { mode: 'constant', value: 100 } };
    });
    f.stack.members = ['p0', 'p1'];
    f.stack.mode = 'constant';
    f.stack.constant.values = [10];
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      1, 11, 101,
    ]);
    f.stack.mode = 'none';
    expect(run(f).prepared.map((p) => p.segments[0]![0]!.y)).toEqual([
      1, 1, 101,
    ]);
  });
});
