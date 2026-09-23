import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  detectHeaderRow,
  makePreview,
  parsePreviewRows,
  readCsvFile,
  suggestBindings,
  toCanonicalCsv,
  type CsvImportOptions,
  type CsvImportPreview,
} from './csv-import.js';
import './csv-import.css';

type Props = {
  template: FigureTemplate;
  onImport: (
    csvText: string,
    overrides: Record<string, string>,
    sourceName?: string,
  ) => void;
  onFileSelected?: (file: File) => void;
};
const initial: CsvImportOptions = {
  encoding: 'utf-8',
  delimiter: ',',
  headerRow: 0,
  dataStartRow: 1,
};
const delimiterNames = {
  ',': '逗号 (,)',
  '\t': '制表符 (Tab)',
  ';': '分号 (;)',
} as const;

export function CsvImportDialog({ template, onImport, onFileSelected }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<CsvImportPreview>();
  const [options, setOptions] = useState(initial);
  const [error, setError] = useState('');
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoDelimiter, setAutoDelimiter] = useState(true);
  const setOption = <K extends keyof CsvImportOptions>(
    key: K,
    value: CsvImportOptions[K],
  ) => setOptions((current) => ({ ...current, [key]: value }));
  const rows = preview?.rows ?? [];
  const selected = useMemo(
    () => suggestBindings(rows, options, file?.name ?? 'data.csv'),
    [rows, options, file?.name],
  );
  const columns = selected.data.columns;

  useEffect(() => {
    if (!file) return;
    let active = true;
    setLoading(true);
    setError('');
    readCsvFile(file, options.encoding)
      .then(({ text, detectedEncoding }) => {
        if (!active) return;
        const delimiter = autoDelimiter
          ? detectDelimiter(text)
          : options.delimiter;
        const headerRow = detectHeaderRow(parsePreviewRows(text, delimiter));
        const parsed = makePreview(
          text,
          {
            ...options,
            delimiter,
            headerRow,
            dataStartRow: detectDataStartRow(text, delimiter, headerRow),
          },
          detectedEncoding,
        );
        setOptions(parsed.options);
        setPreview(parsed);
        setLoading(false);
        const isSimpleCsv =
          parsed.options.headerRow === 0 &&
          parsed.options.dataStartRow === 1 &&
          parsed.options.delimiter === ',' &&
          detectedEncoding === 'UTF-8';
        if (isSimpleCsv) {
          const suggested = suggestBindings(
            parsed.rows,
            parsed.options,
            file.name,
          );
          const overrides: Record<string, string> = {
            'slot-x': suggested.x,
            'slot-y': suggested.y,
          };
          onImport(
            toCanonicalCsv([
              parsed.rows[0] ?? [],
              ...parsed.rows.slice(1).filter((row) => row.some(Boolean)),
            ]),
            overrides,
            file.name,
          );
          setPreview(undefined);
          closeDialog(dialog);
        }
      })
      .catch(() => {
        if (active) {
          setError('文件无法读取，请尝试切换编码后重试。');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [file, options.encoding, options.delimiter, autoDelimiter]);

  useEffect(() => {
    if (!preview) return;
    const suggestion = suggestBindings(
      preview.rows,
      options,
      file?.name ?? 'data.csv',
    );
    setX((current) => current || suggestion.x);
    setY((current) => current || suggestion.y);
  }, [preview, options, file?.name]);

  const open = (next: File) => {
    onFileSelected?.(next);
    setFile(next);
    setPreview(undefined);
    setX('');
    setY('');
    setOptions(initial);
    setAutoDelimiter(true);
    if (dialog.current?.showModal) dialog.current.showModal();
    else dialog.current?.setAttribute('open', '');
  };
  const close = () => closeDialog(dialog);
  const apply = () => {
    if (!preview || !file) return;
    const rowsToImport = [
      rows[options.headerRow] ?? [],
      ...rows.slice(options.dataStartRow).filter((row) => row.some(Boolean)),
    ];
    const overrides: Record<string, string> = {};
    if (x)
      overrides[
        template.dataSlots.find((slot) => slot.role === 'x')?.dataSlotId ??
          'slot-x'
      ] = x;
    if (y)
      overrides[
        template.dataSlots.find((slot) => slot.role === 'y')?.dataSlotId ??
          'slot-y'
      ] = y;
    onImport(toCanonicalCsv(rowsToImport), overrides, file.name);
    close();
  };

  return (
    <>
      <label htmlFor="csv-file">选择 CSV 文件</label>
      <small className="file-format-hint">
        支持 CSV、TSV、TXT；复杂文件会先打开预览
      </small>
      <input
        id="csv-file"
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (next) open(next);
        }}
      />
      <dialog
        ref={dialog}
        className="csv-dialog"
        aria-labelledby="csv-dialog-title"
      >
        <div className="csv-dialog-head">
          <div>
            <p className="section-kicker">数据导入</p>
            <h2 id="csv-dialog-title">预览并选择要绘图的数据</h2>
          </div>
          <button type="button" onClick={close} aria-label="关闭数据预览">
            ×
          </button>
        </div>
        {loading && <p className="empty-copy">正在读取文件…</p>}
        {error && (
          <p className="csv-error" role="alert">
            {error}
          </p>
        )}
        {preview && (
          <>
            <div className="csv-options">
              <label>
                编码
                <select
                  value={options.encoding}
                  onChange={(event) =>
                    setOption(
                      'encoding',
                      event.target.value as CsvImportOptions['encoding'],
                    )
                  }
                >
                  <option value="utf-8">
                    自动 / UTF-8（检测到 {preview.detectedEncoding}）
                  </option>
                  <option value="gb18030">中文本地编码（GB18030）</option>
                  <option value="utf-16le">UTF-16 LE</option>
                </select>
              </label>
              <label>
                分隔符
                <select
                  value={autoDelimiter ? 'auto' : options.delimiter}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAutoDelimiter(value === 'auto');
                    if (value !== 'auto')
                      setOption(
                        'delimiter',
                        value as CsvImportOptions['delimiter'],
                      );
                  }}
                >
                  <option value="auto">
                    自动检测（{delimiterNames[options.delimiter]}）
                  </option>
                  {Object.entries(delimiterNames).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                表头行
                <select
                  value={options.headerRow}
                  onChange={(event) =>
                    setOption('headerRow', Number(event.target.value))
                  }
                >
                  {rows.slice(0, 80).map((_, index) => (
                    <option key={index} value={index}>
                      第 {index + 1} 行
                    </option>
                  ))}
                </select>
              </label>
              <label>
                数据起始行
                <select
                  value={options.dataStartRow}
                  onChange={(event) =>
                    setOption('dataStartRow', Number(event.target.value))
                  }
                >
                  {rows.slice(options.headerRow + 1, 80).map((_, index) => {
                    const row = index + options.headerRow + 1;
                    return (
                      <option key={row} value={row}>
                        第 {row + 1} 行
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <p className="csv-hint">
              共 {rows.length.toLocaleString()} 行，已定位到第{' '}
              {options.headerRow + 1}{' '}
              行表头；导入会跳过表头之前和数据起始行之前的说明。
            </p>
            <div className="csv-table-wrap">
              <table>
                <caption>前 12 行数据预览</caption>
                <thead>
                  <tr>
                    {(rows[options.headerRow] ?? []).map((cell, index) => (
                      <th key={index}>{cell || `列 ${index + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice(options.dataStartRow, options.dataStartRow + 12)
                    .map((row, index) => (
                      <tr key={index}>
                        {(rows[options.headerRow] ?? []).map((_, cell) => (
                          <td key={cell}>{row[cell] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="csv-binding">
              <label>
                X 轴数据
                <select
                  value={x}
                  onChange={(event) => setX(event.target.value)}
                >
                  <option value="">自动选择</option>
                  {columns.map((column) => (
                    <option key={column.columnId} value={column.columnId}>
                      {column.name} · {column.valueType}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Y 轴数据
                <select
                  value={y}
                  onChange={(event) => setY(event.target.value)}
                >
                  <option value="">自动选择</option>
                  {columns.map((column) => (
                    <option key={column.columnId} value={column.columnId}>
                      {column.name} · {column.valueType}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="csv-dialog-actions">
              <button type="button" onClick={close}>
                取消
              </button>
              <button
                type="button"
                className="primary"
                onClick={apply}
                disabled={!x || !y}
              >
                导入并绘图
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

function closeDialog(dialog: RefObject<HTMLDialogElement | null>) {
  dialog.current?.close?.();
  dialog.current?.removeAttribute('open');
}

function detectDelimiter(text: string): CsvImportOptions['delimiter'] {
  const line =
    text.split(/\r\n|\n|\r/).find((candidate) => candidate.trim()) ?? '';
  return line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
}
function detectDataStartRow(
  text: string,
  delimiter: string,
  headerRow: number,
): number {
  const rows = parsePreviewRows(text, delimiter);
  for (let index = headerRow + 1; index < rows.length; index += 1) {
    const populated = rows[index]?.filter((cell) => cell.trim() !== '') ?? [];
    const numeric = populated.filter((cell) =>
      Number.isFinite(Number(cell)),
    ).length;
    if (populated.length > 0 && numeric / populated.length >= 0.5) return index;
  }
  return headerRow + 1;
}
