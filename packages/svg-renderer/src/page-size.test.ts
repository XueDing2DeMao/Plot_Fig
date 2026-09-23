import { describe, expect, it } from 'vitest';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { bindDataSlots, inferDataBindingSet } from '@plot-fig/data-binding';
import { renderFigureSvg } from './index.js';

describe('physical SVG page coordinates', () => {
  it('rejects zero-sized pages rather than returning an unusable SVG', () => {
    const template = createCurrentTemplate();
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y'],
          ['0', '1'],
        ],
        'xy.csv',
      ),
    );
    template.page.size.width.value = 0;
    expect(renderFigureSvg(template, data)).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'RENDER_TEMPLATE_INVALID' }],
    });
  });
  it.each(['in', 'mm', 'cm', 'px'] as const)(
    'uses points consistently for %s pages',
    (unit) => {
      const perInch = { in: 1, mm: 25.4, cm: 2.54, px: 96 };
      const template = createCurrentTemplate();
      template.page.size = {
        width: { value: 6 * perInch[unit], unit },
        height: { value: 4 * perInch[unit], unit },
      };
      const data = bindDataSlots(
        template,
        inferDataBindingSet(
          [
            ['X', 'Y'],
            ['0', '1'],
            ['1', '2'],
          ],
          'xy.csv',
        ),
      );
      const result = renderFigureSvg(template, data);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('render failed');
      expect(result.svg).toContain('viewBox="0 0 432 288"');
      expect(result.svg).toContain(
        'data-role="page-background" width="432" height="288"',
      );
    },
  );
});
