import type { DataBindingSet } from './types.js';

export { parseCsvText } from './csv/parse.js';
export type { CsvParseResult } from './csv/parse.js';

export type {
  DataBindingSet,
  DataColumn,
  DataDiagnostic,
  DataValue,
  SlotBinding,
} from './types.js';

export function createDataBindingSet(sourceName: string): DataBindingSet {
  return {
    kind: 'data-binding-set',
    version: '1.0.0',
    source: { kind: 'csv', name: sourceName, rowCount: 0 },
    columns: [],
    bindings: [],
    diagnostics: [],
  };
}
