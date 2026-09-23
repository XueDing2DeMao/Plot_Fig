// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import App from './App.js';
import {
  confirmDataImport,
  confirmPlot,
  openCurveBinding,
} from './test-utils/import-data.js';

vi.mock('./templates/library-storage.js', async (original) => ({
  ...(await original<object>()),
  listTemplates: async () => [],
}));
afterEach(cleanup);
async function loadTables() {
  const files = ['a', 'b'].map((name, i) => {
    const text = `X,Y,Z\n0,${1 + i * 20},5\n1,${2 + i * 20},6`;
    const file = new File([text], name + '.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: async () => text });
    return file;
  });
  for (const file of files) {
    fireEvent.change(screen.getByLabelText('选择数据文件'), {
      target: { files: [file] },
    });
    await confirmDataImport();
  }
}

async function createTableLayers() {
  await loadTables();
  confirmPlot();
  fireEvent.click(screen.getByRole('button', { name: '新建图层' }));
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('曲线 1 数据表'), {
    target: { value: 'table-1-1' },
  });
  confirmPlot();
  fireEvent.click(screen.getAllByRole('tab')[0]!);
}

it('creates and selects a blank layer before importing data, then allows adding a curve', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '新建图层' }));
  const tabs = within(
    screen.getByRole('tablist', { name: '预览图层' }),
  ).getAllByRole('tab');
  expect(tabs).toHaveLength(2);
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  expect(
    screen.queryByRole('group', { name: /曲线 \d+ 数据绑定/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('');
});

it('preserves existing tables and pending bindings when creating a new layer', async () => {
  render(<App />);
  await loadTables();
  confirmPlot();
  fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
    target: { value: 'z' },
  });
  fireEvent.click(screen.getByRole('button', { name: '新建图层' }));
  const tabs = within(
    screen.getByRole('tablist', { name: '预览图层' }),
  ).getAllByRole('tab');
  expect(tabs).toHaveLength(2);
  expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(tabs[0]!);
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('z');
  expect(
    screen.getByLabelText('曲线 1 数据表').querySelectorAll('option'),
  ).toHaveLength(3);
  expect(screen.getByTestId('svg-preview').querySelector('svg')).not.toBeNull();
  fireEvent.click(tabs[1]!);
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('曲线 1 数据表'), {
    target: { value: 'table-1-1' },
  });
  confirmPlot();
  expect(
    screen.getByTestId('svg-preview').querySelector('[data-role="plot-slot"]'),
  ).not.toBeNull();
});

it('stops quick creation at the existing sixteen-layer limit', () => {
  render(<App />);
  for (let i = 0; i < 15; i++)
    fireEvent.click(screen.getByRole('button', { name: '新建图层' }));
  expect(
    within(screen.getByRole('tablist', { name: '预览图层' })).getAllByRole(
      'tab',
    ),
  ).toHaveLength(16);
  expect(screen.getByRole('button', { name: '新建图层' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '新建图层' })).toHaveAttribute(
    'title',
    '最多支持 16 个图层',
  );
});

it('creates table layers in the main preview and keeps cross-table edits on the selected layer', async () => {
  render(<App />);
  await createTableLayers();
  const preview = screen.getByTestId('svg-preview');
  expect(preview.querySelectorAll('[data-role="panel"]')).toHaveLength(1);
  const tabs = within(
    screen.getByRole('tablist', { name: '预览图层' }),
  ).getAllByRole('tab');
  expect(tabs).toHaveLength(2);
  const firstId = preview
    .querySelector('[data-role="panel"]')!
    .getAttribute('data-panel-id');
  fireEvent.click(tabs[1]!);
  expect(preview.querySelectorAll('[data-role="panel"]')).toHaveLength(1);
  expect(
    preview.querySelector('[data-role="panel"]')!.getAttribute('data-panel-id'),
  ).not.toBe(firstId);
  const firstTableId = (
    screen.getByLabelText('曲线 1 数据表') as HTMLSelectElement
  ).options[1]!.value;
  const secondTableId = (
    screen.getByLabelText('曲线 1 数据表') as HTMLSelectElement
  ).value;
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
    target: { value: firstTableId },
  });
  confirmPlot();
  expect(preview.querySelectorAll('[data-role="plot-slot"]')).toHaveLength(2);
  openCurveBinding(1);
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue(secondTableId);
  openCurveBinding(2);
  expect(screen.getByLabelText('曲线 2 数据表')).toHaveValue(firstTableId);
  fireEvent.click(tabs[0]!);
  expect(preview.querySelectorAll('[data-role="plot-slot"]')).toHaveLength(1);
  expect(screen.queryByLabelText('曲线 2 数据表')).not.toBeInTheDocument();
});

it('deletes a preview layer only after confirmation while retaining tables and the final layer', async () => {
  render(<App />);
  await createTableLayers();
  fireEvent.click(screen.getByRole('button', { name: '删除当前图层' }));
  const dialog = screen.getByRole('dialog', { name: '删除图层' });
  expect(dialog).toHaveTextContent('原始数据表保留');
  fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
  expect(screen.getAllByRole('tab')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: '删除当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '确认删除图层' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const tableSelect = screen.getByLabelText(
    '曲线 1 数据表',
  ) as HTMLSelectElement;
  expect(tableSelect.selectedOptions[0]).toHaveTextContent('b.csv');
  expect(tableSelect.options).toHaveLength(3);
  expect(
    screen.getByTestId('svg-preview').querySelectorAll('[data-role="panel"]'),
  ).toHaveLength(1);
  expect(screen.getByRole('button', { name: '删除当前图层' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  expect(screen.getByRole('menuitem', { name: 'X 轴…' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
  fireEvent.click(screen.getByRole('button', { name: '图层管理' }));
  expect(screen.getByRole('menuitem', { name: '图层属性…' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '图层管理' }));
  fireEvent.click(screen.getByRole('button', { name: '导出图形' }));
  fireEvent.click(screen.getByRole('button', { name: '批量导出图层' }));
  const exportedLayers = within(
    screen.getByRole('group', { name: /^选择导出图层/ }),
  ).getAllByRole('checkbox');
  expect(exportedLayers).toHaveLength(1);
});

it('preserves pending cross-table edits on a retained layer when another layer is deleted', async () => {
  render(<App />);
  await createTableLayers();
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  const secondTableId = (
    screen.getByLabelText('曲线 2 数据表') as HTMLSelectElement
  ).options[2]!.value;
  fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
    target: { value: secondTableId },
  });
  fireEvent.click(screen.getAllByRole('tab')[1]!);
  fireEvent.click(screen.getByRole('button', { name: '删除当前图层' }));
  fireEvent.click(screen.getByRole('button', { name: '确认删除图层' }));
  expect(
    screen
      .getByTestId('svg-preview')
      .querySelectorAll('[data-role="plot-slot"]'),
  ).toHaveLength(2);
  openCurveBinding(2);
  expect(screen.getByLabelText('曲线 2 数据表')).toHaveValue(secondTableId);
  expect(screen.getByRole('button', { name: '重置待绘图设置' })).toBeDisabled();
});
