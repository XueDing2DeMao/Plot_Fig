// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import { BatchYDialog } from './BatchYDialog.js';

afterEach(cleanup);
function setup(onApply = vi.fn()) {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'data',
        source: { kind: 'csv', name: 'spectra.csv' },
        rows: [
          ['x', 'Pristine Ge', 'Laser processing', 'Note'],
          [1, 2, 3, 'text'],
        ],
      }),
    ],
  );
  const table = model.workspace.tables[0]!;
  table.columns[3]!.settings.type = 'string';
  const onClose = vi.fn();
  render(
    <BatchYDialog
      panel={model.template.panels[0]!}
      workspace={model.workspace}
      onApply={onApply}
      onClose={onClose}
    />,
  );
  return { model, table, onApply, onClose };
}

it('共用 X、只列出数值 Y，搜索和全选操作生成原列顺序的请求', () => {
  const { table, onApply, onClose } = setup();
  expect(screen.getByLabelText('共用 X 数据列')).toHaveValue(
    table.columns[0]!.columnId,
  );
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  expect(
    screen.queryByRole('checkbox', { name: /Note/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '清空选择' }));
  expect(screen.getByRole('button', { name: /添加所选曲线/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('搜索 Y 列'), {
    target: { value: 'Laser' },
  });
  fireEvent.click(screen.getByRole('button', { name: '全选搜索结果' }));
  fireEvent.change(screen.getByLabelText('搜索 Y 列'), {
    target: { value: '' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: /Pristine Ge/ }));
  fireEvent.click(screen.getByRole('button', { name: /添加所选曲线/ }));
  expect(onApply).toHaveBeenCalledWith({
    panelId: 'panel-main',
    tableId: table.tableId,
    xColumnId: table.columns[0]!.columnId,
    yColumnIds: table.columns.slice(1, 3).map((c) => c.columnId),
  });
  expect(onClose).toHaveBeenCalledOnce();
});

it('切换 X 后移除对应 Y；取消不提交', () => {
  const { table, onApply, onClose } = setup();
  fireEvent.change(screen.getByLabelText('共用 X 数据列'), {
    target: { value: table.columns[1]!.columnId },
  });
  expect(
    screen.queryByRole('checkbox', { name: /Pristine Ge/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledOnce();
});

it('失败时保留选择和窗口', () => {
  const { onClose } = setup(vi.fn(() => false));
  fireEvent.click(screen.getByRole('button', { name: /添加所选曲线/ }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('未完成');
  expect(screen.getByRole('checkbox', { name: /Pristine Ge/ })).toBeChecked();
});
