import type { DataBindingSet } from './types.js';

export { parseCsvText } from './csv/parse.js';
export type { CsvParseResult } from './csv/parse.js';
export { bindDataSlots } from './bind.js';
export { inferDataBindingSet } from './infer.js';
export * from './workspace-types.js';
export {
  parseDelimited,
  detectDelimiter,
  type Delimiter,
} from './delimited.js';
export {
  createDataTable,
  organizeTable,
  updateTableColumn,
} from './data-table.js';
export { parseDateValue, excelDateValue } from './datetime.js';
export {
  bindWorkspace,
  columnKey,
  suggestTableColumn,
  bindTableToPlot,
  appendWorkspaceTables,
  removeWorkspaceTable,
} from './workspace-binding.js';

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
