import { describe, expect, it } from 'vitest';
import type { CurveOffset } from '@plot-fig/figure-schema';
import type { PreparedPlot } from './charts/prepared.js';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { prepareSeriesRows } from './series-rows.js';
import { prepareCurveTransforms } from './curve-transforms.js';

function fixture(values: number[][], scope?: CurveOffset['scope']) {
  const panel = structuredClone(validTemplate.panels[0]!);
  const source = panel.plotSlots[0]!;
  const prepared: PreparedPlot[] = values.map((ys, index) => {
    const plot = {
      ...structuredClone(source),
      plotSlotId: `p${index}`,
      transform: { offsetY: { mode: 'auto' as const, gap: 0.1, scope } },
    };
    const rows = prepareSeriesRows(
      { columnId: 'x', name: 'X', values: ys.map((_, x) => x) },
      { columnId: 'y', name: 'Y', values: ys },
    );
    return {
      plot,
      xyRows: rows,
      xValues: rows.rawRows.map((row) => row.x),
      yValues: ys,
      categories: [],
      bars: [],
      boxes: [],
      segments: rows.segments,
      skipped: 0,
      bandIndex: 0,
      bandCount: 1,
    };
  });
  panel.plotSlots = prepared.map((p) => p.plot);
  return {
    panel,
    prepared,
    data: { columns: [], bindings: [], diagnostics: [] },
  };
}

function offsets(f: ReturnType<typeof fixture>) {
  const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
  return f.prepared.map((p) => result.offsets.get(p.plot.plotSlotId)?.y);
}

describe('automatic curve offsets', () => {
  it('accumulates each preceding span plus a gap based on the two adjacent spans', () => {
    const f = fixture([
      [100, 110],
      [-10, 10],
      [500, 505],
    ]);
    const before = structuredClone(f.prepared);
    expect(offsets(f)).toEqual([0, 12, 34]);
    expect(f.prepared).toEqual(before);
  });

  it('uses the selected axis range independently for automatic X and Y offsets', () => {
    const f = fixture([
      [0, 10],
      [0, 20],
      [0, 5],
    ]);
    for (const [index, item] of f.prepared.entries()) {
      if (item.plot.kind !== 'xy') throw new Error('XY expected');
      item.plot.transform!.offsetX = { mode: 'auto', gap: 0.1 };
      item.xValues = [0, [2, 6, 4][index]!];
    }
    const result = prepareCurveTransforms(f.panel, f.prepared, f.data);
    expect(result.offsets.get('p0')).toEqual({ x: 0, y: 0 });
    expect(result.offsets.get('p1')).toEqual({ x: 2.6, y: 12 });
    expect(result.offsets.get('p2')?.x).toBeCloseTo(9.2);
    expect(result.offsets.get('p2')?.y).toBe(34);
  });

  it('follows declared within-group order and skips hidden curves', () => {
    const f = fixture(
      [
        [0, 10],
        [0, 10000],
        [0, 5],
        [0, 20],
      ],
      'within-group',
    );
    f.panel.groups = [
      {
        groupId: 'g',
        name: '组',
        members: ['p2', 'p1', 'p0', 'p3'],
        mode: 'independent',
        increment: 'synchronized',
        step: 1,
      },
    ];
    f.prepared[1]!.plot.visible = false;
    expect(offsets(f)).toEqual([6, undefined, 0, 18]);
  });

  it('uses the visible envelope of each top-level group for offsets between groups', () => {
    const f = fixture(
      [
        [0, 10],
        [100, 110],
        [0, 20],
        [40, 60],
        [1000, 1100],
        [-5, 0],
      ],
      'between-groups',
    );
    const group = {
      name: '组',
      mode: 'independent' as const,
      increment: 'synchronized' as const,
      step: 1,
    };
    f.panel.groups = [
      { ...group, groupId: 'a', members: ['p0'] },
      { ...group, groupId: 'a-child', parentId: 'a', members: ['p1'] },
      { ...group, groupId: 'b', members: ['p2', 'p3', 'p4'] },
    ];
    f.prepared[4]!.plot.visible = false;
    expect(offsets(f)).toEqual([0, 0, 121, 121, undefined, 187]);
  });

  it('keeps zero spans at zero without inventing a data-unit fallback', () => {
    const f = fixture([
      [5, 5],
      [5, 5],
      [0, 10],
      [0, 0],
    ]);
    expect(offsets(f)).toEqual([0, 0, 1, 12]);
  });

  it('recomputes ranges when the prepared input changes between render calls', () => {
    const f = fixture([
      [0, 10],
      [0, 20],
    ]);
    expect(offsets(f)).toEqual([0, 12]);
    f.prepared[0]!.yValues = [0, 30];
    expect(offsets(f)).toEqual([0, 33]);
  });
});
