import { describe, expect, it } from 'vitest';
import { createScaleFromValues } from './scales.js';
import { defaultTemplate } from '../../web-editor/src/state/default-template.js';

describe('multi-table scale aggregation', () => {
  it('derives a range for combined tables without spreading function arguments', () => {
    const values = Array.from({ length: 200_000 }, (_, index) => index - 50);
    const scale = createScaleFromValues(
      defaultTemplate().panels[0]!.axes[0]!,
      values,
    );
    expect(scale?.min).toBe(-50);
    expect(scale?.max).toBe(199_949);
    expect(scale?.map(199_949)).toBe(1);
  });
});
