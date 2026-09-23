import { describe, expect, it } from 'vitest';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureTemplate } from './validate.js';

function check(range: unknown, rescale: unknown, scale = 'linear') {
  const template: any = structuredClone(validTemplate);
  Object.assign(template.panels[0].axes[0], { range, rescale, scale });
  if (scale === 'category') template.panels[0].plotSlots = [];
  return validateFigureTemplate(template).ok;
}
describe('axis rescale contract', () => {
  it.each([
    'normal',
    'auto',
    'fixed',
    'fixed-min-normal',
    'fixed-min-auto',
    'fixed-max-normal',
    'fixed-max-auto',
  ])('accepts %s with a current window', (mode) => {
    expect(
      check(
        { mode: 'fixed', min: -1, max: 10 },
        { mode, margin: { minPercent: 0, maxPercent: 100 } },
      ),
    ).toBe(true);
  });
  it.each(['normal', 'auto'])('allows pending %s', (mode) => {
    expect(check({ mode: 'auto' }, { mode })).toBe(true);
  });
  it('requires matching partial bounds', () => {
    expect(
      check({ mode: 'min-only', min: -0.25 }, { mode: 'fixed-min-auto' }),
    ).toBe(true);
    expect(
      check({ mode: 'max-only', max: 0.55 }, { mode: 'fixed-max-normal' }),
    ).toBe(true);
    expect(
      check({ mode: 'min-only', min: 1 }, { mode: 'fixed-max-auto' }),
    ).toBe(false);
    expect(check({ mode: 'auto' }, { mode: 'fixed' })).toBe(false);
    expect(check({ mode: 'auto' }, { mode: 'fixed-min-auto' })).toBe(false);
  });
  it('rejects unsupported bounds, margins and category policies', () => {
    expect(
      check({ mode: 'min-only', min: 0 }, { mode: 'fixed-min-auto' }, 'log10'),
    ).toBe(false);
    expect(
      check({ mode: 'max-only', max: Infinity }, { mode: 'fixed-max-auto' }),
    ).toBe(false);
    expect(
      check(
        { mode: 'auto' },
        { mode: 'auto', margin: { minPercent: -1, maxPercent: 0 } },
      ),
    ).toBe(false);
    expect(check({ mode: 'auto' }, { mode: 'auto' }, 'category')).toBe(false);
  });
});
