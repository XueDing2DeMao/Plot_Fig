import { expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { figureActions, tableActions } from './workspace-actions.js';
import type { WorkspaceEditor } from './workspace-editor.js';
import { reorderPanel } from './panel-order.js';
import { changeAllChartTypes } from './chart-operations.js';
import { chartChoice, type ChartChoice } from './chart-defaults.js';

function editor(): WorkspaceEditor {
  const template = defaultTemplate();
  const peer = structuredClone(template.panels[0]!);
  peer.panelId = 'empty-layer';
  peer.plotSlots = [];
  peer.axes.forEach((axis) => (axis.axisId += '-peer'));
  template.panels.push(peer);
  return { template, workspace: emptyWorkspace() };
}

function dataTable() {
  return createDataTable({
    tableId: 'measurements',
    source: { kind: 'csv', name: 'measurements.csv' },
    rows: [
      ['时间', '信号', '序号'],
      ['0', '10', '1'],
      ['1', '20', '2'],
    ],
  });
}

function axisTitle(model: WorkspaceEditor, axisId: 'axis-x' | 'axis-y') {
  return model.template.panels[0]!.axes.find((axis) => axis.axisId === axisId)!
    .title?.text;
}

it('根据曲线一自动绑定的横纵数据列设置坐标轴名称', () => {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  const actions = tableActions(model, (change) => {
    model = change(model);
  });

  actions.onImport([dataTable()]);

  expect(axisTitle(model, 'axis-x')).toBe('时间');
  expect(axisTitle(model, 'axis-y')).toBe('信号');
});

it('将不适合轴标题的列名转换为安全文本', () => {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  const table = createDataTable({
    tableId: 'safe-title',
    source: { kind: 'csv', name: 'safe-title.csv' },
    rows: [
      ['<时间>', '<信号>'],
      ['0', '10'],
      ['1', '20'],
    ],
  });
  tableActions(model, (change) => {
    model = change(model);
  }).onImport([table]);

  expect(axisTitle(model, 'axis-x')).toBe('＜时间＞');
  expect(axisTitle(model, 'axis-y')).toBe('＜信号＞');
});

it('曲线一更换数据列时更新自动轴名，并保留手动修改的轴名', () => {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  const actions = tableActions(model, (change) => {
    model = change(model);
  });
  const table = dataTable();
  actions.onImport([table]);

  actions.onColumn(
    'slot-x',
    'measurements',
    table.columns.find((column) => column.name === '序号')!.columnId,
  );
  expect(axisTitle(model, 'axis-x')).toBe('序号');

  const xAxis = model.template.panels[0]!.axes.find(
    (axis) => axis.axisId === 'axis-x',
  )!;
  xAxis.title = { ...xAxis.title!, text: '自定义横轴' };
  actions.onColumn(
    'slot-x',
    'measurements',
    table.columns.find((column) => column.name === '时间')!.columnId,
  );

  expect(axisTitle(model, 'axis-x')).toBe('自定义横轴');
  expect(axisTitle(model, 'axis-y')).toBe('信号');
});

it('仅使用当前曲线一的绑定命名坐标轴', () => {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  const update = (change: (current: WorkspaceEditor) => WorkspaceEditor) => {
    model = change(model);
  };
  const table = dataTable();
  tableActions(model, update).onImport([table]);
  figureActions(update).onSeries('add');
  const second = model.template.panels[0]!.plotSlots[1]!;
  if (second.kind !== 'xy') throw new Error('应为二维图');
  tableActions(model, update).onColumn(
    second.bindings.y,
    table.tableId,
    table.columns.find((column) => column.name === '序号')!.columnId,
  );
  expect(axisTitle(model, 'axis-y')).toBe('信号');

  figureActions(update).onSeries('up', second.plotSlotId);
  expect(axisTitle(model, 'axis-y')).toBe('序号');
});

it('重新调整导入行参数后按列位置保留绑定并更新自动轴名', () => {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  const table = createDataTable({
    tableId: 'reimported',
    source: { kind: 'csv', name: 'reimported.csv' },
    rows: [
      ['X', 'Y'],
      ['时间', '温度'],
      ['秒', '摄氏度'],
      ['0', '10'],
      ['1', '20'],
    ],
    options: { headerRow: 0, unitRow: null, dataStartRow: 3 },
  });
  table.columns[1]!.settings.missingTokens = ['缺失'];
  const update = (change: (current: WorkspaceEditor) => WorkspaceEditor) => {
    model = change(model);
  };
  tableActions(model, update).onImport([table]);

  tableActions(model, update).onImportOptions('reimported', {
    headerRow: 1,
    unitRow: 2,
    dataStartRow: 3,
  });

  const adjusted = model.workspace.tables[0]!;
  expect(adjusted.region).toEqual({
    headerRow: 1,
    unitRow: 2,
    dataStartRow: 3,
  });
  expect(adjusted.columns.map((column) => column.name)).toEqual([
    '时间',
    '温度',
  ]);
  expect(adjusted.columns.map((column) => column.columnId)).toEqual(['x', 'y']);
  expect(adjusted.columns.map((column) => column.settings.unit)).toEqual([
    '秒',
    '摄氏度',
  ]);
  expect(adjusted.columns[1]!.settings.missingTokens).toEqual(['缺失']);
  expect(model.workspace.slotBindings['slot-x']).toEqual({
    tableId: 'reimported',
    columnId: 'x',
  });
  expect(model.workspace.slotBindings['slot-y']).toEqual({
    tableId: 'reimported',
    columnId: 'y',
  });
  expect(axisTitle(model, 'axis-x')).toBe('时间');
  expect(axisTitle(model, 'axis-y')).toBe('温度');
});

it('重新调整导入参数后解除已消失列的绑定', () => {
  let model: WorkspaceEditor = {
    template: defaultTemplate(),
    workspace: emptyWorkspace(),
  };
  const table = createDataTable({
    tableId: 'shrinking',
    source: { kind: 'csv', name: 'shrinking.csv' },
    rows: [
      ['X', 'Y', '其他'],
      ['0', '10', '100'],
      ['时间', '温度'],
      ['1', '20'],
    ],
    options: { headerRow: 0, unitRow: null, dataStartRow: 1 },
  });
  const update = (change: (current: WorkspaceEditor) => WorkspaceEditor) => {
    model = change(model);
  };
  tableActions(model, update).onImport([table]);
  tableActions(model, update).onColumn(
    'slot-y',
    table.tableId,
    table.columns[2]!.columnId,
  );

  tableActions(model, update).onImportOptions('shrinking', {
    headerRow: 2,
    unitRow: null,
    dataStartRow: 3,
  });

  expect(model.workspace.tables[0]!.columns).toHaveLength(2);
  expect(model.workspace.slotBindings['slot-x']).toEqual({
    tableId: 'shrinking',
    columnId: 'x',
  });
  expect(model.workspace.slotBindings['slot-y']).toBeUndefined();
});

it.each([undefined, 'panel-main', 'missing'])(
  '应用顺序时保留有效当前层（原选择 %s）',
  (activePanelId) => {
    let model = editor();
    if (activePanelId !== undefined) model.activePanelId = activePanelId;
    const actions = figureActions((change) => {
      model = change(model);
    });
    actions.onTemplate(reorderPanel(model.template, 'panel-main', 'front'));
    expect(model.activePanelId).toBe('panel-main');
    expect(model.template.panels[0]!.panelId).toBe('empty-layer');
    expect(
      model.template.panels.find((p) => p.panelId === model.activePanelId)!
        .plotSlots,
    ).not.toHaveLength(0);
  },
);

it('应用模板保留显式选中的非首层', () => {
  let model = editor();
  model.activePanelId = 'empty-layer';
  const actions = figureActions((change) => {
    model = change(model);
  });
  actions.onTemplate(reorderPanel(model.template, 'panel-main', 'front'));
  expect(model.activePanelId).toBe('empty-layer');
});

it('当前图层被移除时选择新模板首层', () => {
  let model = editor();
  model.activePanelId = 'empty-layer';
  const next = structuredClone(model.template);
  next.panels.pop();
  figureActions((change) => {
    model = change(model);
  }).onTemplate(next);
  expect(model.activePanelId).toBe('panel-main');
});

it.each<ChartChoice>([
  'xy',
  'scatter',
  'bar',
  'stacked-bar',
  'area',
  'histogram',
  'box',
  'heatmap',
  'contour',
])('空图层新增曲线继承全图的 %s 类型', (choice) => {
  let model = changeAllChartTypes(editor(), choice);
  model.activePanelId = 'empty-layer';
  figureActions((change) => {
    model = change(model);
  }).onSeries('add');
  expect(
    model.template.panels.flatMap((panel) => panel.plotSlots).map(chartChoice),
  ).toEqual([choice, choice]);
});
