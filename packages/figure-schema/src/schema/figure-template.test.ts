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

  it('accepts valid page, panel, and data annotations', () => {
    const validator = Compile(FigureTemplateSchema);
    const input = structuredClone(validTemplate);

    input.annotations = [
      {
        annotationId: 'text-page',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0.1, y: 0.1 },
        text: 'Page note',
        format: 'plain',
      },
      {
        annotationId: 'arrow-panel',
        kind: 'arrow',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        start: { x: 0.1, y: 0.2 },
        end: { x: 0.8, y: 0.9 },
      },
      {
        annotationId: 'ref-data',
        kind: 'reference-line',
        coordinateSpace: 'data',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        orientation: 'y',
        value: 5,
      },
    ];

    expect(validator.Check(input)).toBe(true);
  });

  it('rejects page annotations that include panel or axis references', () => {
    const validator = Compile(FigureTemplateSchema);
    const input = structuredClone(validTemplate);

    input.annotations = [
      {
        annotationId: 'text-page-invalid',
        kind: 'text',
        coordinateSpace: 'page',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        position: { x: 0.1, y: 0.1 },
        text: 'Page note',
        format: 'plain',
      },
    ];

    expect(validator.Check(input)).toBe(false);
  });

  it('rejects panel annotations without panelId or with axis references', () => {
    const validator = Compile(FigureTemplateSchema);
    const missingPanel = structuredClone(validTemplate);

    missingPanel.annotations = [
      {
        annotationId: 'arrow-panel-missing',
        kind: 'arrow',
        coordinateSpace: 'panel',
        start: { x: 0.1, y: 0.2 },
        end: { x: 0.8, y: 0.9 },
      },
    ];

    expect(validator.Check(missingPanel)).toBe(false);

    const withAxis = structuredClone(validTemplate);

    withAxis.annotations = [
      {
        annotationId: 'arrow-panel-axis',
        kind: 'arrow',
        coordinateSpace: 'panel',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        start: { x: 0.1, y: 0.2 },
        end: { x: 0.8, y: 0.9 },
      },
    ];

    expect(validator.Check(withAxis)).toBe(false);
  });

  it('rejects data annotations missing panelId or axis references', () => {
    const validator = Compile(FigureTemplateSchema);

    for (const annotation of [
      {
        annotationId: 'ref-missing-panel',
        kind: 'reference-line',
        coordinateSpace: 'data',
        xAxisId: 'axis-x',
        yAxisId: 'axis-y',
        orientation: 'x',
        value: 1,
      },
      {
        annotationId: 'ref-missing-x',
        kind: 'reference-line',
        coordinateSpace: 'data',
        panelId: 'panel-main',
        yAxisId: 'axis-y',
        orientation: 'x',
        value: 1,
      },
      {
        annotationId: 'ref-missing-y',
        kind: 'reference-line',
        coordinateSpace: 'data',
        panelId: 'panel-main',
        xAxisId: 'axis-x',
        orientation: 'x',
        value: 1,
      },
    ]) {
      const input = structuredClone(validTemplate);

      input.annotations = [annotation];
      expect(validator.Check(input)).toBe(false);
    }
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

  it('accepts root provenance and extensions but rejects unknown nested fields', () => {
    const validator = Compile(FigureTemplateSchema);

    expect(validator.Check(validTemplate)).toBe(true);
    expect(
      validator.Check({
        ...validTemplate,
        provenance: {
          ...validTemplate.provenance,
          createdAt: '2026-09-02T17:00:00Z',
        },
      }),
    ).toBe(false);

    const withPanelExtra = structuredClone(validTemplate) as Record<
      string,
      unknown
    >;
    const firstPanel = {
      ...(withPanelExtra.panels as Array<Record<string, unknown>>)[0]!,
      zIndex: 1,
    };
    withPanelExtra.panels = [firstPanel];
    expect(validator.Check(withPanelExtra)).toBe(false);

    const withAnnotationExtra = structuredClone(validTemplate);
    withAnnotationExtra.annotations = [
      {
        annotationId: 'text-extra',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0.1, y: 0.1 },
        text: 'Note',
        format: 'plain',
        extra: true,
      },
    ];
    expect(validator.Check(withAnnotationExtra)).toBe(false);
  });
});
