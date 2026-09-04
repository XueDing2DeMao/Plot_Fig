import { describe, expect, it } from 'vitest';
import { renderFigureSvg } from './index.js';

describe('renderFigureSvg contract', () => {
  it('exposes a non-React pure renderer entry point', () => {
    expect(typeof renderFigureSvg).toBe('function');
  });
});
