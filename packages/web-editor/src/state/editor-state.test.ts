import { xyPlot } from '../test-utils/xy-plot.js';
import { inferDataBindingSet, parseCsvText } from '@plot-fig/data-binding';
import { describe, expect, it } from 'vitest';
import {
  defaultTemplate,
  loadCsvText,
  rebindEditorData,
  restoreProjectState,
  updatePlotMode,
} from './editor-state.js';
import type { PlotMode } from './editor-state.js';
import { serializeProjectFile } from './project-file.js';

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

    expect(xyPlot(updated, 0).mode).toBe('markers');
    expect(template).toEqual(before);
    expect(xyPlot(template, 0).mode).toBe('line-markers');
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

  it('keeps source text and restores a serialized project immutably', () => {
    const csvText = 'X,Y\n0,1\n1,3\n';
    const template = updatePlotMode(defaultTemplate(), 'line');
    const state = loadCsvText(csvText, 'sample.csv', template, {});
    expect(state.sourceText).toBe(csvText);
    expect(state.status).toBe('ready');
    const serialized = serializeProjectFile(template, state.data!, csvText);
    const before = structuredClone(serialized);

    const restored = restoreProjectState(serialized);

    expect(restored.ok).toBe(true);
    if (!restored.ok) throw new Error('project restore failed');
    expect(restored.template).toEqual(template);
    expect(restored.state.sourceText).toBe(csvText);
    expect(restored.state.plotMode).toBe('line');
    expect(restored.state.svg).toBe(state.svg);
    expect(serialized).toBe(before);
  });

  it('returns an error state without stale SVG for invalid project text', () => {
    const restored = restoreProjectState('{"kind":"bad"}');

    expect(restored.ok).toBe(false);
    if (restored.ok) throw new Error('invalid project unexpectedly restored');
    expect(restored.state.status).toBe('error');
    expect(restored.state.svg).toBeUndefined();
    expect(restored.state.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'PROJECT_INVALID' }),
      ]),
    );
  });
});
