import { describe, expect, it } from 'vitest';
import type { FigureDocument } from '../schema/figure-document.js';
import type { FigureTemplate } from '../schema/figure-template.js';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureDocumentDomain } from './domain.js';

type DocumentMutator = (value: FigureDocument) => void;

const cloneTemplate = () => structuredClone(validTemplate) as FigureTemplate;

const createDocument = (
  templateSnapshot: FigureTemplate = cloneTemplate(),
): FigureDocument => ({
  kind: 'figure-document',
  schemaVersion: '1.0.0',
  documentId: 'document-1',
  templateSnapshot,
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
});

const documentIssuePaths = (value: FigureDocument) =>
  validateFigureDocumentDomain(value).map((issue) => issue.path);

describe('FigureDocument domain invariants', () => {
  it('accepts a document with complete bindings', () => {
    expect(validateFigureDocumentDomain(createDocument())).toEqual([]);
  });

  const documentCases: Array<readonly [string, string, DocumentMutator]> = [
    [
      'missing required bindings',
      '/bindingSet',
      (value) => {
        value.bindingSet = value.bindingSet.slice(0, 1);
      },
    ],
    [
      'duplicate data slot bindings',
      '/bindingSet/2/dataSlotId',
      (value) => {
        value.bindingSet.push({
          dataSlotId: 'slot-x',
          sourceId: 'source-1',
          columnId: 'conductivity',
        });
      },
    ],
    [
      'unknown data slots',
      '/bindingSet/2/dataSlotId',
      (value) => {
        value.bindingSet.push({
          dataSlotId: 'slot-z',
          sourceId: 'source-1',
          columnId: 'conductivity',
        });
      },
    ],
    [
      'unknown sources',
      '/bindingSet/0/sourceId',
      (value) => {
        value.bindingSet[0]!.sourceId = 'source-missing';
      },
    ],
    [
      'unknown columns',
      '/bindingSet/0/columnId',
      (value) => {
        value.bindingSet[0]!.columnId = 'column-missing';
      },
    ],
    [
      'incompatible source column types',
      '/bindingSet/0/columnId',
      (value) => {
        value.dataSources[0]!.columns[0]!.valueType = 'string';
      },
    ],
    [
      'unsafe document extensions',
      '/documentExtensions/origin',
      (value) => {
        value.documentExtensions = { origin: new Date('2026-09-02T00:00:00Z') };
      },
    ],
  ];

  it.each(documentCases)('rejects %s', (_name, path, mutate) => {
    const value = createDocument();
    mutate(value);
    expect(documentIssuePaths(value)).toContain(path);
  });
});
