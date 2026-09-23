import type { DataDiagnostic, DataValue } from './types.js';

export type ColumnType = 'number' | 'string' | 'category' | 'date' | 'datetime';
export type RawCell = string | number | null;
export type TableSource = {
  kind: 'csv' | 'txt' | 'xlsx' | 'clipboard';
  name: string;
  sheetName?: string;
  date1904?: boolean;
};
export type ColumnSettings = {
  type: ColumnType;
  unit: string;
  missingTokens: string[];
  dateFormat: 'iso' | 'ymd' | 'dmy' | 'mdy';
  utcOffsetMinutes: number;
};
export type TableColumn = {
  columnId: string;
  name: string;
  index: number;
  settings: ColumnSettings;
};
export type TableRegion = {
  headerRow: number | null;
  unitRow: number | null;
  dataStartRow: number;
};
export type DataTable = {
  tableId: string;
  name: string;
  source: TableSource;
  rows: RawCell[][];
  region: TableRegion;
  columns: TableColumn[];
  importDiagnostics: DataDiagnostic[];
};
export type ColumnRef = { tableId: string; columnId: string };
export type DataWorkspace = {
  tables: DataTable[];
  activeTableId: string | null;
  slotBindings: Record<string, ColumnRef>;
};
export type OrganizedColumn = TableColumn & {
  values: DataValue[];
  missingCount: number;
  invalidCount: number;
};
export type OrganizedTable = {
  columns: OrganizedColumn[];
  rowCount: number;
  diagnostics: DataDiagnostic[];
};
export const DATA_LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  projectBytes: 20 * 1024 * 1024,
  rows: 100_000,
  columns: 256,
  cells: 1_000_000,
} as const;

export const emptyWorkspace = (): DataWorkspace => ({
  tables: [],
  activeTableId: null,
  slotBindings: {},
});
