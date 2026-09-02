import { describe, expect, it } from 'vitest';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureDocument, validateFigureTemplate } from './validate.js';

const cloneTemplate = () => structuredClone(validTemplate);

const createDocument = () =>
  ({
    kind: 'figure-document',
    schemaVersion: '1.0.0',
    documentId: 'document-1',
    templateSnapshot: cloneTemplate(),
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
  }) as const;

describe('public validation composition', () => {
  it('returns the parsed value when structural and domain checks pass', () => {
    const template = cloneTemplate();
    const document = createDocument();

    expect(validateFigureTemplate(template)).toEqual({
      ok: true,
      value: template,
      issues: [],
    });
    expect(validateFigureDocument(document)).toEqual({
      ok: true,
      value: document,
      issues: [],
    });
  });

  it('skips domain validation when structure fails first', () => {
    const input = structuredClone(validTemplate) as Record<string, unknown>;

    delete input.schemaVersion;
    input.annotations = [
      {
        annotationId: 'axis-x',
        kind: 'text',
        coordinateSpace: 'page',
        position: { x: 0.1, y: 0.1 },
        text: 'Note',
        format: 'plain',
      },
    ];

    const result = validateFigureTemplate(input);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'FIGURE_SCHEMA_INVALID',
          path: '/schemaVersion',
        }),
      ]);
    }
  });
});
