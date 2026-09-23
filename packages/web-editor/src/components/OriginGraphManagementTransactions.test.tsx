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
import { OriginGraphManagementDialog } from './OriginGraphManagementDialog.js';

afterEach(cleanup);

function showContents() {
  const model = { template: defaultTemplate(), workspace: emptyWorkspace() };
  const plot = model.template.panels[0]!.plotSlots[0]!;
  model.template.panels[0]!.plotSlots.push({
    ...structuredClone(plot),
    plotSlotId: 'series-2',
    legendEntry: { ...plot.legendEntry, text: 'Series 2' },
  });
  const onApply = vi.fn<(model: WorkspaceEditor) => void>();
  const onDismiss = vi.fn();
  render(
    <OriginGraphManagementDialog
      mode="layer-contents"
      model={model}
      panelId="panel-main"
      onApply={onApply}
      onDismiss={onDismiss}
    />,
  );
  const contents = screen.getByRole('dialog', { name: '图层内容' });
  fireEvent.click(
    within(contents).getByRole('button', { name: /曲线 Series 1/ }),
  );
  fireEvent.click(within(contents).getByRole('button', { name: '移除绘图' }));
  expect(
    within(contents).queryByRole('button', { name: /曲线 Series 1/ }),
  ).not.toBeInTheDocument();
  expect(within(contents).getByRole('button', { name: '应用' })).toBeEnabled();
  return { model, onApply, onDismiss, contents };
}

it('keeps nested layer-property confirmation inside the contents transaction until outer Apply', () => {
  const { model, onApply, onDismiss, contents } = showContents();
  const original = structuredClone(model);
  fireEvent.click(
    within(contents).getByRole('button', { name: '图层属性...' }),
  );
  const properties = screen.getByRole('dialog', { name: /绘图细节/ });
  fireEvent.click(within(properties).getByRole('tab', { name: '显示/速度' }));
  fireEvent.change(within(properties).getByLabelText('图层名称'), {
    target: { value: '草稿图层' },
  });
  fireEvent.click(within(properties).getByRole('button', { name: '确定' }));

  expect(
    screen.queryByRole('dialog', { name: /绘图细节/ }),
  ).not.toBeInTheDocument();
  expect(
    within(contents).getByRole('button', { name: '图层 草稿图层' }),
  ).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
  expect(onDismiss).not.toHaveBeenCalled();
  fireEvent.click(within(contents).getByRole('button', { name: '取消' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(model).toEqual(original);
});

it('cancels only the nested layer properties on Escape and preserves the outer contents draft', () => {
  const { onApply, onDismiss, contents } = showContents();
  fireEvent.click(
    within(contents).getByRole('button', { name: '图层属性...' }),
  );
  const properties = screen.getByRole('dialog', { name: /绘图细节/ });
  fireEvent(
    properties,
    new Event('cancel', { cancelable: true, bubbles: false }),
  );

  expect(
    screen.queryByRole('dialog', { name: /绘图细节/ }),
  ).not.toBeInTheDocument();
  expect(onDismiss).not.toHaveBeenCalled();
  expect(onApply).not.toHaveBeenCalled();
  expect(
    within(contents).queryByRole('button', { name: /曲线 Series 1/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(within(contents).getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0].template.panels[0]!.plotSlots).toHaveLength(
    1,
  );
});

it('adds the chosen dataset with exact bindings and preserves the applied baseline after a later cancellation', () => {
  const second = createDataTable({
    tableId: 'second',
    source: { kind: 'csv', name: 'second.csv' },
    rows: [
      ['X', 'Signal'],
      ['10', '20'],
      ['30', '40'],
    ],
  });
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'first',
        source: { kind: 'csv', name: 'first.csv' },
        rows: [
          ['X', 'Y'],
          ['0', '1'],
          ['1', '2'],
        ],
      }),
      second,
    ],
  );
  const before = structuredClone(model);
  const onApply = vi.fn<(model: WorkspaceEditor) => void>();
  const onDismiss = vi.fn();
  render(
    <OriginGraphManagementDialog
      mode="layer-contents"
      model={model}
      panelId="panel-main"
      onApply={onApply}
      onDismiss={onDismiss}
    />,
  );
  const sources = screen.getByRole('group', { name: '可用数据集' });
  fireEvent.click(within(sources).getByRole('button', { name: 'Signal' }));
  fireEvent.click(screen.getByRole('button', { name: '添加绘图' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApply).toHaveBeenCalledOnce();
  const applied = structuredClone(onApply.mock.lastCall![0]);
  expect(applied.template.panels[0]!.plotSlots).toHaveLength(2);
  const added = applied.template.panels[0]!.plotSlots.at(-1)!;
  expect(added.kind).toBe('xy');
  if (added.kind !== 'xy') throw new Error('Expected the added XY plot');
  expect(applied.workspace.slotBindings[added.bindings.y]).toEqual({
    tableId: 'second',
    columnId: second.columns.find((column) => column.name === 'Signal')!
      .columnId,
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: '添加绘图' }));
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onApply).toHaveBeenCalledOnce();
  expect(onApply.mock.lastCall![0]).toEqual(applied);
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(model).toEqual(before);
});
