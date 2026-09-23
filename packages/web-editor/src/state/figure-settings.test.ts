import { xyPlot } from '../test-utils/xy-plot.js';
import { describe, expect, it } from 'vitest';
import {
  defaultTemplate,
  loadCsvText,
  restoreProjectState,
} from './editor-state.js';
import { serializeProjectFile } from './project-file.js';
import { readFigureSettings, updateFigureSettings } from './figure-settings.js';
import { addSeries } from './series-operations.js';

describe('figure properties', () => {
  it('updates properties immutably and round trips through a project', () => {
    const template = defaultTemplate();
    const original = structuredClone(template);
    const settings = readFigureSettings(template, 'series-1');
    settings.x = { title: 'Time (s)', min: '-1', max: '3' };
    settings.y.title = 'Load (N)';
    settings.line.color = '#111111';
    settings.line.widthPt = 2;
    settings.line.dash = 'dashed';
    settings.marker.shape = 'diamond';
    settings.marker.sizePt = 7;
    settings.palette = ['#111111', '#4DBBD5', '#00A087'];
    const next = updateFigureSettings(template, 'series-1', settings);
    expect(next.theme.palette).toEqual(settings.palette);
    expect(template).toEqual(original);
    expect(next.panels[0]!.axes[0]).toMatchObject({
      title: { text: 'Time (s)', format: 'plain' },
      range: { mode: 'fixed', min: -1, max: 3 },
    });
    const state = loadCsvText('X,Y\n0,1\n1,2', 'xy.csv', next);
    expect(state.status).toBe('ready');
    expect(state.svg).toContain('Time (s)');
    expect(state.svg).toContain('stroke="#111111"');
    expect(xyPlot(next, 0).bindings).toEqual(xyPlot(original, 0).bindings);
    const restored = restoreProjectState(
      serializeProjectFile(next, state.data!, state.sourceText!),
    );
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect(readFigureSettings(restored.template, 'series-1')).toEqual({
        ...settings,
        plot: restored.template.panels[0]!.plotSlots[0]!,
      });
      expect(restored.state.svg).toBe(state.svg);
    }
  });

  it.each([
    ['0', ''],
    ['2', '1'],
    ['1', '1'],
    ['NaN', '2'],
    ['0', 'Infinity'],
  ])('rejects invalid range %s to %s', (min, max) => {
    const template = defaultTemplate();
    const settings = readFigureSettings(template, 'series-1');
    settings.x = { title: '', min, max };
    expect(() => updateFigureSettings(template, 'series-1', settings)).toThrow(
      /X 轴/,
    );
  });

  it('restores auto range and removes empty titles', () => {
    const template = defaultTemplate();
    const settings = readFigureSettings(template, 'series-1');
    settings.x = { title: 'Time', min: '0', max: '10' };
    const fixed = updateFigureSettings(template, 'series-1', settings);
    settings.x = { title: '', min: '', max: '' };
    const auto = updateFigureSettings(fixed, 'series-1', settings);
    expect(auto.panels[0]!.axes[0]!.range).toEqual({ mode: 'auto' });
    expect(auto.panels[0]!.axes[0]!.title).toBeUndefined();
  });

  it('rejects nonpositive log ranges and invalid widths', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes[0]!.scale = 'log10';
    const settings = readFigureSettings(template, 'series-1');
    settings.x = { title: '', min: '0', max: '10' };
    expect(() => updateFigureSettings(template, 'series-1', settings)).toThrow(
      /正数/,
    );
    settings.x = { title: '', min: '1', max: '10' };
    settings.line.widthPt = -1;
    expect(() =>
      updateFigureSettings(template, 'series-1', settings),
    ).toThrow();
  });

  it('updates only the selected series style', () => {
    const added = addSeries(defaultTemplate(), {});
    if (!added.ok) throw new Error(added.message);
    const settings = readFigureSettings(added.value.template, 'series-2');
    settings.line.color = '#ff0000';

    const updated = updateFigureSettings(
      added.value.template,
      'series-2',
      settings,
    );

    expect(xyPlot(updated, 0).lineStyle!.color).not.toBe('#ff0000');
    expect(xyPlot(updated, 1).lineStyle!.color).toBe('#ff0000');
  });
});
