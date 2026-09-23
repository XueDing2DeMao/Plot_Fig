import { describe, expect, it } from 'vitest';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureTemplate } from './validate.js';

function configuredAxis(generation: unknown, scale = 'linear') {
  const template: any = structuredClone(validTemplate);
  template.schemaVersion = '1.22.0';
  const axis = template.panels[0].axes[0];
  axis.scale = scale;
  axis.majorTicks.generation = generation;
  if (scale === 'category') template.panels[0].plotSlots = [];
  return template;
}

describe('major tick generation schema 1.3.0', () => {
  it.each([
    { mode: 'auto' },
    { mode: 'increment', step: 0.2 },
    { mode: 'increment', step: 1e-3, anchor: -0.5 },
    { mode: 'count', count: 2 },
    { mode: 'count', count: 1000, anchor: 0 },
    { mode: 'endpoints' },
  ])('accepts numeric axis generation %j', (generation) => {
    expect(validateFigureTemplate(configuredAxis(generation)).ok).toBe(true);
  });

  it('keeps generation optional and preserves the old major tick fields', () => {
    const template = configuredAxis({ mode: 'auto' });
    delete template.panels[0].axes[0].majorTicks.generation;
    const result = validateFigureTemplate(template);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.panels[0]!.axes[0]!.majorTicks).toEqual({
        visible: true,
        lengthPt: 4,
        widthPt: 1,
      });
  });

  it.each([
    { mode: 'increment' },
    { mode: 'increment', step: 0 },
    { mode: 'increment', step: -1 },
    { mode: 'increment', step: NaN },
    { mode: 'increment', step: Infinity },
    { mode: 'increment', step: 1, anchor: -Infinity },
    { mode: 'count', count: 0 },
    { mode: 'count', count: -6 },
    { mode: 'count', count: 1 },
    { mode: 'count', count: 2.5 },
    { mode: 'count', count: 1001 },
    { mode: 'count', count: 6, anchor: NaN },
    { mode: 'count', count: 6, spacing: 'exact' },
    { mode: 'auto', anchor: 0 },
    { mode: 'endpoints', anchor: 0 },
    { mode: 'custom' },
  ])('rejects malformed generation %j', (generation) => {
    const result = validateFigureTemplate(configuredAxis(generation));
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues).toContainEqual(
        expect.objectContaining({ code: 'FIGURE_SCHEMA_INVALID' }),
      );
  });

  it('accepts legacy and explicit auto on category axes', () => {
    const template = configuredAxis({ mode: 'auto' }, 'category');
    expect(validateFigureTemplate(template).ok).toBe(true);
    delete template.panels[0].axes[0].majorTicks.generation;
    expect(validateFigureTemplate(template).ok).toBe(true);
  });

  it.each([
    { mode: 'increment', step: 1 },
    { mode: 'count', count: 6 },
    { mode: 'endpoints' },
  ])('rejects numeric generation %j on category axes', (generation) => {
    const result = validateFigureTemplate(
      configuredAxis(generation, 'category'),
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
          path: '/panels/0/axes/0/majorTicks/generation',
        }),
      );
  });

  it.each(['log10', 'ln'])(
    'accepts positive or absent raw anchors for %s',
    (scale) => {
      for (const generation of [
        { mode: 'increment', step: 1 },
        { mode: 'increment', step: 1, anchor: 0.1 },
        { mode: 'count', count: 6 },
        { mode: 'count', count: 6, anchor: 2 },
      ])
        expect(
          validateFigureTemplate(configuredAxis(generation, scale)).ok,
        ).toBe(true);
    },
  );

  it.each(['log10', 'ln'])(
    'rejects nonpositive raw anchors for %s with an exact field path',
    (scale) => {
      for (const anchor of [0, -1])
        for (const generation of [
          { mode: 'increment', step: 1, anchor },
          { mode: 'count', count: 6, anchor },
        ]) {
          const result = validateFigureTemplate(
            configuredAxis(generation, scale),
          );
          expect(result.ok).toBe(false);
          if (!result.ok)
            expect(result.issues).toContainEqual(
              expect.objectContaining({
                code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
                path: '/panels/0/axes/0/majorTicks/generation/anchor',
              }),
            );
        }
    },
  );
});
