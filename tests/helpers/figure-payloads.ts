import {
  canonicalizeFigurePayload,
  type FigureDocument,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { expect } from 'vitest';
import { validTemplate } from '../../packages/figure-schema/src/schema/fixtures.js';

export const cloneCanonical = <T>(value: T): T =>
  JSON.parse(canonicalizeFigurePayload(value)) as T;

export const createCurrentTemplate = () =>
  cloneCanonical(validTemplate) as FigureTemplate;

export const createCurrentDocument = (): FigureDocument => ({
  kind: 'figure-document',
  schemaVersion: '1.0.0',
  documentId: 'document-1',
  templateSnapshot: createCurrentTemplate(),
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

export function expectNoSharedFigureRefs(
  output: FigureTemplate | FigureDocument,
  input: FigureTemplate | FigureDocument,
): void {
  expect(output).not.toBe(input);
  if (output.kind === 'figure-template' && input.kind === 'figure-template') {
    expect(output.page).not.toBe(input.page);
    expect(output.panels).not.toBe(input.panels);
    expect(output.panels[0]).not.toBe(input.panels[0]);
    expect(output.panels[0]?.axes).not.toBe(input.panels[0]?.axes);
    expect(output.theme).not.toBe(input.theme);
  }
  if (output.kind === 'figure-document' && input.kind === 'figure-document') {
    expect(output.templateSnapshot).not.toBe(input.templateSnapshot);
    expect(output.templateSnapshot.page).not.toBe(input.templateSnapshot.page);
    expect(output.dataSources).not.toBe(input.dataSources);
    expect(output.dataSources[0]).not.toBe(input.dataSources[0]);
    expect(output.bindingSet).not.toBe(input.bindingSet);
  }
}
