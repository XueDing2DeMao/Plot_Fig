import { describe, expect, it } from 'vitest';
import { validateFigureTemplate } from './validate.js';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';

describe('P3 chart protocol', () => {
  it.each(['xy', 'bar', 'histogram', 'box', 'area', 'heatmap', 'contour'])(
    'accepts %s with its actual input roles',
    (kind) => {
      const result = validateFigureTemplate(chartTemplate(kind));
      expect(result.issues).toEqual([]);
    },
  );
  it('rejects a histogram with XY bindings and irrelevant marker options', () => {
    const t: any = chartTemplate('histogram');
    t.panels[0].plotSlots[0].bindings = { x: 'slot-values', y: 'slot-values' };
    t.panels[0].plotSlots[0].markerStyle = {};
    expect(validateFigureTemplate(t).ok).toBe(false);
  });
  it('rejects mismatched axes, role references, and missing Z', () => {
    const t: any = chartTemplate('bar');
    t.panels[0].axes[0].scale = 'linear';
    expect(validateFigureTemplate(t).ok).toBe(false);
    const heat: any = chartTemplate('heatmap');
    heat.panels[0].plotSlots[0].bindings.z = 'slot-x';
    expect(validateFigureTemplate(heat).ok).toBe(false);
  });
  it('requires increasing bin edges and contour levels', () => {
    const t: any = chartTemplate('histogram');
    t.panels[0].plotSlots[0].bins = { mode: 'edges', edges: [0, 2, 1] };
    expect(validateFigureTemplate(t).ok).toBe(false);
    const c: any = chartTemplate('contour');
    c.panels[0].plotSlots[0].levels = { mode: 'values', values: [1, 1] };
    expect(validateFigureTemplate(c).ok).toBe(false);
  });
  it('rejects category fixed ranges and visible minor ticks', () => {
    const t: any = chartTemplate('box');
    t.panels[0].axes[0].range = { mode: 'fixed', min: 0, max: 2 };
    expect(validateFigureTemplate(t).ok).toBe(false);
    t.panels[0].axes[0].range = { mode: 'auto' };
    t.panels[0].axes[0].minorTicks.visible = true;
    expect(validateFigureTemplate(t).ok).toBe(false);
  });
});
