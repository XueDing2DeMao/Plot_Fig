import { expect, it } from 'vitest';
import { defaultTemplate } from '../../web-editor/src/state/default-template.js';
import { paintDefinitions, paintValue } from './paint.js';
it('embeds reusable, deterministic definitions and preserves transparent fills', () => {
  const t = defaultTemplate();
  t.page.backgroundPaint = {
    kind: 'pattern',
    pattern: 'dots',
    foreground: '#123456',
    background: 'none',
    spacingPt: 8,
    widthPt: 1,
  };
  const defs = paintDefinitions(t);
  expect(defs).toContain('patternUnits="userSpaceOnUse"');
  expect(defs).toContain('fill="none"');
  const id = paintValue(t.page.backgroundPaint, 'red').slice(5, -1);
  expect(defs).toContain(`id="${id}"`);
  expect(paintValue(undefined, '#ffffff')).toBe('#ffffff');
  expect(paintValue({ kind: 'none' }, '#ffffff')).toBe('none');
});
