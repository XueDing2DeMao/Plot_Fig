import { describe, expect, it } from 'vitest';
import { validTemplate } from '../schema/fixtures.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validateFigureTemplate } from './validate.js';

function fixture(ratio = 1) {
  const template = structuredClone(validTemplate) as FigureTemplate;
  Object.assign(template.panels[0]!, {
    axisLengthRatio: { xAxisId: 'axis-x', yAxisId: 'axis-y', ratio },
  });
  return template;
}
describe('axis length ratio domain', () => {
  it('accepts an optional same-panel linear axis pair, including hidden axes', () => {
    expect(validateFigureTemplate(validTemplate).ok).toBe(true);
    const template = fixture(0.25);
    template.panels[0]!.axes.forEach((axis) => {
      axis.visible = false;
      axis.reverse = true;
    });
    expect(validateFigureTemplate(template)).toMatchObject({ ok: true });
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid ratio %s', (ratio) => {
    expect(validateFigureTemplate(fixture(ratio)).ok).toBe(false);
  });
  it.each(['missing', 'axis-y'])(
    'rejects invalid X reference %s',
    (xAxisId) => {
      const template = fixture();
      Object.assign(template.panels[0]!, {
        axisLengthRatio: { xAxisId, yAxisId: 'axis-y', ratio: 1 },
      });
      expect(validateFigureTemplate(template).ok).toBe(false);
    },
  );
  it.each(['log10', 'ln', 'category'] as const)('rejects %s scale', (scale) => {
    const template = fixture();
    template.panels[0]!.plotSlots = [];
    template.panels[0]!.axes[0]!.scale = scale;
    expect(validateFigureTemplate(template).ok).toBe(false);
  });
  it.each(['parent', 'child'])(
    'rejects a ratio layer as frame link %s',
    (role) => {
      const template = fixture();
      const other = structuredClone(template.panels[0]!);
      other.panelId = 'other';
      other.axes.forEach((axis) => {
        axis.axisId += '-other';
      });
      other.plotSlots = [];
      Reflect.deleteProperty(other, 'axisLengthRatio');
      template.panels.push(other);
      const child = role === 'child' ? template.panels[0]! : other;
      child.frameLink = {
        parentPanelId: role === 'child' ? 'other' : template.panels[0]!.panelId,
        x: 0,
      };
      expect(validateFigureTemplate(template)).toMatchObject({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ path: '/panels/0/axisLengthRatio' }),
        ]),
      });
    },
  );
});
