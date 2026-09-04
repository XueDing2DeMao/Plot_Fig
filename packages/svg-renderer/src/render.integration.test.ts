import { inferDataBindingSet, bindDataSlots } from '@plot-fig/data-binding';
import {
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { describe, expect, it } from 'vitest';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { renderFigureSvg } from './index.js';

function renderFixture(template = createCurrentTemplate()): string {
  const data = bindDataSlots(
    template,
    inferDataBindingSet(
      [
        ['X', 'Y'],
        ['0', '1'],
        ['1', '3'],
        ['2', '2'],
      ],
      'xy.csv',
    ),
  );
  const result = renderFigureSvg(template, data);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('fixture render failed');
  return result.svg;
}

describe('XY SVG rendering', () => {
  it('renders the stable page/panel/axes/plot hierarchy', () => {
    const svg = renderFixture();
    expect(svg).toContain('data-role="page-background"');
    expect(svg).toContain('data-role="panel"');
    expect(svg).toContain('data-role="axes"');
    expect(svg).toContain('data-role="plot-slot"');
    expect(svg).toContain('<circle');
    expect(svg).toContain('<path');
  });

  it('renders axis ticks, labels and optional titles', () => {
    const template = createCurrentTemplate();
    const xAxis = template.panels[0]!.axes.find(
      (axis) => axis.dimension === 'x',
    )!;
    xAxis.title = {
      format: 'plain',
      text: 'X axis',
      fontFamily: 'Arial',
      fontSizePt: 8,
      color: '#111111',
    };
    const svg = renderFixture(template);
    expect(svg).toContain('data-role="axis-x"');
    expect(svg).toContain('data-role="major-tick"');
    expect(svg).toContain('data-role="tick-label"');
    expect(svg).toContain('data-role="axis-title"');
    expect(svg).toContain('X axis');
  });

  it('is deterministic and rejects invalid templates without throwing', () => {
    const template = createCurrentTemplate();
    expect(renderFixture(template)).toBe(renderFixture(template));
    const invalid = structuredClone(template) as FigureTemplate;
    invalid.panels[0]!.frame.width = 2;
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y'],
          ['1', '2'],
        ],
        'xy.csv',
      ),
    );
    const result = renderFigureSvg(invalid, data);
    expect(result).toMatchObject({
      ok: false,
      diagnostics: [{ code: 'RENDER_TEMPLATE_INVALID' }],
    });
    expect(validateFigureTemplate(template).ok).toBe(true);
  });
});
