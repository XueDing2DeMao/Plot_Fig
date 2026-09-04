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

  it('renders panel annotations and maps data reference lines by value', () => {
    const template = createCurrentTemplate();
    template.annotations = [
      {
        annotationId: 'text-1',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        kind: 'text',
        position: { x: 0.2, y: 0.8 },
        text: 'Note',
        format: 'plain',
      },
      {
        annotationId: 'arrow-1',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        kind: 'arrow',
        start: { x: 0.1, y: 0.1 },
        end: { x: 0.3, y: 0.3 },
      },
      {
        annotationId: 'rect-1',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        kind: 'rectangle',
        start: { x: 0.1, y: 0.1 },
        end: { x: 0.3, y: 0.3 },
      },
      {
        annotationId: 'legend-1',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        kind: 'legend',
        position: { x: 0.8, y: 0.8 },
        visible: true,
      },
      {
        annotationId: 'ref-1',
        coordinateSpace: 'data',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        kind: 'reference-line',
        orientation: 'y',
        value: 1,
      },
    ];
    const svg = renderFixture(template);
    expect(svg).toContain('data-role="annotation-text"');
    expect(svg).toContain('data-role="annotation-arrow"');
    expect(svg).toContain('data-role="annotation-rectangle"');
    expect(svg).toContain('data-role="annotation-legend"');
    expect(svg).toContain('y1="720" y2="720"');
  });

  it('renders page annotations with escaped text', () => {
    const template = createCurrentTemplate();
    template.annotations = [
      {
        annotationId: 'page-note',
        coordinateSpace: 'page',
        kind: 'text',
        position: { x: 0.1, y: 0.9 },
        text: 'A & B',
        format: 'plain',
      },
    ];
    const svg = renderFixture(template);
    expect(svg).toContain('data-role="annotation-text"');
    expect(svg).toContain('A &amp; B');
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
