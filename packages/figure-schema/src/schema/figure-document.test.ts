import { Compile } from 'typebox/compile';
import { describe, expect, it } from 'vitest';
import { FigureDocumentSchema } from './figure-document.js';
import { validTemplate } from './fixtures.js';

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
} as const;

describe('FigureDocumentSchema', () => {
  it('accepts a document with a frozen template snapshot and binding set', () => {
    expect(Compile(FigureDocumentSchema).Check(validDocument)).toBe(true);
  });

  it('rejects file locations and raw payload fields from data sources', () => {
    const validator = Compile(FigureDocumentSchema);
    const withFilePath = structuredClone(validDocument) as {
      dataSources: Array<Record<string, unknown>>;
    };
    withFilePath.dataSources[0]!.filePath = 'C:/private/data.csv';

    expect(validator.Check(withFilePath)).toBe(false);

    const withPayload = structuredClone(validDocument) as {
      dataSources: Array<Record<string, unknown>>;
    };
    withPayload.dataSources[0]!.payload = [{ temperature: 25.1 }];

    expect(validator.Check(withPayload)).toBe(false);
  });
});
