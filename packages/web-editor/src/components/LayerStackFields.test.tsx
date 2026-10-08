// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import {
  importTables,
  type WorkspaceEditor,
} from '../state/workspace-editor.js';
import { defaultTemplate } from '../state/default-template.js';
import { batchYColumns } from '../state/batch-y-columns.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { setLayerOffsets } from '../state/layer-stack.js';
afterEach(cleanup);
it('uses one Origin stack editor for multi-object editing', () => {
  open();
  fireEvent.click(screen.getByRole('button', { name: '多选编辑…' }));
  fireEvent.change(screen.getByLabelText('编辑属性组'), {
    target: { value: 'panel-stack' },
  });
  expect(screen.queryByLabelText('启用曲线堆叠')).not.toBeInTheDocument();
  expect(screen.getAllByRole('radio', { name: '常量' })).toHaveLength(1);
});
function fixture() {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'stack.csv' },
        rows: [
          ['x', 'A', 'B', 'C'],
          [0, 1, 2, 3],
          [1, 2, 4, 6],
        ],
      }),
    ],
  );
  const table = model.workspace.tables[0]!;
  return batchYColumns(model, {
    panelId: 'panel-main',
    tableId: 't',
    xColumnId: table.columns[0]!.columnId,
    yColumnIds: table.columns.slice(1).map((c) => c.columnId),
  });
}
function open(model = fixture()) {
  const apply = vi.fn<(model: WorkspaceEditor) => void>(),
    dismiss = vi.fn();
  render(
    <FigurePropertiesDialog
      {...model}
      data={bindWorkspace(model.template, model.workspace)}
      onApply={vi.fn()}
      onApplyModel={apply}
      onDismiss={dismiss}
      initialSelection={{ kind: 'panel', panelId: 'panel-main' }}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '堆叠' }));
  return { apply, dismiss, model };
}
it('自动间距和比例设置在图层事务中一起应用，取消不修改原始曲线', () => {
  const { model, apply, dismiss } = open(),
    before = structuredClone(model);
  fireEvent.click(screen.getByRole('radio', { name: '自动' }));
  expect(screen.getByLabelText('间距 (%)')).toHaveValue('8');
  fireEvent.change(screen.getByLabelText('间距 (%)'), {
    target: { value: '12' },
  });
  fireEvent.click(screen.getByLabelText('保持绘图在非线性刻度下的比例'));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  expect(apply.mock.calls[0]![0].template.panels[0]!.layerStack).toMatchObject({
    mode: 'auto',
    auto: { gap: 0.12, preserveScale: true },
  });
  expect(model).toEqual(before);
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(dismiss).toHaveBeenCalledOnce();
  expect(apply).toHaveBeenCalledOnce();
});
it('未完成数字禁止应用，切换无偏移可以清除错误并恢复原位', () => {
  const model = fixture();
  model.template.panels[0] = setLayerOffsets(model.template.panels[0]!, {
    mode: 'auto',
    x: false,
    y: true,
    gap: 8,
    value: 1,
  });
  const { apply } = open(model);
  fireEvent.click(screen.getByRole('radio', { name: '常量' }));
  fireEvent.change(screen.getByLabelText('常量偏移数列'), {
    target: { value: '-' },
  });
  expect(screen.getByLabelText('常量偏移数列')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: '无' }));
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  expect(
    apply.mock.calls[0]![0].template.panels[0]!.plotSlots.every(
      (p) => !('transform' in p),
    ),
  ).toBe(true);
});
it('常量支持负数和数列，重开后识别完整堆叠设置', () => {
  const { apply } = open();
  fireEvent.click(screen.getByRole('radio', { name: '常量' }));
  fireEvent.change(screen.getByLabelText('常量偏移数列'), {
    target: { value: '-25' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply.mock.calls[0]![0].template.panels[0]!.layerStack).toMatchObject({
    constant: { values: [-25], absolute: false },
  });
  cleanup();
  open(apply.mock.calls[0]![0]);
  expect(screen.getByRole('radio', { name: '常量' })).toBeChecked();
  expect(screen.getByLabelText('常量偏移数列')).toHaveValue('-25');
  fireEvent.click(screen.getByRole('radio', { name: '累积' }));
  expect(
    screen.getByLabelText(
      '对使用“累积”/“增量”的柱状图/条形图数据归一化为百分比',
    ),
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
});
it('自动转单独时保留位置，可只修改一条曲线的偏移', () => {
  const { apply } = open();
  fireEvent.click(screen.getByRole('radio', { name: '自动' }));
  fireEvent.click(screen.getByRole('radio', { name: '单独' }));
  fireEvent.change(screen.getByLabelText('偏移曲线'), {
    target: { value: 'series-2' },
  });
  expect(
    Number((screen.getByLabelText('Y 偏移值') as HTMLInputElement).value),
  ).toBeCloseTo(1.16);
  fireEvent.change(screen.getByLabelText('Y 偏移值'), {
    target: { value: '50' },
  });
  fireEvent.change(screen.getByLabelText('偏移曲线'), {
    target: { value: 'series-3' },
  });
  expect(
    Number((screen.getByLabelText('Y 偏移值') as HTMLInputElement).value),
  ).toBeCloseTo(3.4);
  fireEvent.change(screen.getByLabelText('偏移曲线'), {
    target: { value: 'series-2' },
  });
  expect(screen.getByLabelText('Y 偏移值')).toHaveValue('50');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  const values =
    apply.mock.calls[0]![0].template.panels[0]!.layerStack!.individual.values;
  expect(values.find((value) => value.plotSlotId === 'series-2')).toMatchObject(
    { yOffset: 50, yMultiplier: 1 },
  );
  expect(values.find((value) => value.plotSlotId === 'series-3')).toMatchObject(
    { yOffset: expect.closeTo(3.4), yMultiplier: 1 },
  );
});

it('双轴时选择至少两条曲线共用的轴组进行累积', () => {
  const model = fixture(),
    panel = model.template.panels[0]!;
  const axis = structuredClone(panel.axes.find((a) => a.dimension === 'y')!);
  axis.axisId = 'right-y';
  axis.position = 'right';
  panel.axes.push(axis);
  panel.plotSlots.slice(1).forEach((p) => {
    p.yAxisId = axis.axisId;
  });
  const { apply } = open(model);
  expect(screen.getByRole('radio', { name: '累积' })).toBeEnabled();
  fireEvent.click(screen.getByRole('radio', { name: '累积' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  expect(
    apply.mock.calls[0]![0].template.panels[0]!.layerStack?.members,
  ).toEqual(['series-2', 'series-3']);
});
