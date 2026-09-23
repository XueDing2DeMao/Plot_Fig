import { xyPlot } from '../test-utils/xy-plot.js';
import { describe, expect, it } from 'vitest';
import {
  defaultTemplate,
  loadCsvText,
  restoreProjectState,
} from './editor-state.js';
import { readFigureSettings, updateFigureSettings } from './figure-settings.js';
import { serializeProjectFile } from './project-file.js';

describe('Origin property categories', () => {
  it('persists empty page and marker fills as SVG none', () => {
    const template = defaultTemplate();
    const settings = readFigureSettings(template, 'series-1');
    settings.details.page.background = 'none';
    settings.marker.fill = 'none';
    const next = updateFigureSettings(template, 'series-1', settings);
    const state = loadCsvText('X,Y\n1,2\n2,4', 'empty-fill.csv', next);
    expect(state.status).toBe('ready');
    expect(state.svg).toContain('data-role="page-background"');
    expect(state.svg).toContain('fill="none"');
    expect(next.page.background).toBe('none');
    expect(xyPlot(next, 0).markerStyle!.fill).toBe('none');
  });
  it('skips nonpositive values on logarithmic axes instead of drawing at zero', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes[0]!.scale = 'log10';
    const state = loadCsvText('X,Y\n-1,1\n0,2\n1,3\n10,4', 'log.csv', template);
    expect(state.svg?.match(/data-role="marker"/g)).toHaveLength(2);
    expect(state.diagnostics.some((item) => item.severity === 'warning')).toBe(
      true,
    );
  });

  it('bounds minor tick counts before rendering', () => {
    const template = defaultTemplate();
    const settings = readFigureSettings(template, 'series-1');
    settings.details.x.minorTicks.count = 1000000;
    expect(() => updateFigureSettings(template, 'series-1', settings)).toThrow(
      /次刻度/,
    );
  });
  it('persists page, layer, curve and axis settings and renders them', () => {
    const template = defaultTemplate();
    const settings = readFigureSettings(template, 'series-1');
    settings.details.page.background = '#fafafa';
    settings.details.page.size.width.value = 120;
    settings.details.frame.width = 0.6;
    settings.details.legend.text = '载荷曲线';
    settings.details.legend.visible = true;
    settings.details.x.scale = 'log10';
    settings.details.x.tickLabels.notation = 'fixed';
    settings.details.x.tickLabels.precision = 2;
    settings.details.x.titleFont.sizePt = 16;
    settings.x = { title: '时间', min: '1', max: '100' };
    const next = updateFigureSettings(template, 'series-1', settings);
    const state = loadCsvText('X,Y\n1,2\n10,4\n100,8', 'origin.csv', next);
    expect(state.status).toBe('ready');
    expect(state.svg).toContain('120mm');
    expect(state.svg).toContain('fill="#fafafa"');
    expect(state.svg).toContain('载荷曲线');
    expect(state.svg).toContain('font-size="16"');
    expect(state.svg).toContain('100.00');
    expect(template.page.background).toBe('#ffffff');
    const restored = restoreProjectState(
      serializeProjectFile(next, state.data!, state.sourceText!),
    );
    expect(restored.ok).toBe(true);
    if (restored.ok)
      expect(readFigureSettings(restored.template, 'series-1')).toEqual({
        ...settings,
        plot: restored.template.panels[0]!.plotSlots[0]!,
      });
  });

  it('rejects off-page frames and invalid tick precision', () => {
    const template = defaultTemplate();
    const settings = readFigureSettings(template, 'series-1');
    settings.details.frame.x = 0.8;
    expect(() => updateFigureSettings(template, 'series-1', settings)).toThrow(
      /图层/,
    );
    settings.details.frame.x = 0.1;
    settings.details.x.tickLabels.precision = 16;
    expect(() =>
      updateFigureSettings(template, 'series-1', settings),
    ).toThrow();
  });

  it.each(['dashed', 'dotted', 'dash-dot'] as const)(
    'renders line style %s',
    (dash) => {
      const template = defaultTemplate();
      xyPlot(template, 0).lineStyle!.dash = dash;
      const state = loadCsvText('X,Y\n0,1\n1,2', 'xy.csv', template);
      expect(state.svg).toContain('stroke-dasharray=');
    },
  );

  it.each(['square', 'triangle', 'diamond', 'plus', 'cross'] as const)(
    'renders marker shape %s',
    (shape) => {
      const template = defaultTemplate();
      xyPlot(template, 0).markerStyle!.shape = shape;
      const state = loadCsvText('X,Y\n0,1\n1,2', 'xy.csv', template);
      expect(state.svg).not.toContain('<circle data-role="marker"');
      expect(state.svg).toContain('data-role="marker"');
    },
  );

  it('controls tick labels independently of tick marks', () => {
    const template = defaultTemplate();
    for (const axis of template.panels[0]!.axes)
      axis.tickLabels.visible = false;
    let state = loadCsvText('X,Y\n0,1\n1,2', 'xy.csv', template);
    expect(state.svg).toContain('data-role="major-tick"');
    expect(state.svg).not.toContain('data-role="tick-label"');
    for (const axis of template.panels[0]!.axes) {
      axis.tickLabels.visible = true;
      axis.majorTicks.visible = false;
    }
    state = loadCsvText('X,Y\n0,1\n1,2', 'xy.csv', template);
    expect(state.svg).toContain('data-role="tick-label"');
    expect(state.svg).not.toContain('data-role="major-tick"');
  });
});
