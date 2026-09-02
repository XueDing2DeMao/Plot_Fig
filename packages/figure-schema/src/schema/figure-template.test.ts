import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { FigureTemplateSchema } from './figure-template.js';
import { validTemplate } from './fixtures.js';

describe('FigureTemplateSchema', () => {
  it('accepts the canonical fixture and rejects unknown root fields', () => {
    const validator = Compile(FigureTemplateSchema);

    expect(validator.Check(validTemplate)).toBe(true);
    expect(validator.Check({ ...validTemplate, originLayer: 1 })).toBe(false);
  });

  it('accepts every annotation variant and rejects unknown discriminators', () => {
    const input = structuredClone(validTemplate) as Record<string, unknown>;

    input.annotations = [
      {
        annotationId: 'legend-1',
        kind: 'legend',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        position: { x: 0.8, y: 0.8 },
        visible: true,
      },
      {
        annotationId: 'text-1',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0.1, y: 0.1 },
        text: 'Note',
        format: 'plain',
      },
      {
        annotationId: 'arrow-1',
        kind: 'arrow',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'rect-1',
        kind: 'rectangle',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      },
      {
        annotationId: 'ref-1',
        kind: 'reference-line',
        coordinateSpace: 'data',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        orientation: 'y',
        value: 5,
      },
    ];

    const validator = Compile(FigureTemplateSchema);

    expect(validator.Check(input)).toBe(true);
    (input.annotations as Array<Record<string, unknown>>)[0]!.kind = 'image';
    expect(validator.Check(input)).toBe(false);
  });
});
