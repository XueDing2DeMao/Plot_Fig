import { inferDataBindingSet, parseCsvText } from '@plot-fig/data-binding';
import { describe, expect, it } from 'vitest';
import {
  defaultTemplate,
  rebindEditorData,
  updatePlotMode,
} from './editor-state.js';
import type { PlotMode } from './editor-state.js';

function sourceData() {
  const parsed = parseCsvText(
    'X,Y,Time,Signal,Group\n0,1,10,7,A\n1,2,20,5,B',
    'sample.csv',
  );
  if (!parsed.ok) throw new Error('fixture must parse');
  return inferDataBindingSet(parsed.rows, 'sample.csv');
}

describe('editor rebinding', () => {
  it('updates only the first PlotSlot mode without mutating the template', () => {
    const template = defaultTemplate();
    const before = structuredClone(template);

    const updated = updatePlotMode(template, 'markers');

    expect(updated.panels[0]?.plotSlots[0]?.mode).toBe('markers');
    expect(template).toEqual(before);
    expect(template.panels[0]?.plotSlots[0]?.mode).toBe('line-markers');
  });

  it.each<PlotMode>(['markers', 'line', 'line-markers'])(
    'includes %s in the derived editor state',
    (plotMode) => {
      const template = updatePlotMode(defaultTemplate(), plotMode);
      const state = rebindEditorData(template, sourceData(), {});

      expect(state.plotMode).toBe(plotMode);
    },
  );

  it('keeps the selected mode and overrides together during rebinding', () => {
    const template = updatePlotMode(defaultTemplate(), 'line');
    const state = rebindEditorData(template, sourceData(), {
      'slot-x': 'time',
      'slot-y': 'signal',
    });

    expect(state.plotMode).toBe('line');
    expect(state.overrides).toEqual({
      'slot-x': 'time',
      'slot-y': 'signal',
    });
  });

  it('applies the complete override map without mutating inputs', () => {
    const template = defaultTemplate();
    const data = sourceData();
    const beforeTemplate = structuredClone(template);
    const beforeData = structuredClone(data);

    const state = rebindEditorData(template, data, {
      'slot-x': 'time',
      'slot-y': 'signal',
    });

    expect(state.status).toBe('ready');
    expect(state.overrides).toEqual({
      'slot-x': 'time',
      'slot-y': 'signal',
    });
    expect(state.data?.bindings).toEqual([
      { dataSlotId: 'slot-x', columnId: 'time', status: 'valid' },
      { dataSlotId: 'slot-y', columnId: 'signal', status: 'valid' },
    ]);
    expect(template).toEqual(beforeTemplate);
    expect(data).toEqual(beforeData);
  });

  it('clears the SVG for an incompatible override and recovers cleanly', () => {
    const template = defaultTemplate();
    const invalid = rebindEditorData(template, sourceData(), {
      'slot-y': 'group',
    });

    expect(invalid.status).toBe('error');
    expect(invalid.svg).toBeUndefined();
    expect(invalid.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_TYPE_CONFLICT' }),
      ]),
    );

    const recovered = rebindEditorData(template, invalid.data!, {
      'slot-y': 'signal',
    });

    expect(recovered.status).toBe('ready');
    expect(recovered.svg).toContain('data-role="figure"');
    expect(recovered.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'COLUMN_TYPE_CONFLICT' }),
      ]),
    );
  });
});
