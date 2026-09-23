export type DataValue = number | string | null;

export type DataColumn = {
  columnId: string;
  name: string;
  unit?: string;
  index: number;
  valueType: 'number' | 'category' | 'string';
  values: DataValue[];
  source?: { tableId: string; tableName: string; dataStartRow: number };
};

export type SlotBinding = {
  dataSlotId: string;
  columnId: string;
  status: 'valid' | 'invalid';
};

export type DataDiagnostic = {
  code:
    | 'CSV_EMPTY'
    | 'CSV_PARSE_ERROR'
    | 'CSV_DUPLICATE_HEADER'
    | 'COLUMN_TYPE_CONFLICT'
    | 'SLOT_COLUMN_MISSING'
    | 'SLOT_VALUE_INVALID'
    | 'TABLE_VALUE_INVALID'
    | 'TABLE_IMPORT_WARNING'
    | 'TABLE_BINDING_INVALID';
  severity: 'info' | 'warning' | 'error';
  sourcePath: string;
  message: string;
};

export type DataBindingSet = {
  kind: 'data-binding-set';
  version: '1.0.0';
  source: { kind: 'csv' | 'session'; name: string; rowCount: number };
  columns: DataColumn[];
  bindings: SlotBinding[];
  diagnostics: DataDiagnostic[];
};
