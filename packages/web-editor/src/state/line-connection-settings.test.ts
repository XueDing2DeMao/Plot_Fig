import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { applyBatchProperties, batchGroups } from './batch-properties.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { compatiblePlotAxes } from './plot-panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import { duplicatePanel } from './panel-operations.js';
import { duplicateSeries } from './series-operations.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';

function fixture() {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  const source = {
    kind: 'plot' as const,
    panelId: panel.panelId,
    plotSlotId: panel.plotSlots[0]!.plotSlotId,
  };
  const second = structuredClone(panel.plotSlots[0]!);
  second.plotSlotId = 'second';
  panel.plotSlots.push(second);
  return { template, source, target: { ...source, plotSlotId: 'second' } };
}
it('copies connection independently of line style and preserves bindings', () => {
  const { template, source, target } = fixture();
  Object.assign(template.panels[0]!.plotSlots[0]!, {
    lineConnection: 'step-h',
  });
  const before = structuredClone(template);
  const styleOnly = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['plot-line'],
  });
  expect(styleOnly.panels[0]!.plotSlots[1]).not.toHaveProperty(
    'lineConnection',
  );
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['plot-connection'],
  });
  expect(next.panels[0]!.plotSlots[1]).toEqual({
    ...before.panels[0]!.plotSlots[1],
    lineConnection: 'step-h',
  });
  expect(template).toEqual(before);
});
it('rejects a batch spline atomically if target data or axes are incompatible', () => {
  const { template, source, target } = fixture();
  const before = structuredClone(template);
  const request = {
    source,
    targets: [source, target],
    edits: { 'plot-connection.lineConnection': 'spline' },
  };
  expect(() =>
    applyBatchProperties(
      template,
      request,
      chartData({ x: [0, 0, 1], y: [1, 2, 3] }),
    ),
  ).toThrow(/严格递增/);
  expect(template).toEqual(before);
  template.panels[0]!.axes[0]!.scale = 'log10';
  expect(() => applyBatchProperties(template, request)).toThrow(/线性/);
  expect(
    compatiblePlotAxes(
      { ...template.panels[0]!.plotSlots[0]!, lineConnection: 'spline' } as any,
      template.panels[0]!.axes,
      'x',
    ),
  ).toEqual([]);
});
it.each(['straight', 'step-h', 'step-v', 'spline'])(
  'preserves %s through project save and reopen without changing the project envelope',
  (connection) => {
    const { template, source } = fixture();
    const settings = readPropertyObjectSettings(template, source);
    if (settings.kind !== 'plot') throw new Error('plot expected');
    Object.assign(settings.settings.plot, { lineConnection: connection });
    const next = updatePropertyObjectSettings(template, source, settings);
    const serialized = serializeWorkspaceProject(next, emptyWorkspace());
    expect(JSON.parse(serialized)).toMatchObject({
      version: '2.0.0',
      template: { schemaVersion: '1.22.0' },
    });
    expect(parseWorkspaceProject(serialized)).toMatchObject({
      ok: true,
      template: next,
    });
  },
);
it('does not expose XY connection controls for other plot types', () => {
  const template = chartTemplate('area'),
    panel = template.panels[0]!;
  expect(
    batchGroups(template, {
      kind: 'plot',
      panelId: panel.panelId,
      plotSlotId: panel.plotSlots[0]!.plotSlotId,
    }).some((g) => g.id === 'plot-connection'),
  ).toBe(false);
});

it('preserves spline through curve duplication, layer duplication and movement', () => {
  const { template, source } = fixture();
  Object.assign(template.panels[0]!.plotSlots[0]!, {
    lineConnection: 'spline',
  });
  const copied = duplicateSeries(template, {}, source.plotSlotId);
  expect(copied.ok).toBe(true);
  if (copied.ok)
    expect(copied.value.template.panels[0]!.plotSlots.at(-1)).toMatchObject({
      lineConnection: 'spline',
    });
  const model = duplicatePanel(
      { template, workspace: emptyWorkspace() },
      source.panelId,
    ),
    target = model.template.panels[1]!;
  expect(target.plotSlots[0]).toMatchObject({ lineConnection: 'spline' });
  const moved = movePlotToPanel(model, source.plotSlotId, {
    panelId: target.panelId,
    xAxisId: target.axes[0]!.axisId,
    yAxisId: target.axes[1]!.axisId,
  });
  expect(moved.template.panels[1]!.plotSlots.at(-1)).toMatchObject({
    plotSlotId: source.plotSlotId,
    lineConnection: 'spline',
  });
});
