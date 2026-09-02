import { describe, expect, expectTypeOf, it } from 'vitest';
import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import {
  validateFigureDocumentStructure,
  validateFigureTemplateStructure,
} from './structural.js';

const validDocument = {
  kind: 'figure-document',
  schemaVersion: '1.0.0',
  documentId: 'document-1',
  templateSnapshot: validTemplate,
  dataSources: [
    {
      sourceId: 'source-1',
      name: 'Measurement',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:abc123',
      columns: [
        { columnId: 'temperature', valueType: 'number' },
        { columnId: 'conductivity', valueType: 'number' },
      ],
    },
  ],
  bindingSet: [
    { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'temperature' },
    { dataSlotId: 'slot-y', sourceId: 'source-1', columnId: 'conductivity' },
  ],
} as const satisfies FigureDocument;

describe('structural validation', () => {
  it('returns the typed value for a structurally valid template', () => {
    const result = validateFigureTemplateStructure(validTemplate);

    expect(result).toEqual({
      ok: true,
      value: validTemplate,
      issues: [],
    });

    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<FigureTemplate>();
    }
  });

  it('returns the typed value for a structurally valid document', () => {
    const result = validateFigureDocumentStructure(validDocument);

    expect(result).toEqual({
      ok: true,
      value: validDocument,
      issues: [],
    });

    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<FigureDocument>();
    }
  });

  it('returns a stable required-property issue for a missing schemaVersion', () => {
    const { schemaVersion: _removed, ...input } = validTemplate;
    const result = validateFigureTemplateStructure(input);

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'FIGURE_SCHEMA_INVALID',
          path: '/schemaVersion',
          message: "must have required property 'schemaVersion'",
        },
      ],
    });
  });

  it('returns a stable nested path for additional properties', () => {
    const input = structuredClone(validDocument) as {
      dataSources: Array<Record<string, unknown>>;
    };
    input.dataSources[0]!.filePath = 'C:/private/data.csv';

    const result = validateFigureDocumentStructure(input);

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'FIGURE_SCHEMA_INVALID',
          path: '/dataSources/0/filePath',
          message: 'must NOT have additional properties',
        },
      ],
    });
  });
});
