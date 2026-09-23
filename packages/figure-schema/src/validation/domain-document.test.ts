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
  schemaVersion: '1.22.0',
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
const documentIssues = (value: FigureDocument) =>
  validateFigureDocumentDomain(value);

describe('FigureDocument domain invariants', () => {
  it('accepts a document with complete bindings', () => {
    expect(validateFigureDocumentDomain(createDocument())).toEqual([]);
  });

  it('reports duplicate source and column identifiers in stable order', () => {
    const value = createDocument();

    value.dataSources[0]!.columns.push({
      columnId: 'temperature',
      valueType: 'number',
    });
    value.dataSources.push({
      sourceId: 'source-1',
      name: 'Duplicate source',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:def456',
      columns: [{ columnId: 'replicate', valueType: 'number' }],
    });

    expect(documentIssuePaths(value)).toEqual([
      '/dataSources/0/columns/2/columnId',
      '/dataSources/1/sourceId',
    ]);
  });

  it('stops at duplicate source roots instead of cascading into binding diagnostics', () => {
    const value = createDocument();

    value.dataSources[0]!.columns = [
      { columnId: 'temperature', valueType: 'number' },
    ];
    value.dataSources.push({
      sourceId: 'source-1',
      name: 'Duplicate source',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:def456',
      columns: [{ columnId: 'conductivity-second', valueType: 'number' }],
    });
    value.bindingSet[1] = {
      dataSlotId: 'slot-y',
      sourceId: 'source-1',
      columnId: 'conductivity-second',
    };

    expect(documentIssues(value)).toEqual([
      expect.objectContaining({
        path: '/dataSources/1/sourceId',
      }),
    ]);
  });

  it('stops at duplicate column roots instead of inferring incompatible bindings', () => {
    const value = createDocument();

    value.dataSources[0]!.columns = [
      { columnId: 'temperature', valueType: 'string' },
      { columnId: 'temperature', valueType: 'number' },
      { columnId: 'conductivity', valueType: 'number' },
    ];

    expect(documentIssues(value)).toEqual([
      expect.objectContaining({
        path: '/dataSources/0/columns/1/columnId',
      }),
    ]);
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
