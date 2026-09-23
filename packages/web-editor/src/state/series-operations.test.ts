import { xyPlot } from '../test-utils/xy-plot.js';
import { describe, expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import {
  addSeries,
  duplicateSeries,
  moveSeries,
  removeSeries,
} from './series-operations.js';

function twoSeries() {
  const result = addSeries(defaultTemplate(), {
    'slot-x': 'time',
    'slot-y': 'signal',
  });
  if (!result.ok) throw new Error(result.message);
  return result.value;
}

describe('series operations', () => {
  it('adds an independently bound series using the next palette color', () => {
    const template = defaultTemplate();
    const result = addSeries(template, {
      'slot-x': 'time',
      'slot-y': 'signal',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const added = xyPlot(result.value.template, 1);
    expect(result.value.template.panels[0]!.plotSlots).toHaveLength(2);
    expect(result.value.template.dataSlots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dataSlotId: 'series-2-x', role: 'x' }),
        expect.objectContaining({ dataSlotId: 'series-2-y', role: 'y' }),
      ]),
    );
    expect(added.bindings).toMatchObject({
      x: 'series-2-x',
      y: 'series-2-y',
    });
    expect(result.value.overrides).toMatchObject({
      'series-2-x': 'time',
      'series-2-y': 'signal',
    });
    expect(added.lineStyle?.color).toBe(template.theme.palette[1]);
    expect(added.markerStyle?.fill).toBe(template.theme.palette[1]);
    expect(result.value.selectedPlotSlotId).toBe('series-2');
    expect(template.panels[0]!.plotSlots).toHaveLength(1);
  });

  it('duplicates the selected series without sharing its data slots', () => {
    const template = defaultTemplate();
    xyPlot(template, 0).lineStyle!.dash = 'dashed';

    const result = duplicateSeries(
      template,
      { 'slot-y': 'signal' },
      'series-1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const source = xyPlot(result.value.template, 0),
      copy = xyPlot(result.value.template, 1);
    expect(copy).toMatchObject({
      mode: source!.mode,
      lineStyle: source!.lineStyle,
      markerStyle: source!.markerStyle,
    });
    expect(copy!.bindings.x).not.toBe(source!.bindings.x);
    expect(copy!.bindings.y).not.toBe(source!.bindings.y);
    expect(result.value.overrides['series-2-y']).toBe('signal');
    expect(copy!.legendEntry.text).toBe('Series 2');
  });

  it('allocates an identifier that does not collide with existing objects', () => {
    const template = defaultTemplate();
    template.annotations.push({
      annotationId: 'series-2',
      coordinateSpace: 'page',
      kind: 'text',
      position: { x: 0.5, y: 0.5 },
      text: 'reserved',
      format: 'plain',
    });

    const result = addSeries(template, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.selectedPlotSlotId).toBe('series-3');
  });

  it('preserves shared slots and removes only orphaned slots', () => {
    const value = twoSeries();
    xyPlot(value.template, 1).bindings = {
      x: 'slot-x',
      y: 'slot-y',
    };

    const result = removeSeries(value.template, value.overrides, 'series-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.template.dataSlots.map((slot) => slot.dataSlotId),
    ).toEqual(['slot-x', 'slot-y', 'series-2-x', 'series-2-y']);
    expect(result.value.selectedPlotSlotId).toBe('series-2');
  });

  it('removes orphaned slots and their overrides', () => {
    const value = twoSeries();

    const result = removeSeries(value.template, value.overrides, 'series-2');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.template.dataSlots.map((slot) => slot.dataSlotId),
    ).toEqual(['slot-x', 'slot-y']);
    expect(result.value.overrides).toEqual({
      'slot-x': 'time',
      'slot-y': 'signal',
    });
    expect(result.value.selectedPlotSlotId).toBe('series-1');
  });

  it('rejects deleting the last series', () => {
    expect(removeSeries(defaultTemplate(), {}, 'series-1')).toEqual({
      ok: false,
      message: '图层至少需要保留一条曲线',
    });
  });

  it('moves a series without changing either series contents', () => {
    const value = twoSeries();
    const before = structuredClone(value.template.panels[0]!.plotSlots);

    const result = moveSeries(
      value.template,
      value.overrides,
      'series-2',
      'up',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.template.panels[0]!.plotSlots.map((plot) => plot.plotSlotId),
    ).toEqual(['series-2', 'series-1']);
    expect(result.value.template.panels[0]!.plotSlots[0]).toEqual(before[1]);
    expect(result.value.template.panels[0]!.plotSlots[1]).toEqual(before[0]);
    expect(value.template.panels[0]!.plotSlots).toEqual(before);
  });

  it('rejects missing series and out-of-range movement', () => {
    expect(duplicateSeries(defaultTemplate(), {}, 'missing')).toEqual({
      ok: false,
      message: '未找到曲线 missing',
    });
    expect(moveSeries(defaultTemplate(), {}, 'series-1', 'up')).toEqual({
      ok: false,
      message: '曲线已经位于最前面',
    });
  });
});
