export type DataValue = number | string | null;

export type DataColumn = {
  columnId: string;
  name: string;
  index: number;
  valueType: 'number' | 'category' | 'string';
  values: DataValue[];
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
    | 'SLOT_VALUE_INVALID';
  severity: 'info' | 'warning' | 'error';
  sourcePath: string;
  message: string;
};

export type DataBindingSet = {
  kind: 'data-binding-set';
  version: '1.0.0';
  source: { kind: 'csv'; name: string; rowCount: number };
  columns: DataColumn[];
  bindings: SlotBinding[];
  diagnostics: DataDiagnostic[];
};
