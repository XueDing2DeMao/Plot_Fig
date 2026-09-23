// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import App from './App.js';
import { confirmDataImport, confirmPlot } from './test-utils/import-data.js';

afterEach(cleanup);
async function loadData() {
  render(<App />);
  const text = 'Time,Control,Treatment\n0,1,2\n1,3,5';
  const file = new File([text], 'curves.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => text });
  fireEvent.change(screen.getByLabelText('选择数据文件'), {
    target: { files: [file] },
  });
  await confirmDataImport();
}
function add() {
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
}
function open(index: number) {
  fireEvent.click(
    screen.getByRole('button', { name: `展开曲线 ${index} 数据绑定` }),
  );
}

it('keeps twenty curves in summaries and preserves bindings when switching the single editor', async () => {
  await loadData();
  for (let i = 1; i < 20; i++) add();
  expect(
    screen.getAllByRole('group', { name: /曲线 \d+ 数据绑定/ }),
  ).toHaveLength(20);
  expect(
    document.querySelectorAll('.series-summary[aria-expanded="true"]'),
  ).toHaveLength(1);
  expect(screen.queryByLabelText('曲线 1 数据表')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('曲线 20 Y 数据列'), {
    target: { value: 'treatment' },
  });
  open(1);
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('control');
  open(20);
  expect(screen.getByLabelText('曲线 20 Y 数据列')).toHaveValue('treatment');
  expect(
    screen.getByRole('button', { name: '收起曲线 20 数据绑定' }),
  ).toHaveTextContent('Treatment');
  expect(
    screen
      .getByRole('button', { name: '新增曲线' })
      .closest('.binding-panel-heading'),
  ).not.toBeNull();
});

it('expands and focuses a copied curve, keeping its identity when moved and deleted', async () => {
  await loadData();
  fireEvent.click(screen.getByRole('button', { name: '复制曲线 1' }));
  await waitFor(() =>
    expect(screen.getByLabelText('曲线 2 数据表')).toHaveFocus(),
  );
  fireEvent.change(screen.getByLabelText('曲线 2 Y 数据列'), {
    target: { value: 'treatment' },
  });
  fireEvent.click(screen.getByRole('button', { name: '上移曲线 2' }));
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('treatment');
  expect(
    document.querySelectorAll('.series-summary[aria-expanded="true"]'),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '删除曲线 1' }));
  expect(screen.getByLabelText('曲线 1 Y 数据列')).toHaveValue('control');
  expect(screen.getByRole('button', { name: '删除曲线 1' })).toBeDisabled();
});

it('shows errors on collapsed curves and reveals the first invalid binding on apply', async () => {
  await loadData();
  add();
  fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
    target: { value: '' },
  });
  open(1);
  expect(
    screen.getByRole('button', { name: '展开曲线 2 数据绑定' }),
  ).toHaveTextContent('待绑定');
  confirmPlot();
  await waitFor(() =>
    expect(screen.getByLabelText('曲线 2 数据表')).toHaveFocus(),
  );
  expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
});

it('reveals cross-table additions without applying the pending draft', async () => {
  await loadData();
  confirmPlot();
  const before = screen.getByTestId('svg-preview').innerHTML;
  fireEvent.change(screen.getByLabelText('曲线 1 Y 数据列'), {
    target: { value: 'treatment' },
  });
  expect(screen.getByTestId('svg-preview').innerHTML).toBe(before);
  fireEvent.click(screen.getByRole('button', { name: '新增曲线' }));
  await waitFor(() =>
    expect(screen.getByLabelText('曲线 2 数据表')).toHaveFocus(),
  );
  expect(screen.getByTestId('svg-preview').innerHTML).toBe(before);
  confirmPlot();
  expect(screen.getByTestId('svg-preview')).toHaveTextContent('Treatment');
});

it('reveals an invalid curve on another linked layer when applying the combined figure', async () => {
  await loadData();
  add();
  fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
    target: { value: 'stacked-shared-x' },
  });
  confirmPlot();
  const [first, second] = screen.getAllByRole('tab');
  fireEvent.click(second!);
  fireEvent.change(screen.getByLabelText('曲线 1 数据表'), {
    target: { value: '' },
  });
  fireEvent.click(first!);
  confirmPlot();
  expect(second).toHaveAttribute('aria-selected', 'true');
  await waitFor(() =>
    expect(screen.getByLabelText('曲线 1 数据表')).toHaveFocus(),
  );
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('');
});

it('reveals errors in a newly drafted layer without applying the invalid preset', async () => {
  await loadData();
  add();
  fireEvent.change(screen.getByLabelText('曲线 2 数据表'), {
    target: { value: '' },
  });
  fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
    target: { value: 'stacked-shared-x' },
  });
  const [first, second] = screen.getAllByRole('tab');
  confirmPlot();
  expect(second).toHaveAttribute('aria-selected', 'true');
  await waitFor(() =>
    expect(screen.getByLabelText('曲线 1 数据表')).toHaveFocus(),
  );
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('');
  expect(screen.getByTestId('svg-preview').querySelector('svg')).toBeNull();
  fireEvent.click(first!);
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('table-1');
  fireEvent.click(second!);
  expect(screen.getByLabelText('曲线 1 数据表')).toHaveValue('');
});

it('uses the preview tabs as the only layer switch while keeping linked layers together', async () => {
  await loadData();
  add();
  fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
    target: { value: 'stacked-shared-x' },
  });
  confirmPlot();
  expect(
    screen.queryByRole('combobox', { name: '当前图层' }),
  ).not.toBeInTheDocument();
  const before = screen.getByTestId('svg-preview').innerHTML;
  const [first, second] = screen.getAllByRole('tab');
  fireEvent.keyDown(first!, { key: 'End' });
  expect(second).toHaveAttribute('aria-selected', 'true');
  expect(second).toHaveFocus();
  expect(screen.getByTestId('svg-preview').innerHTML).toBe(before);
  expect(
    screen.getByTestId('svg-preview').querySelectorAll('[data-role="panel"]'),
  ).toHaveLength(2);
  fireEvent.keyDown(second!, { key: 'Home' });
  expect(first).toHaveAttribute('aria-selected', 'true');
});

it('routes axis commands to the selected draft layer after applying it', async () => {
  await loadData();
  add();
  fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
    target: { value: 'stacked-shared-x' },
  });
  fireEvent.click(screen.getAllByRole('tab')[1]!);
  expect(
    screen.getByText('当前图层尚未应用，画布将在应用修改后更新。'),
  ).toBeInTheDocument();
  confirmPlot();
  expect(
    screen.queryByText('当前图层尚未应用，画布将在应用修改后更新。'),
  ).not.toBeInTheDocument();
  const panelId = screen
    .getByTestId('svg-preview')
    .querySelectorAll('[data-role="panel"]')[1]!
    .getAttribute('data-panel-id');
  const targets: unknown[] = [];
  const opened = (event: Event) =>
    targets.push((event as CustomEvent).detail.target);
  window.addEventListener('plotfig:open-properties', opened);
  try {
    fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Y 轴/ }));
    expect(targets).toEqual([
      expect.objectContaining({ kind: 'axis', panelId }),
    ]);
  } finally {
    window.removeEventListener('plotfig:open-properties', opened);
  }
});

it.each(['reset', 'chart choice'] as const)(
  'restores axis commands after discarding the selected draft layer via %s',
  async (action) => {
    await loadData();
    confirmPlot();
    add();
    fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
      target: { value: 'stacked-shared-x' },
    });
    fireEvent.click(screen.getAllByRole('tab')[1]!);
    fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
    expect(screen.getByRole('menuitem', { name: /Y 轴/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
    if (action === 'reset')
      fireEvent.click(screen.getByRole('button', { name: '重置待绘图设置' }));
    else
      fireEvent.change(screen.getByLabelText('图表类型', { exact: true }), {
        target: { value: 'xy' },
      });
    expect(
      screen.queryByRole('tablist', { name: '预览图层' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '坐标轴' }));
    expect(screen.getByRole('menuitem', { name: /Y 轴/ })).toBeEnabled();
  },
);
