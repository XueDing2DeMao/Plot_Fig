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
  schemaVersion: '1.22.0',
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

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'FIGURE_SCHEMA_INVALID',
        path: '/schemaVersion',
      });
      expect(result.issues[0]?.message).toEqual(expect.any(String));
      expect(result.issues[0]?.message.length).toBeGreaterThan(0);
    }
  });

  it('returns a stable nested path for additional properties', () => {
    const input = structuredClone(validDocument) as {
      dataSources: Array<Record<string, unknown>>;
    };
    input.dataSources[0]!.filePath = 'C:/private/data.csv';

    const result = validateFigureDocumentStructure(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'FIGURE_SCHEMA_INVALID',
        path: '/dataSources/0/filePath',
      });
      expect(result.issues[0]?.message).toEqual(expect.any(String));
      expect(result.issues[0]?.message.length).toBeGreaterThan(0);
    }
  });

  it('aggregates multiple structural issues from one payload', () => {
    const input = structuredClone(validTemplate) as Record<string, unknown>;

    delete input.schemaVersion;
    input.templateId = 1;
    input.extraRoot = true;

    const result = validateFigureTemplateStructure(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toHaveLength(3);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'FIGURE_SCHEMA_INVALID',
            path: '/schemaVersion',
          }),
          expect.objectContaining({
            code: 'FIGURE_SCHEMA_INVALID',
            path: '/templateId',
          }),
          expect.objectContaining({
            code: 'FIGURE_SCHEMA_INVALID',
            path: '/extraRoot',
          }),
        ]),
      );
      for (const issue of result.issues) {
        expect(issue.message).toEqual(expect.any(String));
        expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
});
