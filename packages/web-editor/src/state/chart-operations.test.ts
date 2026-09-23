import { expect, it } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { duplicateSeries } from './series-operations.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
import { changeChartType } from './chart-operations.js';
import { chartChoice } from './chart-defaults.js';

it.each(['bar', 'histogram', 'box', 'area', 'heatmap', 'contour'])(
  'duplicates every %s role into independent slots',
  (kind) => {
    const template = chartTemplate(kind);
    const source = template.panels[0]!.plotSlots[0]!;
    const overrides = Object.fromEntries(
      Object.values(source.bindings).map((id) => [id, 'column-' + id]),
    );
    const result = duplicateSeries(template, overrides, source.plotSlotId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const target = result.value.template.panels[0]!.plotSlots[1]!;
    expect(target.kind).toBe(kind);
    expect(Object.keys(target.bindings)).toEqual(Object.keys(source.bindings));
    for (const [role, id] of Object.entries(target.bindings)) {
      expect(id).not.toBe((source.bindings as any)[role]);
      expect(result.value.overrides[id!]).toBe(
        'column-' + (source.bindings as any)[role],
      );
    }
  },
);
it.each(['bar', 'histogram', 'box', 'area', 'heatmap', 'contour'])(
  'round trips an unbound %s workspace',
  (kind) => {
    const template = chartTemplate(kind);
    const workspace = { tables: [], activeTableId: null, slotBindings: {} };
    expect(
      parseWorkspaceProject(serializeWorkspaceProject(template, workspace)),
    ).toEqual({ ok: true, template, workspace });
  },
);

it('converts XY to Area preserving both bindings and adjusts a sole Bar axis', () => {
  const template = chartTemplate('xy'),
    workspace = {
      tables: [],
      activeTableId: null,
      slotBindings: {
        'slot-x': { tableId: 't', columnId: 'x' },
        'slot-y': { tableId: 't', columnId: 'y' },
      },
    };
  const area = changeChartType({ template, workspace }, 'series-1', 'area');
  expect(area.template.panels[0]!.plotSlots[0]!.bindings).toEqual({
    x: 'slot-x',
    y: 'slot-y',
  });
  expect(area.workspace.slotBindings).toEqual(workspace.slotBindings);
  const bar = changeChartType({ template, workspace }, 'series-1', 'bar');
  expect(bar.template.panels[0]!.axes[0]!.scale).toBe('category');
  expect(bar.workspace.slotBindings['series-1-value']).toEqual({
    tableId: 't',
    columnId: 'y',
  });
  expect(template.panels[0]!.axes[0]!.scale).toBe('linear');
});
it('分别将折线图和散点图转换为对应的二维绘制方式', () => {
  const template = chartTemplate('area');
  const workspace = { tables: [], activeTableId: null, slotBindings: {} };

  const scatter = changeChartType(
    { template, workspace },
    'series-1',
    'scatter',
  );
  const scatterPlot = scatter.template.panels[0]!.plotSlots[0]!;
  expect(scatterPlot.kind).toBe('xy');
  if (scatterPlot.kind !== 'xy') throw new Error('应转换为二维图');
  expect(scatterPlot.mode).toBe('markers');
  expect(chartChoice(scatterPlot)).toBe('scatter');

  const line = changeChartType(scatter, 'series-1', 'xy');
  const linePlot = line.template.panels[0]!.plotSlots[0]!;
  expect(linePlot.kind).toBe('xy');
  if (linePlot.kind !== 'xy') throw new Error('应转换为二维图');
  expect(linePlot.mode).toBe('line');
  expect(chartChoice(linePlot)).toBe('xy');
});
it('rejects incompatible shared axes and switches an entire stack group', () => {
  const template = chartTemplate('xy');
  template.panels[0]!.plotSlots.push({
    ...structuredClone(template.panels[0]!.plotSlots[0]!),
    plotSlotId: 'second',
  });
  const workspace = { tables: [], activeTableId: null, slotBindings: {} };
  expect(() =>
    changeChartType({ template, workspace }, 'series-1', 'bar'),
  ).toThrow(/轴/);
  const bar = chartTemplate('bar');
  bar.panels[0]!.plotSlots.push({
    ...structuredClone(bar.panels[0]!.plotSlots[0]!),
    plotSlotId: 'second',
  });
  const stacked = changeChartType(
    { template: bar, workspace },
    'series-1',
    'stacked-bar',
  );
  expect(
    stacked.template.panels[0]!.plotSlots.every(
      (p) => p.kind === 'bar' && p.layout === 'stacked',
    ),
  ).toBe(true);
});
