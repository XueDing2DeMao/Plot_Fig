// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { DataImportPanel } from './DataImportPanel.js';
import { confirmDataImport } from '../test-utils/import-data.js';
import { organizeTable, type DataTable } from '@plot-fig/data-binding';

afterEach(cleanup);
function paste(text: string) {
  fireEvent.click(screen.getByRole('button', { name: '从剪贴板粘贴' }));
  fireEvent.change(screen.getByLabelText('粘贴表格文本'), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: '预览文本' }));
}
describe('import draft isolation', () => {
  it('previews a dropped file and only imports after confirmation', async () => {
    const onImport = vi.fn();
    const text = 'X,Y\n0,1\n1,2';
    const file = new File([text], 'dropped.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => text });
    render(<DataImportPanel onImport={onImport} />);
    fireEvent.drop(screen.getByRole('button', { name: '选择文件' }), {
      dataTransfer: { files: [file], types: ['Files'] },
    });
    expect(
      await screen.findByRole('heading', { name: 'dropped.csv' }),
    ).toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
    await confirmDataImport();
    expect(onImport.mock.calls[0]?.[0][0].rows).toEqual([
      ['X', 'Y'],
      ['0', '1'],
      ['1', '2'],
    ]);
  });

  it('rejects a multi-file drop without silently importing only the first', () => {
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    fireEvent.drop(screen.getByRole('button', { name: '选择文件' }), {
      dataTransfer: {
        files: [new File(['X,Y'], 'a.csv'), new File(['X,Y'], 'b.csv')],
        types: ['Files'],
      },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      '每次请导入一个文件，可重复追加。',
    );
    expect(
      screen.queryByRole('dialog', { name: '导入数据' }),
    ).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('validates dropped files using the existing import rules', async () => {
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    fireEvent.drop(screen.getByRole('button', { name: '选择文件' }), {
      dataTransfer: {
        files: [new File(['not a table'], 'image.png')],
        types: ['Files'],
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '请选择 CSV、TXT、TSV 或 XLSX 文件',
    );
    expect(screen.getByRole('button', { name: '确认导入' })).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('defaults imported columns to numbers while preserving unconvertible raw values', async () => {
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    paste('X,Y\n0,bad\n1,2.5\n2,1e3');
    await confirmDataImport();
    const table = onImport.mock.calls[0]![0][0] as DataTable;
    expect(table.columns.map((column) => column.settings.type)).toEqual([
      'number',
      'number',
    ]);
    expect(organizeTable(table).columns[1]!.values).toEqual([null, 2.5, 1000]);
    expect(table.rows[1]![1]).toBe('bad');
  });
  it('previews 100 original rows and imports a data region after row ten', async () => {
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    const rows = [
      ...Array.from({ length: 20 }, (_, index) => `note-${index + 1},`),
      'X,Y',
      ...Array.from({ length: 90 }, (_, index) => `${index},${index * 2}`),
    ];
    paste(rows.join('\n'));
    const preview = within(
      screen.getByRole('table', { name: '原始数据前 100 行 · 行号从 1 开始' }),
    );
    expect(preview.getAllByRole('row')).toHaveLength(100);
    expect(preview.getByRole('cell', { name: '156' })).toBeInTheDocument();
    expect(
      preview.queryByRole('cell', { name: '158' }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('数据起始行'), {
      target: { value: '22' },
    });
    fireEvent.change(screen.getByLabelText('表头行（0 为无表头）'), {
      target: { value: '21' },
    });
    await confirmDataImport();
    const table = onImport.mock.calls[0]![0][0] as DataTable;
    expect(table.columns.map((column) => column.name)).toEqual(['X', 'Y']);
    expect(organizeTable(table).columns[1]!.values).toHaveLength(90);
    expect(organizeTable(table).columns[1]!.values[0]).toBe(0);
  });
  it('requires a new preview after clipboard text is edited', () => {
    render(<DataImportPanel onImport={vi.fn()} />);
    paste('X,Y\n1,2');
    expect(screen.getByRole('button', { name: '确认导入' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('粘贴表格文本'), {
      target: { value: 'X,Y\n3,4' },
    });
    expect(screen.getByRole('button', { name: '确认导入' })).toBeDisabled();
  });
  it('uses the explicit Tab option and preserves blank rows', async () => {
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    paste('X\tY\n1\t2\n\n3\t4');
    const tab = screen.getByRole('option', {
      name: 'Tab',
    }) as HTMLOptionElement;
    fireEvent.change(screen.getByLabelText('分隔符'), {
      target: { value: tab.value },
    });
    await confirmDataImport();
    expect(onImport.mock.calls[0]?.[0][0].rows).toEqual([
      ['X', 'Y'],
      ['1', '2'],
      [''],
      ['3', '4'],
    ]);
  });
  it('does not commit malformed quotes or an old asynchronous file read', async () => {
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    let finish: (text: string) => void = () => {};
    const old = new File([''], 'old.csv');
    Object.defineProperty(old, 'text', {
      value: () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    });
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [old] },
    });
    fireEvent.click(screen.getByRole('button', { name: '取消导入' }));
    paste('X,Y\n1,"open');
    expect(screen.getByRole('button', { name: '确认导入' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/引号/);
    finish('X,Y\n1,2');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '确认导入' })).toBeDisabled(),
    );
    expect(onImport).not.toHaveBeenCalled();
  });
  it('imports multiple worksheets selected from an actual XLSX file', async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['X', 'Y'],
        [1, 2],
      ]),
      'First',
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['X', 'Y'],
        [3, 4],
      ]),
      'Second',
    );
    const bytes = XLSX.write(book, {
      type: 'array',
      bookType: 'xlsx',
    }) as ArrayBuffer;
    const file = new File([bytes], 'book.xlsx');
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes });
    const onImport = vi.fn();
    render(<DataImportPanel onImport={onImport} />);
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [file] },
    });
    const second = await screen.findByRole('checkbox', { name: /Second/ });
    fireEvent.click(second);
    await confirmDataImport();
    expect(
      onImport.mock.calls[0]?.[0].map(
        (table: { source: { sheetName: string } }) => table.source.sheetName,
      ),
    ).toEqual(['First', 'Second']);
  });
});
