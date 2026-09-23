import { expect, it } from 'vitest';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { validTemplate } from '../packages/figure-schema/src/schema/fixtures.js';

it('accepts shared gradient and pattern paints with an explicit legend source', () => {
  const t: any = structuredClone(validTemplate);
  t.page.backgroundPaint = {
    kind: 'linear-gradient',
    angle: 45,
    startColor: '#ffffff',
    endColor: '#abcdef',
  };
  t.panels[0].plotSlots[0].legendEntry.source = 'auto';
  expect(validateFigureTemplate(t).ok).toBe(true);
  t.page.backgroundPaint = {
    kind: 'pattern',
    pattern: 'cross',
    foreground: '#112233',
    background: 'none',
    spacingPt: 8,
    widthPt: 1,
  };
  expect(validateFigureTemplate(t).ok).toBe(true);
  t.page.backgroundPaint.spacingPt = 0;
  expect(validateFigureTemplate(t).ok).toBe(false);
});
