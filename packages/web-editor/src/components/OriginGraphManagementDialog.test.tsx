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
import { emptyWorkspace, createDataTable } from '@plot-fig/data-binding';
import {
  importTables,
  type WorkspaceEditor,
} from '../state/workspace-editor.js';
import { changeAllChartTypes } from '../state/chart-operations.js';
import { defaultTemplate } from '../state/default-template.js';
import { OriginGraphManagementDialog } from './OriginGraphManagementDialog.js';
afterEach(cleanup);
it.each(['heatmap', 'contour'] as const)(
  '新增 %s 绘图将选中数据列绑定到 Z',
  (choice) => {
    const model = changeAllChartTypes(
      importTables(
        { template: defaultTemplate(), workspace: emptyWorkspace() },
        [
          createDataTable({
            tableId: 'source',
            source: { kind: 'csv', name: 'source.csv' },
            rows: [
              ['X', 'Y', 'Z', 'Signal'],
              ['0', '0', '1', '5'],
              ['1', '0', '2', '6'],
              ['0', '1', '3', '7'],
              ['1', '1', '4', '8'],
            ],
          }),
        ],
      ),
      choice,
    );
    const onApply = vi.fn<(next: WorkspaceEditor) => void>();
    render(
      <OriginGraphManagementDialog
        mode="layer-contents"
        model={model}
        panelId="panel-main"
        onApply={onApply}
        onDismiss={vi.fn()}
      />,
    );
    fireEvent.click(
      within(screen.getByRole('group', { name: '可用数据集' })).getByRole(
        'button',
        { name: 'Signal' },
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '添加绘图' }));
    fireEvent.click(screen.getByRole('button', { name: '应用' }));
    expect(onApply).toHaveBeenCalledOnce();
    const next = onApply.mock.lastCall![0];
    const plot = next.template.panels[0]!.plotSlots[1]!;
    expect(plot.kind).toBe(choice);
    if (plot.kind !== 'heatmap' && plot.kind !== 'contour')
      throw new Error('Expected grid plot');
    expect(next.workspace.slotBindings[plot.bindings.z!]!.columnId).toBe(
      'signal',
    );
    expect(next.workspace.slotBindings[plot.bindings.y!]!.columnId).toBe('y');
  },
);
it('opens layer management separately and keeps adding a layer transactional', () => {
  const model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  const onApply = vi.fn();
  render(
    <OriginGraphManagementDialog
      mode="layer-management"
      model={model}
      panelId="panel-main"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  expect(screen.getByRole('dialog', { name: '图层管理' })).toBeInTheDocument();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
    '常用操作',
    '排列图层',
    '大小/位置',
    '图层联动',
    '坐标轴',
    '显示',
  ]);
  fireEvent.click(screen.getByRole('button', { name: '新增空白图层' }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '更新预览' }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(onApply.mock.calls[0]![0].template.panels).toHaveLength(2);
  expect(model.template.panels).toHaveLength(1);
});

it('keeps layer-management Apply in the preview and separates geometry from Link', () => {
  const model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  const onApply = vi.fn();
  render(
    <OriginGraphManagementDialog
      mode="layer-management"
      model={model}
      panelId="panel-main"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '大小/位置' }));
  expect(screen.getByLabelText('图层宽度 (%)')).toBeInTheDocument();
  expect(screen.queryByLabelText('位置尺寸父图层')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '图层联动' }));
  expect(screen.getByLabelText('位置尺寸父图层')).toBeInTheDocument();
  expect(screen.queryByLabelText('图层宽度 (%)')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('显示图层边框')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '常用操作' }));
  fireEvent.click(screen.getByRole('button', { name: '新增空白图层' }));
  fireEvent.click(screen.getByRole('button', { name: '更新预览' }));
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(model.template.panels).toHaveLength(1);
});
it('cancel discards a layer contents removal', () => {
  const onApply = vi.fn();
  const model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  render(
    <OriginGraphManagementDialog
      mode="layer-contents"
      model={model}
      panelId="panel-main"
      onApply={onApply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /曲线 Series 1/ }));
  fireEvent.click(screen.getByRole('button', { name: '移除绘图' }));
  expect(
    screen.queryByRole('button', { name: /曲线 Series 1/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(model.template.panels[0]!.plotSlots).toHaveLength(1);
});

it('uses readable layer names and collapses advanced settings and unused preview space', () => {
  const model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  render(
    <OriginGraphManagementDialog
      mode="layer-management"
      model={model}
      panelId="panel-main"
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  const navigation = screen.getByRole('navigation', { name: '图层列表' });
  expect(
    within(navigation).getByRole('button', { name: '图层 1' }),
  ).toBeInTheDocument();
  expect(navigation).not.toHaveTextContent('panel-main');
  expect(screen.getByRole('button', { name: '新增空白图层' })).toBeVisible();
  expect(screen.getByLabelText('共享方向')).not.toBeVisible();
  fireEvent.click(screen.getByText('高级设置：图层标签与共享轴'));
  expect(screen.getByLabelText('共享方向')).toBeVisible();
  expect(
    screen.queryByRole('region', { name: '图层预览' }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '显示预览' }));
  expect(screen.getByRole('region', { name: '图层预览' })).toHaveTextContent(
    '暂无可绘制数据',
  );
  fireEvent.click(screen.getByRole('button', { name: '收起预览' }));
  expect(
    screen.queryByRole('region', { name: '图层预览' }),
  ).not.toBeInTheDocument();
});
