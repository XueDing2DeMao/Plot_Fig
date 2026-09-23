// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App.js';
import {
  confirmDataImport,
  confirmPlot,
  openDataPreview,
  closeDataPreview,
  openCurveBinding,
} from './test-utils/import-data.js';
async function importText(text: string, name: string) {
  const file = new File([text], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', { value: async () => text });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
}
describe('multi-table setup and preview dialog', () => {
  afterEach(cleanup);
  it('binds two tables independently and switches the table preview without changing the graph', async () => {
    render(<App />);
    await importText('X,Y\n0,1\n1,2', 'a.csv');
    await importText('X\tY\n10\t20\n20\t40', 'b.txt');
    openDataPreview();
    expect(
      screen.getByLabelText('当前数据表').querySelectorAll('option'),
    ).toHaveLength(2);
    closeDataPreview();
    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
      target: { value: 'table-1-1' },
    });
    confirmPlot();
    const preview = screen.getByTestId('svg-preview');
    expect(preview.querySelectorAll('[data-role="plot-slot"]')).toHaveLength(2);
    const before = preview.innerHTML;
    openDataPreview();
    fireEvent.change(screen.getByLabelText('当前数据表'), {
      target: { value: 'table-1' },
    });
    closeDataPreview();
    expect(preview.innerHTML).toBe(before);
    expect(screen.getByLabelText('曲线 2 数据表')).toHaveValue('table-1-1');
  });
  it('edits raw column settings inside the preview and retains invalid values for correction', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '从剪贴板粘贴' }));
    fireEvent.change(screen.getByLabelText('粘贴表格文本'), {
      target: { value: 'X\tY\n0\tbad\n1\t3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '预览文本' }));
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }));
    openDataPreview();
    fireEvent.click(screen.getByRole('button', { name: '设置 Y 列' }));
    fireEvent.change(screen.getByLabelText('列类型'), {
      target: { value: 'number' },
    });
    fireEvent.change(screen.getByLabelText('单位'), { target: { value: 'N' } });
    fireEvent.click(screen.getByRole('button', { name: '应用列设置' }));
    expect(screen.getByText(/无法转换为 number/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '设置 Y 列' }));
    fireEvent.change(screen.getByLabelText('列类型'), {
      target: { value: 'string' },
    });
    fireEvent.click(screen.getByRole('button', { name: '应用列设置' }));
    expect(
      within(screen.getByRole('region', { name: '数据表预览' })).getByText(
        'bad',
      ),
    ).toBeInTheDocument();
    closeDataPreview();
    confirmPlot();
    expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
  });
  it('cancels an import without replacing prepared data', async () => {
    render(<App />);
    await importText('X,Y\n0,1\n1,2', 'a.csv');
    fireEvent.click(screen.getByRole('button', { name: '追加数据' }));
    fireEvent.click(screen.getByRole('button', { name: '从剪贴板粘贴' }));
    fireEvent.change(screen.getByLabelText('粘贴表格文本'), {
      target: { value: 'different,data\n9,8' },
    });
    fireEvent.click(screen.getByRole('button', { name: '取消导入' }));
    openDataPreview();
    expect(
      screen.getByLabelText('当前数据表').querySelectorAll('option'),
    ).toHaveLength(1);
    closeDataPreview();
    confirmPlot();
    expect(
      screen.getByTestId('svg-preview').querySelector('svg'),
    ).not.toBeNull();
  });
  it('removes an inactive table in the dialog with confirmation and can reset pending removal', async () => {
    render(<App />);
    await importText('X,Y\n0,1\n1,2', 'a.csv');
    await importText('X,Y\n0,10\n1,20', 'b.csv');
    confirmPlot();
    openDataPreview();
    fireEvent.click(screen.getByRole('button', { name: '删除表 a.csv' }));
    let dialog = within(screen.getByRole('dialog', { name: '移除数据表' }));
    expect(dialog.getByText(/受影响：曲线 1/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: '取消' }));
    expect(screen.getByLabelText('当前数据表')).toHaveValue('table-1-1');
    fireEvent.click(screen.getByRole('button', { name: '删除表 a.csv' }));
    dialog = within(screen.getByRole('dialog', { name: '移除数据表' }));
    fireEvent.click(dialog.getByRole('button', { name: '确认移除' }));
    expect(
      screen.queryByRole('button', { name: '预览表 a.csv' }),
    ).not.toBeInTheDocument();
    closeDataPreview();
    expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('');
    confirmPlot();
    expect(
      screen.getByTestId('svg-preview').querySelector('svg'),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重置待绘图设置' }));
    expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('table-1');
  });
  it('keeps bindings during rename and removes only references to the selected table', async () => {
    render(<App />);
    await importText('X,Y\n0,1\n1,2', 'a.csv');
    await importText('X,Y\n0,10\n1,20', 'b.csv');
    fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
    fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
      target: { value: 'table-1-1' },
    });
    confirmPlot();
    const before = screen.getByTestId('svg-preview').innerHTML;
    openDataPreview();
    fireEvent.change(screen.getByLabelText('表名称'), {
      target: { value: 'Second table' },
    });
    fireEvent.click(screen.getByRole('button', { name: '重命名' }));
    fireEvent.click(screen.getByRole('button', { name: '移除数据表' }));
    const dialog = within(screen.getByRole('dialog', { name: '移除数据表' }));
    expect(dialog.getByText(/受影响：曲线 2/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: '确认移除' }));
    closeDataPreview();
    openCurveBinding(1);
    expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('table-1');
    openCurveBinding(2);
    expect(screen.getByLabelText('曲线 2 数据表')).toHaveValue('');
    expect(screen.getByTestId('svg-preview').innerHTML).toBe(before);
    fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
      target: { value: 'table-1' },
    });
    confirmPlot();
    expect(screen.getByRole('button', { name: '保存项目' })).toBeEnabled();
    expect(
      screen
        .getByTestId('svg-preview')
        .querySelectorAll('[data-role="plot-slot"]'),
    ).toHaveLength(2);
  });
});
