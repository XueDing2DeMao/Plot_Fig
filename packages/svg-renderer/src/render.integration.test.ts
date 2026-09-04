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
    xAxis.minorTicks.visible = true;
    xAxis.minorTicks.count = 2;
    xAxis.tickLabels.notation = 'fixed';
    xAxis.tickLabels.precision = 2;
    const svg = renderFixture(template);
    expect(svg).toContain('data-role="axis-x"');
    expect(svg).toContain('data-role="major-tick"');
    expect(svg).toContain('data-role="tick-label"');
    expect(svg).toContain('data-role="axis-title"');
    expect(svg).toContain('X axis');
    expect(svg).toContain('data-role="minor-tick"');
    expect(svg).toContain('0.50');
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

  it('renders asymmetric error bars with caps', () => {
    const template = createCurrentTemplate();
    template.dataSlots.push(
      {
        dataSlotId: 'slot-y-lower',
        name: 'YLower',
        role: 'yErrorLower',
        valueType: 'number',
        required: false,
      },
      {
        dataSlotId: 'slot-y-upper',
        name: 'YUpper',
        role: 'yErrorUpper',
        valueType: 'number',
        required: false,
      },
    );
    template.panels[0]!.plotSlots[0]!.bindings.yErrorLower = 'slot-y-lower';
    template.panels[0]!.plotSlots[0]!.bindings.yErrorUpper = 'slot-y-upper';
    template.panels[0]!.plotSlots[0]!.errorBarStyle = {
      visible: true,
      color: '#111111',
      widthPt: 1,
      capWidthPt: 4,
    };
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y', 'YLower', 'YUpper'],
          ['0', '1', '0.1', '0.2'],
          ['1', '3', '0.2', '0.3'],
        ],
        'error.csv',
      ),
    );
    const result = renderFigureSvg(template, data);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('error fixture render failed');
    expect(result.svg.match(/data-role="error-bar"/g)?.length).toBe(2);
    expect(result.svg).toContain('data-role="error-cap"');
  });

  it('warns when configured error values are invalid', () => {
    const template = createCurrentTemplate();
    template.dataSlots.push({
      dataSlotId: 'slot-y-error',
      name: 'YError',
      role: 'yError',
      valueType: 'number',
      required: false,
    });
    template.panels[0]!.plotSlots[0]!.bindings.yError = 'slot-y-error';
    template.panels[0]!.plotSlots[0]!.errorBarStyle = {
      visible: true,
      color: '#111111',
      widthPt: 1,
      capWidthPt: 4,
    };
    const data = bindDataSlots(
      template,
      inferDataBindingSet(
        [
          ['X', 'Y', 'YError'],
          ['0', '1', 'bad'],
          ['1', '3', 'bad'],
        ],
        'invalid-error.csv',
      ),
    );
    const result = renderFigureSvg(template, data);
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'RENDER_DATA_INVALID',
          severity: 'warning',
        }),
      ]),
    );
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
