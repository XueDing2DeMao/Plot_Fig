import { expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTextStyle, defaultLegendLayout } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { addPanel, duplicatePanel, labelPanels } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import { changeSeries, importTables } from './workspace-editor.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { changeChartType } from './chart-operations.js';
import { figureActions } from './workspace-actions.js';

function sample() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'table',
        source: { kind: 'csv', name: 'data.csv' },
        rows: [
          ['X', 'Y'],
          ['-1', '0'],
          ['1', '2'],
        ],
      }),
    ],
  );
}
it('adds an empty independent layer without duplicating data or relationships', () => {
  const model = sample(),
    before = structuredClone(model);
  model.template.panels[0]!.axisLengthRatio = {
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    ratio: 1,
  };
  const next = addPanel(model, 'panel-main'),
    panel = next.template.panels[1]!;
  expect(panel.plotSlots).toEqual([]);
  expect(panel.axisLengthRatio).toBeUndefined();
  expect(panel.frameLink).toBeUndefined();
  expect(
    panel.axes.every(
      (axis) => axis.scale === 'linear' && axis.range.mode === 'auto',
    ),
  ).toBe(true);
  expect(next.workspace).toEqual(before.workspace);
  expect(next.template.dataSlots).toEqual(before.template.dataSlots);
  expect(next.activePanelId).toBe(panel.panelId);
});
it('moves the last curve to a chosen axis pair, retaining data, identity and all styles', () => {
  const model = duplicatePanel(sample(), 'panel-main'),
    before = structuredClone(model);
  const plot = model.template.panels[0]!.plotSlots[0]!,
    target = model.template.panels[1]!;
  const next = movePlotToPanel(model, plot.plotSlotId, {
    panelId: target.panelId,
    xAxisId: target.axes[2]!.axisId,
    yAxisId: target.axes[3]!.axisId,
  });
  expect(next.template.panels[0]!.plotSlots).toEqual([]);
  expect(next.template.panels[1]!.plotSlots.at(-1)).toEqual({
    ...plot,
    xAxisId: target.axes[2]!.axisId,
    yAxisId: target.axes[3]!.axisId,
  });
  expect(next.workspace).toEqual(model.workspace);
  expect(next.template.dataSlots).toEqual(model.template.dataSlots);
  expect(model).toEqual(before);
  expect(
    renderFigureSvg(next.template, bindWorkspace(next.template, next.workspace))
      .ok,
  ).toBe(true);
});
it('keeps layer annotations in place and removes the moved plot only from source-layer legend lists', () => {
  const model = duplicatePanel(sample(), 'panel-main'),
    target = model.template.panels[1]!;
  const plotId = model.template.panels[0]!.plotSlots[0]!.plotSlotId;
  model.template.annotations.push({
    annotationId: 'legend-local',
    kind: 'legend',
    visible: true,
    coordinateSpace: 'panel',
    panelId: 'panel-main',
    position: { x: 0, y: 1 },
    textStyle: defaultTextStyle(),
    layout: { ...defaultLegendLayout(), plotSlotIds: [plotId] },
  });
  const next = movePlotToPanel(model, plotId, {
    panelId: target.panelId,
    xAxisId: target.axes[0]!.axisId,
    yAxisId: target.axes[1]!.axisId,
  });
  expect(next.template.annotations[0]).toMatchObject({
    panelId: 'panel-main',
    layout: { plotSlotIds: [] },
  });
});
it('rejects missing or incompatible target axes atomically', () => {
  const model = duplicatePanel(sample(), 'panel-main'),
    target = model.template.panels[1]!;
  target.axes[0]!.scale = 'category';
  target.axes[0]!.minorTicks.count = 0;
  target.axes[0]!.minorTicks.visible = false;
  target.plotSlots = [];
  const before = structuredClone(model),
    plotId = model.template.panels[0]!.plotSlots[0]!.plotSlotId;
  expect(() =>
    movePlotToPanel(model, plotId, {
      panelId: target.panelId,
      xAxisId: target.axes[0]!.axisId,
      yAxisId: target.axes[1]!.axisId,
    }),
  ).toThrow();
  expect(() =>
    movePlotToPanel(model, plotId, {
      panelId: target.panelId,
      xAxisId: 'missing',
      yAxisId: target.axes[1]!.axisId,
    }),
  ).toThrow();
  expect(model).toEqual(before);
});
it('can add a new bound curve to an empty layer', () => {
  const empty = addPanel(sample(), 'panel-main');
  const next = changeSeries(empty, 'add');
  const target = next.template.panels.find(
    (panel) => panel.panelId === empty.activePanelId,
  )!;
  expect(target.plotSlots).toHaveLength(1);
  expect(
    renderFigureSvg(next.template, bindWorkspace(next.template, next.workspace))
      .ok,
  ).toBe(true);
});

it('allows partially valid log data but requires a valid paired X/Y sample', () => {
  const model = duplicatePanel(sample(), 'panel-main');
  const target = model.template.panels[1]!;
  target.axes[0]!.scale = 'log10';
  target.axes[1]!.scale = 'ln';
  const destination = {
    panelId: target.panelId,
    xAxisId: target.axes[0]!.axisId,
    yAxisId: target.axes[1]!.axisId,
  };
  expect(
    movePlotToPanel(model, 'series-1', destination).template.panels[0]!
      .plotSlots,
  ).toHaveLength(0);
  model.workspace.tables[0]!.rows[1]![1] = 2;
  model.workspace.tables[0]!.rows[2]![1] = -1;
  const before = structuredClone(model);
  expect(() => movePlotToPanel(model, 'series-1', destination)).toThrow(
    '目标对数轴无法显示',
  );
  expect(model).toEqual(before);
});

it('rejects a log box target with nonpositive samples even when another curve can render', () => {
  const model = duplicatePanel(
    changeChartType(sample(), 'series-1', 'box'),
    'panel-main',
  );
  const target = model.template.panels[1]!;
  target.axes[3]!.scale = 'log10';
  expect(() =>
    movePlotToPanel(model, 'series-1', {
      panelId: target.panelId,
      xAxisId: target.axes[0]!.axisId,
      yAxisId: target.axes[3]!.axisId,
    }),
  ).toThrow('对数箱线图包含非正样本');
});

it('ignores ungrouped box rows when validating a log target, matching rendering', () => {
  const model = changeChartType(
    importTables({ template: defaultTemplate(), workspace: emptyWorkspace() }, [
      createDataTable({
        tableId: 'table',
        source: { kind: 'csv', name: 'groups.csv' },
        rows: [
          ['Group', 'Value'],
          ['a', 1],
          ['a', 2],
          ['', -1],
        ],
      }),
    ]),
    'series-1',
    'box',
  );
  const plot = model.template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'box' || !plot.bindings.group)
    throw new Error('expected box group');
  model.workspace.slotBindings[plot.bindings.group] = {
    tableId: 'table',
    columnId: model.workspace.tables[0]!.columns[0]!.columnId,
  };
  const copy = duplicatePanel(model, 'panel-main'),
    target = copy.template.panels[1]!;
  target.axes[1]!.scale = 'log10';
  const next = movePlotToPanel(copy, 'series-1', {
    panelId: target.panelId,
    xAxisId: target.axes[0]!.axisId,
    yAxisId: target.axes[1]!.axisId,
  });
  const rendered = renderFigureSvg(
    next.template,
    bindWorkspace(next.template, next.workspace),
  );
  expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
});

it('updates copied automatic panel labels without leaving a second label behind', () => {
  const model = sample();
  model.template = labelPanels(model.template);
  const next = duplicatePanel(model, 'panel-main');
  const labelled = labelPanels(next.template);
  expect(labelled.annotations).toHaveLength(2);
  expect(labelled.annotations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ panelId: 'panel-main', text: 'a' }),
      expect.objectContaining({ panelId: next.activePanelId, text: 'b' }),
    ]),
  );
});

it('remaps crossing axes when copying and preserves them through project reload', () => {
  const model = sample();
  model.template.panels[0]!.axes[0]!.placement = {
    mode: 'cross',
    axisId: 'axis-y',
    value: 1,
    offsetPt: -2.5,
  };
  const next = duplicatePanel(model, 'panel-main');
  const copy = next.template.panels[1]!;
  expect(copy.axes[0]!.placement).toEqual({
    mode: 'cross',
    axisId: copy.axes[1]!.axisId,
    value: 1,
    offsetPt: -2.5,
  });
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(next.template, next.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  expect(reopened.workspace).toEqual(next.workspace);
  expect(reopened.template.panels).toEqual(next.template.panels);
  expect(
    renderFigureSvg(
      reopened.template,
      bindWorkspace(reopened.template, reopened.workspace),
    ).ok,
  ).toBe(true);
});

it('retains page legends and data annotations when the last curve leaves an automatic layer', () => {
  const model = duplicatePanel(sample(), 'panel-main');
  model.template.annotations.push(
    {
      annotationId: 'page-legend',
      kind: 'legend',
      visible: true,
      coordinateSpace: 'page',
      position: { x: 0, y: 1 },
      textStyle: defaultTextStyle(),
      layout: { ...defaultLegendLayout(), plotSlotIds: ['series-1'] },
    },
    {
      annotationId: 'data-note',
      kind: 'text',
      coordinateSpace: 'data',
      panelId: 'panel-main',
      xAxisId: 'axis-x',
      yAxisId: 'axis-y',
      position: { x: 0, y: 1 },
      text: 'note',
      format: 'plain',
    },
  );
  const target = model.template.panels[1]!;
  const next = movePlotToPanel(model, 'series-1', {
    panelId: target.panelId,
    xAxisId: target.axes[0]!.axisId,
    yAxisId: target.axes[1]!.axisId,
  });
  expect(next.template.annotations).toEqual(model.template.annotations);
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(next.template, next.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  expect(
    renderFigureSvg(
      reopened.template,
      bindWorkspace(reopened.template, reopened.workspace),
    ).ok,
  ).toBe(true);
});

it.each(['vertical', 'horizontal'] as const)(
  'adds a box plot back to an empty %s categorical/log layer',
  (orientation) => {
    let model = changeChartType(sample(), 'series-1', 'box');
    model.workspace.tables[0]!.rows[1]![0] = 1;
    model.workspace.tables[0]!.rows[2]![0] = 2;
    model.workspace.tables[0]!.rows[1]![1] = 1;
    const source = model.template.panels[0]!;
    const box = source.plotSlots[0]!;
    if (box.kind !== 'box') throw new Error('expected box');
    box.orientation = orientation;
    source.axes[0]!.scale = orientation === 'vertical' ? 'category' : 'log10';
    source.axes[1]!.scale = orientation === 'vertical' ? 'log10' : 'category';
    for (const axis of source.axes) {
      axis.minorTicks = { ...axis.minorTicks, visible: false, count: 0 };
      delete axis.rescale;
    }
    model = duplicatePanel(model, source.panelId);
    const target = model.template.panels[1]!;
    model = movePlotToPanel(model, 'series-1', {
      panelId: target.panelId,
      xAxisId: target.axes[0]!.axisId,
      yAxisId: target.axes[1]!.axisId,
    });
    model.activePanelId = source.panelId;
    figureActions((operation) => {
      model = operation(model);
    }).onAddChart('box');
    const added = model.template.panels[0]!.plotSlots[0]!;
    expect(added).toMatchObject({ kind: 'box', orientation });
    if (added.kind !== 'box') throw new Error('expected box');
    expect(model.workspace.slotBindings[added.bindings.values]).toBeDefined();
    expect(model.template.panels[0]!.axes).toEqual(source.axes);
    const rendered = renderFigureSvg(
      model.template,
      bindWorkspace(model.template, model.workspace),
    );
    expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
  },
);
