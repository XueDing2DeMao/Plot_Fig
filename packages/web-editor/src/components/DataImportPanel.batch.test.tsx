// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import type { DataTable } from '@plot-fig/data-binding';
import { DataImportPanel } from './DataImportPanel.js';
import { confirmDataImport } from '../test-utils/import-data.js';

afterEach(cleanup);

it('keeps a rejected batch open and allows retry after reducing the selection', async () => {
  const onImport = vi.fn((tables: DataTable[]) => tables.length === 1);
  render(<DataImportPanel onImport={onImport} />);
  choose([file('a.csv'), file('b.csv')]);
  await ready();
  await confirmDataImport();
  expect(screen.getByRole('dialog', { name: '导入数据' })).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('未能追加数据');
  fireEvent.click(screen.getByRole('checkbox', { name: 'b.csv' }));
  await confirmDataImport();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onImport).toHaveBeenCalledTimes(2);
});

it('isolates invalid table regions and names the excluded table', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  choose([file('a.csv'), file('b.csv')]);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '预览 b.csv' }));
  fireEvent.change(screen.getByLabelText('数据起始行'), {
    target: { value: '999' },
  });
  expect(screen.getByRole('alert')).toHaveTextContent('b.csv');
  await confirmDataImport();
  expect(
    onImport.mock.calls[0]![0].map((t: DataTable) => t.source.name),
  ).toEqual(['a.csv']);
});
const file = (name: string, text = 'X,Y\n1,2') => new File([text], name);
function choose(files: File[]) {
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files },
  });
}
async function ready() {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '确认导入' })).toBeEnabled(),
  );
}
function workbook(name: string) {
  const book = XLSX.utils.book_new();
  for (const sheet of ['First', 'Second'])
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([
        ['X', 'Y'],
        [1, 2],
      ]),
      sheet,
    );
  return new File(
    [XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer],
    name,
  );
}

it('allows picker multiselect and imports same-named files with distinct table identities', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  expect(screen.getByLabelText('选择数据文件')).toHaveAttribute('multiple');
  choose([file('same.csv'), file('same.csv', 'X,Y\n3,4')]);
  await ready();
  expect(onImport).not.toHaveBeenCalled();
  await confirmDataImport();
  const tables = onImport.mock.calls[0]![0] as DataTable[];
  expect(tables.map((t) => t.rows[1])).toEqual([
    ['1', '2'],
    ['3', '4'],
  ]);
  expect(new Set(tables.map((t) => t.tableId)).size).toBe(2);
});

it('identifies each unreadable file while allowing the valid files to be confirmed', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  const tooLarge = file('large.csv');
  Object.defineProperty(tooLarge, 'size', { value: 10 * 1024 * 1024 + 1 });
  choose([
    file('bad.png'),
    file('broken.csv', 'X,Y\n1,"open'),
    tooLarge,
    file('good.tsv', 'X\tY\n5\t6'),
  ]);
  await ready();
  expect(screen.getByRole('alert')).toHaveTextContent(/bad.png.*请选择 CSV/);
  expect(screen.getByRole('alert')).toHaveTextContent(/broken.csv.*引号/);
  expect(screen.getByRole('alert')).toHaveTextContent(/large.csv.*10 MiB/);
  await confirmDataImport();
  expect(
    onImport.mock.calls[0]![0].map((t: DataTable) => t.source.name),
  ).toEqual(['good.tsv']);
});

it('keeps confirmation disabled when every file fails', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  choose([file('bad.png'), file('bad.xlsx')]);
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('bad.xlsx'),
  );
  expect(screen.getByRole('button', { name: '确认导入' })).toBeDisabled();
  expect(onImport).not.toHaveBeenCalled();
});

it('selects the first sheet of each workbook and distinguishes sheets from different files', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  choose([workbook('a.xlsx'), workbook('b.xlsx'), file('c.csv')]);
  await ready();
  expect(
    screen.getByRole('checkbox', { name: 'a.xlsx · First' }),
  ).toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'b.xlsx · First' }),
  ).toBeChecked();
  expect(
    screen.getByRole('checkbox', { name: 'a.xlsx · Second' }),
  ).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: 'b.xlsx · Second' }));
  await confirmDataImport();
  expect(
    onImport.mock.calls[0]![0].map((t: DataTable) => [
      t.source.name,
      t.source.sheetName,
    ]),
  ).toEqual([
    ['a.xlsx', 'First'],
    ['b.xlsx', 'First'],
    ['b.xlsx', 'Second'],
    ['c.csv', undefined],
  ]);
});

it('keeps table-specific regions and excludes unchecked files from the batch', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  choose([file('a.csv'), file('b.csv', 'note,\nX,Y\n7,8'), file('c.csv')]);
  await ready();
  fireEvent.click(screen.getByRole('button', { name: '预览 b.csv' }));
  fireEvent.change(screen.getByLabelText('数据起始行'), {
    target: { value: '3' },
  });
  fireEvent.change(screen.getByLabelText('表头行（0 为无表头）'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'c.csv' }));
  await confirmDataImport();
  const tables = onImport.mock.calls[0]![0] as DataTable[];
  expect(tables).toHaveLength(2);
  expect(tables.map((t) => t.region.dataStartRow)).toEqual([1, 2]);
  expect(tables[1]!.columns.map((c) => c.name)).toEqual(['X', 'Y']);
});

it('cancels a pending batch, stops later reads and ignores the late result in a new session', async () => {
  const onImport = vi.fn();
  let finish!: (text: string) => void;
  const slow = file('slow.csv');
  Object.defineProperty(slow, 'text', {
    value: () =>
      new Promise<string>((r) => {
        finish = r;
      }),
  });
  const later = file('later.csv');
  const laterRead = vi.fn(async () => 'X,Y\n3,4');
  Object.defineProperty(later, 'text', { value: laterRead });
  render(<DataImportPanel onImport={onImport} />);
  choose([slow, later]);
  expect(screen.getByRole('button', { name: '确认导入' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消导入' }));
  choose([file('new.csv')]);
  await ready();
  await act(async () => finish('X,Y\n9,9'));
  expect(laterRead).not.toHaveBeenCalled();
  await confirmDataImport();
  expect(
    onImport.mock.calls[0]![0].map((t: DataTable) => t.source.name),
  ).toEqual(['new.csv']);
});

it('reparses all text files with the selected delimiter', async () => {
  const onImport = vi.fn();
  render(<DataImportPanel onImport={onImport} />);
  choose([file('a.txt', 'X;Y\n1;2'), file('b.txt', 'X;Y\n3;4')]);
  await ready();
  fireEvent.change(screen.getByLabelText('分隔符'), { target: { value: ';' } });
  await ready();
  await confirmDataImport();
  expect(onImport.mock.calls[0]![0].map((t: DataTable) => t.rows[1])).toEqual([
    ['1', '2'],
    ['3', '4'],
  ]);
});

it.each(['count', 'bytes'])(
  'rejects an oversized batch before reading (%s)',
  async (mode) => {
    const onImport = vi.fn();
    const files = Array.from({ length: mode === 'count' ? 51 : 11 }, (_, i) =>
      file(`${i}.csv`),
    );
    if (mode === 'bytes')
      for (const f of files)
        Object.defineProperty(f, 'size', { value: 10 * 1024 * 1024 });
    render(<DataImportPanel onImport={onImport} />);
    choose(files);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      mode === 'count' ? '50' : '100 MiB',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  },
);
