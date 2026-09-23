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
import { defaultTemplate } from '../state/default-template.js';
import {
  importTables,
  type WorkspaceEditor,
} from '../state/workspace-editor.js';
import { duplicatePanel } from '../state/panel-operations.js';
import {
  OriginGraphManagementDialog,
  type OriginGraphManagementMode,
} from './OriginGraphManagementDialog.js';
afterEach(cleanup);
function show(
  two = false,
  mode: OriginGraphManagementMode = 'layer-management',
) {
  let model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'data',
        source: { kind: 'csv', name: 'data.csv' },
        rows: [
          ['X', 'Y'],
          ['0', '0'],
          ['1', '1'],
        ],
      }),
    ],
  );
  if (two) model = duplicatePanel(model, 'panel-main');
  const apply = vi.fn<(value: WorkspaceEditor) => void>(),
    dismiss = vi.fn();
  render(
    <OriginGraphManagementDialog
      mode={mode}
      model={model}
      panelId="panel-main"
      onApply={apply}
      onDismiss={dismiss}
    />,
  );
  return { model, apply, dismiss };
}
function select(name: string | RegExp, index = 0) {
  fireEvent.click(
    within(
      screen.getByRole('navigation', { name: /^(属性对象|图层列表)$/ }),
    ).getAllByRole('button', { name })[index]!,
  );
}
function management() {
  select(/^图层 /);
  fireEvent.click(screen.getByRole('tab', { name: '常用操作' }));
}
it('copies layers with working data in preview and applies the complete workspace', () => {
  const { apply } = show();
  management();
  fireEvent.click(screen.getByRole('button', { name: '复制图层' }));
  expect(screen.queryByText('修正参数后恢复图形预览')).not.toBeInTheDocument();
  expect(
    screen.getByLabelText('图层预览').querySelectorAll('[data-panel-id]'),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /^(应用|更新预览)$/ }));
  expect(
    screen.getByLabelText('图层预览').querySelectorAll('[data-panel-id]'),
  ).toHaveLength(2);
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(apply.mock.lastCall![0].template.panels).toHaveLength(2);
  expect(
    Object.keys(apply.mock.lastCall![0].workspace.slotBindings),
  ).toHaveLength(4);
});
it('moves a curve and follows it in the object tree, retaining bindings on apply', () => {
  const { model, apply } = show(true, 'layer-contents');
  select(/^曲线 /);
  fireEvent.change(screen.getByLabelText('目标图层'), {
    target: { value: model.template.panels[1]!.panelId },
  });
  fireEvent.click(screen.getByRole('button', { name: '移动曲线' }));
  fireEvent.click(screen.getByRole('button', { name: /^(应用|更新预览)$/ }));
  expect(apply.mock.lastCall![0].template.panels[0]!.plotSlots).toHaveLength(0);
  expect(apply.mock.lastCall![0].template.panels[1]!.plotSlots).toHaveLength(2);
  expect(apply.mock.lastCall![0].workspace).toEqual(model.workspace);
});
it('requires layer deletion confirmation, supports cancellation and protects the last layer', () => {
  const { apply } = show();
  management();
  expect(screen.getByRole('button', { name: '删除图层' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '新增空白图层' }));
  fireEvent.click(screen.getByRole('tab', { name: '常用操作' }));
  fireEvent.click(screen.getByRole('button', { name: '删除图层' }));
  fireEvent.click(screen.getByRole('button', { name: '保留图层' }));
  fireEvent.click(screen.getByRole('button', { name: /^(应用|更新预览)$/ }));
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(apply.mock.lastCall![0].template.panels).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: '删除图层' }));
  fireEvent.click(screen.getByRole('button', { name: '确认删除图层' }));
  fireEvent.click(screen.getByRole('button', { name: /^(应用|更新预览)$/ }));
  fireEvent.click(screen.getByRole('button', { name: '确定' }));
  expect(apply.mock.lastCall![0].template.panels).toHaveLength(1);
});
it('does not copy while another object has an invalid range', () => {
  const { apply, dismiss } = show();
  fireEvent.click(screen.getByRole('tab', { name: '坐标轴' }));
  select('下 X 轴');
  fireEvent.change(screen.getByLabelText('X 轴最小值'), {
    target: { value: '-' },
  });
  management();
  expect(screen.getByRole('button', { name: '复制图层' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
});

it('cancels a copied layer without applying its new data bindings', () => {
  const { model, apply, dismiss } = show();
  const before = structuredClone(model);
  management();
  fireEvent.click(screen.getByRole('button', { name: '复制图层' }));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(dismiss).toHaveBeenCalledOnce();
  expect(model).toEqual(before);
});

it('discards both the applied preview and a later copy when layer management is cancelled', () => {
  const { model, apply, dismiss } = show();
  const before = structuredClone(model);
  management();
  fireEvent.click(screen.getByRole('button', { name: '复制图层' }));
  fireEvent.click(screen.getByRole('tab', { name: '常用操作' }));
  fireEvent.click(screen.getByRole('button', { name: /^(应用|更新预览)$/ }));
  expect(apply).not.toHaveBeenCalled();
  expect(
    screen.getByLabelText('图层预览').querySelectorAll('[data-panel-id]'),
  ).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: '复制图层' }));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(apply).not.toHaveBeenCalled();
  expect(model).toEqual(before);
  expect(dismiss).toHaveBeenCalledOnce();
});
