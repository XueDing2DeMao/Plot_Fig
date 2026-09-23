// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/editor-state.js';
import { WorkspaceTablePanel } from './WorkspaceTablePanel.js';

describe('workspace table controls', () => {
  afterEach(cleanup);
  it('pages 50 rows at a time and refreshes the name when another project replaces the same table ID', () => {
    const table = createDataTable({
      tableId: 't',
      source: { kind: 'csv', name: 'original.csv' },
      rows: [
        ['X', 'Y'],
        ...Array.from({ length: 51 }, (_, i) => [String(i), String(i + 100)]),
      ],
    });
    const props = {
      template: defaultTemplate(),
      workspace: { ...emptyWorkspace(), tables: [table], activeTableId: 't' },
      onSelect: vi.fn(),
      onTableChange: vi.fn(),
      onImportOptions: vi.fn(),
      onRemove: vi.fn(),
    };
    const { rerender } = render(<WorkspaceTablePanel {...props} />);
    const region = within(screen.getByRole('region', { name: '数据表预览' }));
    expect(region.getAllByRole('row')).toHaveLength(51);
    fireEvent.click(region.getByRole('button', { name: '下一页' }));
    expect(region.getAllByRole('row')).toHaveLength(2);
    expect(region.getByRole('cell', { name: '150' })).toBeInTheDocument();
    rerender(
      <WorkspaceTablePanel
        {...props}
        workspace={{
          ...props.workspace,
          tables: [{ ...table, name: 'restored.csv' }],
        }}
      />,
    );
    expect(region.getByLabelText('表名称')).toHaveValue('restored.csv');
  });

  it('重新打开已导入数据表的行参数并在确认后应用', () => {
    const table = createDataTable({
      tableId: 't',
      source: { kind: 'csv', name: 'original.csv' },
      rows: [
        ['X', 'Y'],
        ['时间', '温度'],
        ['秒', '摄氏度'],
        ['0', '10'],
      ],
      options: { headerRow: 0, unitRow: null, dataStartRow: 3 },
    });
    const onImportOptions = vi.fn();
    render(
      <WorkspaceTablePanel
        template={defaultTemplate()}
        workspace={{
          ...emptyWorkspace(),
          tables: [table],
          activeTableId: 't',
        }}
        onSelect={vi.fn()}
        onTableChange={vi.fn()}
        onImportOptions={onImportOptions}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '调整导入参数' }));
    const dialog = screen.getByRole('dialog', { name: '调整导入参数' });
    expect(within(dialog).getByLabelText('表头行（0 为无表头）')).toHaveValue(
      1,
    );
    fireEvent.change(within(dialog).getByLabelText('表头行（0 为无表头）'), {
      target: { value: '2' },
    });
    fireEvent.change(within(dialog).getByLabelText('单位行（0 为无单位行）'), {
      target: { value: '3' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '应用调整' }));

    expect(onImportOptions).toHaveBeenCalledWith('t', {
      headerRow: 1,
      unitRow: 2,
      dataStartRow: 3,
    });
  });

  it('取消调整导入参数时不修改数据表', () => {
    const table = createDataTable({
      tableId: 't',
      source: { kind: 'csv', name: 'original.csv' },
      rows: [
        ['X', 'Y'],
        ['0', '10'],
      ],
    });
    const onImportOptions = vi.fn();
    render(
      <WorkspaceTablePanel
        template={defaultTemplate()}
        workspace={{
          ...emptyWorkspace(),
          tables: [table],
          activeTableId: 't',
        }}
        onSelect={vi.fn()}
        onTableChange={vi.fn()}
        onImportOptions={onImportOptions}
        onRemove={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '调整导入参数' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '调整导入参数' })).getByRole(
        'button',
        { name: '取消' },
      ),
    );

    expect(onImportOptions).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: '调整导入参数' }),
    ).not.toBeInTheDocument();
  });
});
