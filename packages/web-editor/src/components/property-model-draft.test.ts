import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { importTables } from '../state/workspace-editor.js';
import {
  addPanel,
  duplicatePanel,
  removePanel,
} from '../state/panel-operations.js';
import { applyPropertyModel } from './property-model-draft.js';
import { movePlotToPanel } from '../state/plot-panel-operations.js';
import type { FigurePropertyDraftState } from './figure-property-draft-state.js';
function state(): FigurePropertyDraftState {
  const model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'data',
        source: { kind: 'csv', name: 'data.csv' },
        rows: [
          ['X', 'Y'],
          ['0', '1'],
          ['1', '2'],
        ],
      }),
    ],
  );
  return {
    ...model,
    data: bindWorkspace(model.template, model.workspace),
    selection: { kind: 'panel', panelId: 'panel-main' },
    drafts: {},
  };
}
it('updates copied data bindings and selects the new layer in one draft transaction', () => {
  const before = state();
  const next = applyPropertyModel(before, (model) =>
    duplicatePanel(model, 'panel-main'),
  );
  expect(next.operationError).toBeUndefined();
  expect(next.template.panels).toHaveLength(2);
  expect(next.selection).toEqual({
    kind: 'panel',
    panelId: next.template.panels[1]!.panelId,
  });
  expect(
    next.data!.bindings.filter((binding) => binding.status === 'valid'),
  ).toHaveLength(4);
  expect(before.template.panels).toHaveLength(1);
});
it('relocates selected curves and can remove a previously selected object without stale drafts', () => {
  let current = applyPropertyModel(state(), (model) =>
    duplicatePanel(model, 'panel-main'),
  );
  current.selection = {
    kind: 'plot',
    panelId: 'panel-main',
    plotSlotId: 'series-1',
  };
  const target = current.template.panels[1]!;
  current = applyPropertyModel(current, (model) =>
    movePlotToPanel(model, 'series-1', {
      panelId: target.panelId,
      xAxisId: target.axes[0]!.axisId,
      yAxisId: target.axes[1]!.axisId,
    }),
  );
  expect(current.selection).toEqual({
    kind: 'plot',
    panelId: target.panelId,
    plotSlotId: 'series-1',
  });
  current = applyPropertyModel(current, (model) =>
    removePanel(model, target.panelId),
  );
  expect(current.selection).toEqual({ kind: 'panel', panelId: 'panel-main' });
  expect(current.operationError).toBeUndefined();
});
it('does not execute structure commands while another object has an unfinished numeric draft', () => {
  const current = state();
  current.drafts['blocked'] = {
    ref: { kind: 'axis', panelId: 'panel-main', axisId: 'axis-x' },
    patches: [],
    numberTexts: {},
    numberPaths: {},
    error: '请输入完整数字',
  };
  const next = applyPropertyModel(current, () => {
    throw new Error('must not execute');
  });
  expect(next).toBe(current);
});

it.each(['empty', 'same-axis', 'other-axis'])(
  'rejects a log target without valid data pairs even with a %s neighbor',
  (neighbor) => {
    const before = state();
    const xBinding = before.workspace!.slotBindings['slot-x']!;
    const table = before.workspace!.tables[0]!;
    // 两个 X 值都在对数轴的定义域外。
    const column = table.columns.find(
      (column) => column.columnId === xBinding.columnId,
    )!;
    table.rows[table.region.dataStartRow]![column.index] = -2;
    table.rows[table.region.dataStartRow + 1]![column.index] = -1;
    const model = (neighbor === 'empty' ? addPanel : duplicatePanel)(
      { template: before.template, workspace: before.workspace! },
      'panel-main',
    );
    const target = model.template.panels[1]!;
    if (neighbor !== 'empty') {
      const plot = target.plotSlots[0]!;
      if (plot.kind !== 'xy') throw new Error('expected xy');
      model.workspace.slotBindings[plot.bindings.x] =
        model.workspace.slotBindings['slot-y']!;
    }
    const x = target.axes[neighbor === 'other-axis' ? 2 : 0]!;
    x.scale = 'log10';
    delete x.rescale;
    before.template = model.template;
    before.workspace = model.workspace;
    before.data = bindWorkspace(before.template, before.workspace!);
    const next = applyPropertyModel(before, (current) =>
      movePlotToPanel(current, 'series-1', {
        panelId: target.panelId,
        xAxisId: x.axisId,
        yAxisId: target.axes[1]!.axisId,
      }),
    );
    expect(next.operationError).toBeTruthy();
    expect(next.template).toEqual(before.template);
    expect(next.workspace).toEqual(before.workspace);
    expect(next.selection).toEqual(before.selection);
  },
);
