import { describe, expect, it } from 'vitest';
import { validTemplate as defaultTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { prepareSeriesRows } from './series-rows.js';
import type { PreparedPlot } from './charts/prepared.js';
import {
  createCurveInterpolator,
  prepareCurveTransforms,
  CURVE_GEOMETRY_LIMIT,
} from './curve-transforms.js';
function fixture(values: number[][], xs?: number[][]) {
  const panel = structuredClone(defaultTemplate.panels[0]!);
  const source = panel.plotSlots[0]!;
  const prepared = values.map((ys, i) => {
    const plot = { ...structuredClone(source), plotSlotId: `p${i}` };
    const rows = prepareSeriesRows(
      { columnId: 'x', name: 'X', values: xs?.[i] ?? ys.map((_, j) => j) },
      { columnId: 'y', name: 'Y', values: ys },
    );
    return {
      plot,
      xyRows: rows,
      xValues: rows.rawRows.map((r) => r.x),
      yValues: ys,
      categories: [],
      bars: [],
      boxes: [],
      segments: rows.segments,
      skipped: 0,
      bandIndex: 0,
      bandCount: 1,
    } satisfies PreparedPlot;
  });
  panel.plotSlots = prepared.map((p) => p.plot);
  return {
    panel,
    prepared,
    data: { columns: [], bindings: [], diagnostics: [] },
  };
}
describe('curve transforms', () => {
  it('bounds fill interpolation work even when overlapping source intervals produce no polygons', () => {
    const f = fixture([
      [1, 1],
      [0, 0],
    ]);
    f.prepared[0]!.plot = {
      ...f.prepared[0]!.plot,
      transform: {
        fill: {
          target: 'next',
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    f.prepared[0]!.segments = Array.from({ length: 1500 }, () => [
      { x: 0, y: 1 },
      { x: 512, y: 1 },
    ]);
    f.prepared[1]!.segments = Array.from({ length: 513 }, (_, x) => [
      { x, y: 0 },
    ]);
    expect(() => prepareCurveTransforms(f.panel, f.prepared, f.data)).toThrow(
      /填充插值.*五百万.*上限/,
    );
  });
  it('clips the target grid to each source interval while preserving the correct boundaries', () => {
    const f = fixture(
      [
        [4, 4],
        [0, 1, 2, 3, 4],
      ],
      [
        [1.5, 2.5],
        [0, 1, 2, 3, 4],
      ],
    );
    f.prepared[0]!.plot = {
      ...f.prepared[0]!.plot,
      transform: {
        fill: {
          target: 'next',
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(
      result.fills.map((fill) => fill.points.map((p) => [p.x, p.y])),
    ).toEqual([
      [
        [1.5, 4],
        [2, 4],
        [2, 2],
        [1.5, 1.5],
      ],
      [
        [2, 4],
        [2.5, 4],
        [2.5, 2.5],
        [2, 2],
      ],
    ]);
  });
  it('does not interpolate stacking or fill across an explicitly disconnected subset', () => {
    const f = fixture([
      [1, 1, 10, 10],
      [2, 2, 2, 2],
    ]);
    const first = f.prepared[0]!.plot;
    if (first.kind !== 'xy') throw new Error('fixture');
    f.prepared[0]!.plot = {
      ...first,
      subset: { mode: 'length', length: 2, breakConnection: true },
      transform: {
        fill: {
          target: 'baseline',
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const filled = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(
      filled.fills.map((fill) => fill.points.slice(0, 2).map((p) => p.x)),
    ).toEqual([
      [0, 1],
      [2, 3],
    ]);
    const stacked = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'normal', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    expect(
      stacked.lines.get('p1')?.map((segment) => segment.map((p) => p.x)),
    ).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });
  it('finds zero crossings for the smallest finite positive and negative values', () => {
    const f = fixture([
      [Number.MIN_VALUE, -Number.MIN_VALUE],
      [1, 1],
    ]);
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'percent', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    expect(
      result.lines
        .get('p0')!
        .flat()
        .some((point) => point.x === 0.5),
    ).toBe(true);
    expect(
      result.lines
        .get('p0')!
        .flat()
        .every((point) => Number.isFinite(point.y)),
    ).toBe(true);
  });
  it('interpolates only within continuous intervals and rejects duplicate X ambiguity', () => {
    const f = createCurveInterpolator([
      [
        { x: 0, y: 0 },
        { x: 2, y: 4 },
      ],
      [
        { x: 4, y: 8 },
        { x: 5, y: 10 },
      ],
    ]);
    expect(f(1)).toBe(2);
    expect(f(3)).toBeUndefined();
    expect(f(6)).toBeUndefined();
    expect(() =>
      createCurveInterpolator([
        [
          { x: 0, y: 1 },
          { x: 0, y: 2 },
        ],
      ]),
    ).toThrow(/重复/);
    expect(() =>
      createCurveInterpolator([
        [
          { x: 0, y: 0 },
          { x: 2, y: 4 },
        ],
        [
          { x: 1, y: 2 },
          { x: 3, y: 6 },
        ],
      ]),
    ).toThrow();
  });
  it('offset preserves raw source identity and original prepared values', () => {
    const f = fixture([
      [1, 2],
      [3, 4],
    ]);
    f.prepared[1]!.plot = {
      ...f.prepared[1]!.plot,
      transform: {
        offsetX: { mode: 'constant', value: -0.5 },
        offsetY: { mode: 'increment', value: 2 },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(
      result.prepared[1]!.xyRows?.rawRows.map((r) => [r.sourceIndex, r.x, r.y]),
    ).toEqual([
      [0, -0.5, 5],
      [1, 0.5, 6],
    ]);
    expect(f.prepared[1]!.xyRows?.rawRows[0]?.y).toBe(3);
  });
  it('stacks positive and negative independently and normalizes each sign to 100%', () => {
    const f = fixture([
      [2, -3],
      [6, -1],
    ]);
    const result = prepareCurveTransforms(
      {
        ...f.panel,
        stack: {
          mode: 'percent',
          members: ['p0', 'p1'],
          labels: {
            visible: true,
            color: '#111111',
            fontSizePt: 10,
            format: 'fixed',
          },
        },
      },
      f.prepared,
      f.data,
    );
    expect(result.prepared[0]!.xyRows?.rawRows.map((r) => r.y)).toEqual([
      25, -75,
    ]);
    expect(result.prepared[1]!.xyRows?.rawRows.map((r) => r.y)).toEqual([
      100, -100,
    ]);
    expect(result.totals.map((t) => t.value)).toEqual([8, -4]);
  });
  it('fills crossing curves with separately colored polygons and includes baseline in bounds', () => {
    const f = fixture([[2, -2]]);
    f.prepared[0]!.plot = {
      ...f.prepared[0]!.plot,
      transform: {
        fill: {
          target: 'baseline',
          baseline: 0,
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(result.fills.map((p) => p.color)).toEqual(['#ff0000', '#0000ff']);
    expect(result.fills[0]?.points).toContainEqual({ x: 0.5, y: 0 });
    expect(result.prepared[0]!.yValues).toContain(0);
  });
  it('stacks a common interval even when one curve has no original rows inside it', () => {
    const f = fixture(
      [
        [2, 6],
        [10, 10],
      ],
      [
        [0, 4],
        [1, 3],
      ],
    );
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'normal', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    expect(
      result.lines
        .get('p0')
        ?.flat()
        .map((p) => [p.x, p.y]),
    ).toEqual([
      [1, 3],
      [3, 5],
    ]);
    expect(
      result.lines
        .get('p1')
        ?.flat()
        .map((p) => [p.x, p.y]),
    ).toEqual([
      [1, 13],
      [3, 15],
    ]);
    expect(result.prepared[0]!.xyRows?.selectedRows).toEqual([]);
    expect(result.prepared[0]!.xValues).toEqual(expect.arrayContaining([1, 3]));
  });
  it.each([1e308, 1e-320])(
    'normalizes finite extreme magnitudes %s without overflowing intermediates',
    (value) => {
      const f = fixture([
        [value, value],
        [value, value],
      ]);
      const result = prepareCurveTransforms(
        { ...f.panel, stack: { mode: 'percent', members: ['p0', 'p1'] } },
        f.prepared,
        f.data,
      );
      expect(
        result.prepared.map((p) => p.xyRows!.selectedRows.map((r) => r.y)),
      ).toEqual([
        [50, 50],
        [100, 100],
      ]);
    },
  );
  it('carries the actual source row at shared interpolation knots for outgoing line styles', () => {
    const f = fixture([
      [1, 2, 3],
      [3, 4, 5],
    ]);
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'normal', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    expect(
      result.lines
        .get('p1')
        ?.flat()
        .map((p) => p.sourceIndex),
    ).toEqual([0, 1, 2]);
  });
  it('ignores hidden stack members and preserves every original input coordinate', () => {
    const f = fixture([
      [1, 2],
      [10, 20],
      [3, 4],
    ]);
    f.prepared[1]!.plot.visible = false;
    const original = structuredClone(f.prepared);
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'normal', members: ['p0', 'p1', 'p2'] } },
      f.prepared,
      f.data,
    );
    expect(result.prepared[2]!.xyRows!.selectedRows.map((r) => r.y)).toEqual([
      4, 6,
    ]);
    expect(result.prepared[1]!.xyRows!.selectedRows.map((r) => r.y)).toEqual([
      10, 20,
    ]);
    expect(f.prepared).toEqual(original);
  });
  it('uses both X grids when filling another curve and splits its missing intervals', () => {
    const f = fixture(
      [
        [5, 5],
        [0, 4, 0, 4],
      ],
      [
        [0, 6],
        [1, 2, 4, 5],
      ],
    );
    f.prepared[0]!.plot = {
      ...f.prepared[0]!.plot,
      transform: {
        fill: {
          target: 'next',
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      },
    };
    f.prepared[1]!.segments = [
      f.prepared[1]!.segments[0]!.slice(0, 2),
      f.prepared[1]!.segments[0]!.slice(2),
    ];
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(result.fills.map((p) => p.points.map((v) => [v.x, v.y]))).toEqual([
      [
        [1, 5],
        [2, 5],
        [2, 4],
        [1, 0],
      ],
      [
        [4, 5],
        [5, 5],
        [5, 4],
        [4, 0],
      ],
    ]);
  });
  it('reports a bounded geometry error before a large fill can overflow an argument list', () => {
    const f = fixture([Array.from({ length: 50002 }, () => 1)]);
    f.prepared[0]!.plot = {
      ...f.prepared[0]!.plot,
      transform: {
        fill: {
          target: 'baseline',
          positiveColor: '#ff0000',
          negativeColor: '#0000ff',
          opacity: 0.3,
        },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    expect(() => prepareCurveTransforms(f.panel, f.prepared, f.data)).toThrow(
      /二十万.*上限/,
    );
  });
  it('rejects interpolation above its point limit', () => {
    expect(() =>
      createCurveInterpolator([
        Array.from({ length: CURVE_GEOMETRY_LIMIT + 1 }, (_, x) => ({
          x,
          y: x,
        })),
      ]),
    ).toThrow(/二十万点上限/);
  });
  it('keeps source rows for labels and applies offsets before percentage error endpoints', () => {
    const f = fixture([
      [2, 2],
      [4, 4],
    ]);
    f.prepared[1]!.plot = {
      ...f.prepared[1]!.plot,
      transform: {
        offsetX: { mode: 'constant', value: 0 },
        offsetY: { mode: 'constant', value: 2 },
      },
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'percent', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    const row = result.sourceRows.get('p1')!.rawRows[0]!;
    expect(row.y).toBe(4);
    expect(result.prepared[1]!.xyRows!.rawRows[0]!.y).toBe(100);
    const transform = result.errorTransforms.get('p1')!(row)!;
    expect(transform).toMatchObject({ xOffset: 0, yOffset: 50, yScale: 12.5 });
    expect(transform.mapY(3)).toBeCloseTo(87.5, 12);
    expect(transform.mapY(5)).toBeCloseTo(112.5, 12);
  });
  it('maps error endpoints at tiny percentage values without multiplying by Infinity', () => {
    const f = fixture([
      [1e-320, 1e-320],
      [1e-320, 1e-320],
    ]);
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'percent', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    const transform = result.errorTransforms.get('p1')!(
      f.prepared[1]!.xyRows!.rawRows[0]!,
    )!;
    expect(transform.mapY(1e-320)).toBe(100);
    expect(transform.mapY(0)).toBe(50);
  });
  it('retains the negative stack base when an area crosses through zero', () => {
    const f = fixture([
      [-2, -2],
      [-2, 2],
    ]);
    const plot = f.prepared[1]!.plot;
    if (plot.kind !== 'xy') throw new Error('fixture');
    f.prepared[1]!.plot = {
      kind: 'area',
      plotSlotId: plot.plotSlotId,
      xAxisId: plot.xAxisId,
      yAxisId: plot.yAxisId,
      bindings: { x: plot.bindings.x, y: plot.bindings.y },
      baseline: 0,
      fillStyle: { color: '#ff0000', opacity: 0.3 },
      lineStyle: plot.lineStyle,
      legendEntry: plot.legendEntry,
    };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(
      { ...f.panel, stack: { mode: 'normal', members: ['p0', 'p1'] } },
      f.prepared,
      f.data,
    );
    expect(
      result.fills.filter((p) => p.plotSlotId === 'p1').map((p) => p.points),
    ).toEqual([
      [
        { x: 0, y: -4 },
        { x: 0.5, y: -2 },
        { x: 0.5, y: -2 },
        { x: 0, y: -2 },
      ],
      [
        { x: 0.5, y: 0 },
        { x: 1, y: 2 },
        { x: 1, y: 0 },
        { x: 0.5, y: 0 },
      ],
    ]);
  });
  it('assigns within-group offset indices in the declared member order', () => {
    const f = fixture([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    f.panel.groups = [
      {
        groupId: 'g',
        name: '组',
        members: ['p2', 'p0'],
        mode: 'independent',
        increment: 'synchronized',
        step: 1,
      },
    ];
    for (const index of [0, 2])
      f.prepared[index]!.plot = {
        ...f.prepared[index]!.plot,
        transform: {
          offsetY: { mode: 'increment', value: 10, scope: 'within-group' },
        },
      };
    f.panel.plotSlots = f.prepared.map((p) => p.plot);
    const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(result.offsets.get('p0')?.y).toBe(10);
    expect(result.offsets.get('p2')?.y).toBe(0);
  });
});
