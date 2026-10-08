// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { MatrixHeatmapDialog } from './MatrixHeatmapDialog.js';
afterEach(cleanup);
function setup(onApply = vi.fn()) {
  const table = createDataTable({
    tableId: 'data',
    source: { kind: 'csv', name: 'XRD.csv' },
    rows: [
      ['x', 'A', 'B'],
      [1, 2, 3],
      [2, 4, 5],
    ],
  });
  const onClose = vi.fn();
  render(
    <MatrixHeatmapDialog
      panelId="panel-main"
      workspace={{ ...emptyWorkspace(), tables: [table] }}
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { table, onApply, onClose };
}
it('默认首列坐标、全部强度列和完整行范围；支持搜索与批选', () => {
  const { table, onApply, onClose } = setup();
  expect(
    within(screen.getByRole('group', { name: '强度 Z 数据列' })).getAllByRole(
      'checkbox',
    ),
  ).toHaveLength(2);
  expect(screen.getByRole('status')).toHaveTextContent('2 行 × 2 列 = 4');
  fireEvent.click(screen.getByRole('button', { name: '清空选择' }));
  expect(screen.getByRole('button', { name: '生成热图' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('搜索强度列'), {
    target: { value: 'B' },
  });
  fireEvent.click(screen.getByRole('button', { name: '全选搜索结果' }));
  fireEvent.click(screen.getByRole('button', { name: '生成热图' }));
  expect(onApply).toHaveBeenCalledWith({
    panelId: 'panel-main',
    tableId: table.tableId,
    coordinateColumnId: table.columns[0]!.columnId,
    valueColumnIds: [table.columns[2]!.columnId],
    layout: 'y-columns',
    coordinates: { mode: 'index' },
    startRow: 1,
    endRow: 2,
    colorScale: expect.objectContaining({
      colors: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
      range: { mode: 'auto' },
      colorbar: expect.objectContaining({ title: '强度', visible: true }),
    }),
  });
  expect(onClose).toHaveBeenCalledOnce();
});
it('生成前可选择颜色映射、反向和固定范围，并将配置交给生成操作', () => {
  const { onApply } = setup();
  fireEvent.change(screen.getByLabelText('颜色映射预设'), {
    target: { value: 'grayscale' },
  });
  fireEvent.click(screen.getByLabelText('反向色阶'));
  fireEvent.change(screen.getByLabelText('Z 颜色范围'), {
    target: { value: 'fixed' },
  });
  fireEvent.change(screen.getByLabelText('Z 最大值'), {
    target: { value: '10' },
  });
  fireEvent.click(screen.getByRole('button', { name: '生成热图' }));
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({
      colorScale: expect.objectContaining({
        colors: ['#000000', '#ffffff'],
        reverse: true,
        range: { mode: 'fixed', min: 0, max: 10 },
      }),
    }),
  );
});
it('转置和自定义坐标按原列顺序提交；拒绝空值，失败不关闭', () => {
  const { onApply, onClose } = setup(vi.fn(() => false));
  fireEvent.change(screen.getByLabelText('数据布局'), {
    target: { value: 'x-columns' },
  });
  fireEvent.change(screen.getByLabelText('跨列坐标来源'), {
    target: { value: 'custom' },
  });
  fireEvent.click(screen.getByRole('button', { name: '生成热图' }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('自定义列坐标'), {
    target: { value: '10，25' },
  });
  fireEvent.click(screen.getByRole('button', { name: '生成热图' }));
  expect(onApply).toHaveBeenCalledWith(
    expect.objectContaining({
      layout: 'x-columns',
      coordinates: { mode: 'custom', values: [10, 25] },
    }),
  );
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('未完成');
});
