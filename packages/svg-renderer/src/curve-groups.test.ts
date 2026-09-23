import { describe, expect, it } from 'vitest';
import { validTemplate as defaultTemplate } from '../../figure-schema/src/schema/fixtures.js';
import { prepareSeriesRows } from './series-rows.js';
import {
  curveStyleAt,
  prepareCurveSubset,
  resolveCurveGroups,
  unlinkCurveGroup,
  validateCurveGroups,
} from './curve-groups.js';
function fixture() {
  const panel = structuredClone(defaultTemplate.panels[0]!);
  const source = panel.plotSlots[0]!;
  panel.plotSlots = ['a', 'b', 'c', 'd'].map((plotSlotId) => ({
    ...structuredClone(source),
    plotSlotId,
  }));
  return panel;
}
describe('curve groups and original-row subsets', () => {
  it('applies synchronized and nested lists without changing source styles; unlink materializes', () => {
    const panel = fixture();
    const group = {
      groupId: 'g',
      name: '组1',
      members: ['a', 'b', 'c', 'd'],
      mode: 'dependent' as const,
      increment: 'nested' as const,
      step: 1,
      colors: ['#ff0000', '#0000ff'],
      lineDashes: ['solid', 'dashed'] as const,
    };
    const configured = {
      ...panel,
      groups: [{ ...group, lineDashes: [...group.lineDashes] }],
    };
    const resolved = resolveCurveGroups(configured);
    expect(
      resolved.plotSlots.map(
        (p) => 'lineStyle' in p && [p.lineStyle?.color, p.lineStyle?.dash],
      ),
    ).toEqual([
      ['#ff0000', 'solid'],
      ['#0000ff', 'solid'],
      ['#ff0000', 'dashed'],
      ['#0000ff', 'dashed'],
    ]);
    expect(panel.plotSlots[0]).toEqual(fixture().plotSlots[0]);
    const independent = unlinkCurveGroup(configured, 'g');
    expect(independent.groups?.[0]?.mode).toBe('independent');
    expect(independent.plotSlots).toEqual(resolved.plotSlots);
  });
  it('rejects dangling, duplicate, cyclic and incompatible memberships', () => {
    const panel = fixture();
    const group = {
      groupId: 'g',
      name: '组',
      members: ['a', 'b'],
      mode: 'dependent' as const,
      increment: 'synchronized' as const,
      step: 1,
    };
    expect(() =>
      validateCurveGroups({
        ...panel,
        groups: [{ ...group, members: ['missing'] }],
      }),
    ).toThrow();
    expect(() =>
      validateCurveGroups({
        ...panel,
        groups: [group, { ...group, groupId: 'h' }],
      }),
    ).toThrow();
    expect(() =>
      validateCurveGroups({
        ...panel,
        groups: [
          { ...group, parentId: 'h' },
          { ...group, groupId: 'h', members: ['c'], parentId: 'g' },
        ],
      }),
    ).toThrow();
    panel.plotSlots[1]!.yAxisId = 'other';
    expect(() => validateCurveGroups({ ...panel, groups: [group] })).toThrow();
  });
  it('subsets use original rows before sorting or sampling and break only when requested', () => {
    const panel = fixture(),
      plot = panel.plotSlots[0]!;
    if (plot.kind !== 'xy') throw new Error('fixture');
    const x = { columnId: 'x', name: 'X', values: [3, 1, 2, 4] },
      y = { columnId: 'y', name: 'Y', values: [1, 2, 3, 4] };
    const rows = prepareSeriesRows(x, y, {
      sort: 'x-ascending',
      sampling: { mode: 'every', step: 2 },
    });
    const subset = prepareCurveSubset(
      {
        ...plot,
        subset: {
          mode: 'length',
          length: 2,
          breakConnection: true,
          colors: ['#ff0000', '#0000ff'],
        },
      },
      { columns: [x, y], bindings: [], diagnostics: [] },
      rows,
    );
    expect(rows.displaySegments.flat().map((r) => r.sourceIndex)).toEqual([
      1, 0,
    ]);
    expect(subset.index(rows.rawRows[2]!)).toBe(1);
    expect(
      subset.segments(rows.segments).map((s) => s.map((r) => r.sourceIndex)),
    ).toEqual([[1], [2], [0], [3]]);
    expect(subset.style(rows.rawRows[2]!).line?.color).toBe('#0000ff');
  });
  it('increments synchronized lists by the requested step independently of list length', () => {
    const style = curveStyleAt(
      {
        colors: ['#ff0000', '#0000ff', '#00ff00'],
        lineDashes: ['solid', 'dashed'],
        markerShapes: ['circle', 'square', 'triangle'],
      },
      2,
      'synchronized',
      2,
    );
    expect(style).toEqual({
      line: { color: '#0000ff', dash: 'solid' },
      marker: { fill: '#0000ff', stroke: '#0000ff', shape: 'square' },
    });
  });
  it('keeps independent children outside ancestor styles while preserving nested local styles on unlink', () => {
    const panel = fixture();
    panel.groups = [
      {
        groupId: 'outer',
        name: '外组',
        members: ['a'],
        mode: 'dependent',
        increment: 'synchronized',
        step: 1,
        colors: ['#ff0000', '#0000ff'],
      },
      {
        groupId: 'child',
        name: '子组',
        members: ['b', 'c'],
        parentId: 'outer',
        mode: 'dependent',
        increment: 'nested',
        step: 1,
        lineDashes: ['solid', 'dashed'],
      },
      {
        groupId: 'independent',
        name: '独立',
        members: ['d'],
        parentId: 'outer',
        mode: 'independent',
        increment: 'synchronized',
        step: 1,
      },
    ];
    const result = resolveCurveGroups(panel);
    const styles = result.plotSlots.map((p) =>
      'lineStyle' in p ? p.lineStyle : undefined,
    );
    expect(styles[1]).toMatchObject({ color: '#0000ff', dash: 'solid' });
    expect(styles[2]).toMatchObject({ color: '#ff0000', dash: 'dashed' });
    expect(styles[3]).toEqual(
      'lineStyle' in panel.plotSlots[3]!
        ? panel.plotSlots[3].lineStyle
        : undefined,
    );
    const unlinked = unlinkCurveGroup(panel, 'child');
    expect(resolveCurveGroups(unlinked).plotSlots).toEqual(result.plotSlots);
  });
  it('group-column subsets preserve first raw occurrence even outside the visible row range', () => {
    const plot = fixture().plotSlots[0]!;
    if (plot.kind !== 'xy') throw new Error('fixture');
    const x = { columnId: 'x', name: 'X', values: [4, 3, 2, 1] },
      y = { columnId: 'y', name: 'Y', values: [1, 2, 3, 4] },
      g = {
        columnId: 'g',
        name: 'Group',
        values: ['first', 'second', 'second', 'first'],
      };
    const rows = prepareSeriesRows(x, y, {
      rowRange: { from: 2, to: 4 },
      sort: 'x-ascending',
      sampling: { mode: 'every', step: 2 },
    });
    const subset = prepareCurveSubset(
      {
        ...plot,
        bindings: { ...plot.bindings, group: 'g-slot' },
        subset: {
          mode: 'group',
          breakConnection: false,
          colors: ['#ff0000', '#0000ff'],
        },
      },
      {
        columns: [x, y, g],
        bindings: [{ dataSlotId: 'g-slot', columnId: 'g', status: 'valid' }],
        diagnostics: [],
      },
      rows,
    );
    expect(
      rows.displaySegments
        .flat()
        .map((r) => [
          r.sourceIndex,
          subset.index(r),
          subset.style(r).line?.color,
        ]),
    ).toEqual([
      [3, 0, '#ff0000'],
      [1, 1, '#0000ff'],
    ]);
    expect(subset.segments(rows.segments)).toBe(rows.segments);
    g.values[1] = null as unknown as string;
    expect(() =>
      prepareCurveSubset(
        {
          ...plot,
          bindings: { ...plot.bindings, group: 'g-slot' },
          subset: { mode: 'group', breakConnection: true },
        },
        {
          columns: [x, y, g],
          bindings: [{ dataSlotId: 'g-slot', columnId: 'g', status: 'valid' }],
          diagnostics: [],
        },
        rows,
      ),
    ).toThrow(/第 2 行/);
  });
  it('rejects style lists and increment steps beyond their declared limits', () => {
    const panel = fixture(),
      base = {
        groupId: 'g',
        name: '组',
        members: ['a'],
        mode: 'dependent' as const,
        increment: 'synchronized' as const,
        step: 1,
      };
    expect(() =>
      resolveCurveGroups({
        ...panel,
        groups: [
          { ...base, colors: Array.from({ length: 65 }, () => '#ff0000') },
        ],
      }),
    ).toThrow();
    expect(() =>
      resolveCurveGroups({ ...panel, groups: [{ ...base, step: 65 }] }),
    ).toThrow();
  });
});
