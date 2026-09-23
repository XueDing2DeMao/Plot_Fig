import {
  DATA_LIMITS,
  type ColumnType,
  type RawCell,
  type DataDiagnostic,
  type TableSource,
} from '@plot-fig/data-binding';
import type { CellObject, WorkSheet } from 'xlsx';

export type ImportSheet = {
  source: TableSource;
  rows: RawCell[][];
  hints: Record<number, ColumnType>;
  diagnostics: DataDiagnostic[];
};
type SheetJS = typeof import('xlsx');

function dateHint(format: string): ColumnType {
  const tokens = format.replace(/"[^"]*"|\\.|\[(?![hms]+\])[^\]]*\]/gi, '');
  return /[hs]|am\/pm|a\/p/i.test(tokens) ? 'datetime' : 'date';
}

function cellValue(
  cell: CellObject | undefined,
  path: string,
  diagnostics: DataDiagnostic[],
): RawCell {
  if (!cell) return null;
  if (cell.t === 'e' || (cell.f && cell.v === undefined)) {
    diagnostics.push({
      code: 'TABLE_IMPORT_WARNING',
      severity: 'warning',
      sourcePath: path,
      message: `${path}：${cell.f ? '公式没有缓存结果' : 'Excel 错误单元格'}，按缺失值导入`,
    });
    return null;
  }
  if (cell.v === undefined || cell.v === null) return null;
  if (typeof cell.v === 'number')
    return Number.isFinite(cell.v) ? cell.v : null;
  return String(cell.v);
}

function readSheet(
  sheet: WorkSheet,
  source: TableSource,
  xlsx: SheetJS,
): ImportSheet {
  const range = xlsx.utils.decode_range(sheet['!ref'] ?? 'A1');
  if (
    range.e.r >= DATA_LIMITS.rows ||
    range.e.c >= DATA_LIMITS.columns ||
    (range.e.r + 1) * (range.e.c + 1) > DATA_LIMITS.cells
  )
    throw new Error(`${source.sheetName} 超过数据表上限`);
  const result: ImportSheet = { source, rows: [], hints: {}, diagnostics: [] };
  for (let row = 0; row <= range.e.r; row += 1) {
    result.rows.push(
      Array.from({ length: range.e.c + 1 }, (_, column) => {
        const address = xlsx.utils.encode_cell({ r: row, c: column });
        const cell = sheet[address] as CellObject | undefined;
        if (cell?.t === 'n' && cell.z && xlsx.SSF.is_date(String(cell.z)))
          result.hints[column] = dateHint(String(cell.z));
        return cellValue(
          cell,
          `${source.sheetName}!${address}`,
          result.diagnostics,
        );
      }),
    );
  }
  return result;
}

export async function readWorkbook(
  bytes: ArrayBuffer,
  name: string,
): Promise<ImportSheet[]> {
  if (bytes.byteLength > DATA_LIMITS.fileBytes)
    throw new Error('XLSX 文件超过 10 MiB');
  const signature = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  if (
    signature[0] !== 0x50 ||
    signature[1] !== 0x4b ||
    signature[2] !== 3 ||
    signature[3] !== 4
  )
    throw new Error('文件不是有效的 XLSX 工作簿');
  const xlsx = await import('xlsx');
  const book = xlsx.read(bytes, {
    type: 'array',
    cellNF: true,
    cellFormula: true,
    sheetStubs: true,
  });
  if (!book.SheetNames.length) throw new Error('XLSX 没有可用工作表');
  return book.SheetNames.map((sheetName) =>
    readSheet(
      book.Sheets[sheetName]!,
      {
        kind: 'xlsx',
        name,
        sheetName,
        date1904: Boolean(book.Workbook?.WBProps?.date1904),
      },
      xlsx,
    ),
  );
}
