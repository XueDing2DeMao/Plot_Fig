import { expect, it } from 'vitest';
import { createLayerStack, type FigureTemplate } from '@plot-fig/figure-schema';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import { duplicatePanel } from './panel-operations.js';
import { duplicateSeries, removeSeries } from './series-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import { applyBatchProperties } from './batch-properties.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { readLayerStack } from './origin-layer-stack.js';
import { changeAllChartTypes } from './chart-operations.js';

function fixture() {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  const source = panel.plotSlots[0]!;
  panel.plotSlots = [0, 1, 2].map((i) => ({
    ...structuredClone(source),
    plotSlotId: `curve-${i}`,
  }));
  panel.layerStack = createLayerStack(
    panel.plotSlots.map((plot) => plot.plotSlotId),
  );
  panel.layerStack.mode = 'individual';
  panel.layerStack.subgroups = [
    { groupId: 'subgroup', members: ['curve-0', 'curve-2'] },
  ];
  panel.layerStack.individual.values = panel.plotSlots.map((plot, i) => ({
    plotSlotId: plot.plotSlotId,
    xOffset: i,
    yOffset: i * 10,
    xMultiplier: 1,
    yMultiplier: 2,
  }));
  return { template, workspace: emptyWorkspace() };
}
it('reads legacy individual offsets instead of showing zero values', () => {
  const model = fixture();
  const panel = model.template.panels[0]!;
  delete panel.layerStack;
  for (const [i, plot] of panel.plotSlots.entries())
    if (plot.kind === 'xy')
      plot.transform = { offsetY: { mode: 'constant', value: i * 7 } };
  expect(
    readLayerStack(panel).individual.values.map((value) => value.yOffset),
  ).toEqual([0, 7, 14]);
});
it('defaults horizontal bar individual controls to the numeric X axis', () => {
  const panel = chartTemplate('bar').panels[0]!;
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'bar') throw new Error('bar expected');
  plot.orientation = 'horizontal';
  expect(readLayerStack(panel).individual).toMatchObject({ x: true, y: false });
});
it('reads legacy stacked bars as cumulative without writing a new layerStack', () => {
  const panel = chartTemplate('bar').panels[0]!;
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'bar') throw new Error('bar expected');
  plot.layout = 'stacked';
  plot.stackGroup = 'stack-1';
  plot.options = { baseline: 0, missing: 'gap', percentage: true };
  panel.plotSlots.push({
    ...structuredClone(plot),
    plotSlotId: 'second',
    stackGroup: 'stack-2',
  });
  expect(readLayerStack(panel).mode).toBe('cumulative');
  expect(readLayerStack(panel).normalizePercent).toBe(true);
  expect(readLayerStack(panel).withinSubgroup).toBe(true);
  expect(readLayerStack(panel).subgroups.map((group) => group.members)).toEqual(
    [[plot.plotSlotId], ['second']],
  );
  expect(panel.layerStack).toBeUndefined();
  panel.plotSlots.push({
    ...structuredClone(plot),
    plotSlotId: 'other',
    layout: 'grouped',
  });
  expect(readLayerStack(panel).mode).toBe('none');
});
it.each(['box', 'histogram', 'heatmap'] as const)(
  'clears incompatible layer stacking when converting to %s',
  (kind) => {
    const model = fixture();
    const next = changeAllChartTypes(model, kind);
    expect(next.template.panels[0]!.layerStack).toBeUndefined();
  },
);
it('ends incremental stacking when converting bar members to XY curves', () => {
  const template = chartTemplate('bar');
  const panel = template.panels[0]!;
  panel.layerStack = createLayerStack(
    panel.plotSlots.map((plot) => plot.plotSlotId),
  );
  panel.layerStack.mode = 'incremental';
  const next = changeAllChartTypes(
    { template, workspace: emptyWorkspace() },
    'xy',
  );
  expect(next.template.panels[0]!.layerStack!.mode).toBe('none');
});
it('includes layerStack in property transactions and preserves it through save/reopen', () => {
  const model = fixture();
  const ref = { kind: 'panel', panelId: 'panel-main' } as const;
  const draft = readPropertyObjectSettings(model.template, ref);
  expect(draft).toMatchObject({
    layerStack: model.template.panels[0]!.layerStack,
  });
  if (draft.kind !== 'panel') throw new Error('panel expected');
  draft.layerStack!.constant = { values: [0, 10], absolute: true };
  draft.layerStack!.mode = 'constant';
  const next = updatePropertyObjectSettings(model.template, ref, draft);
  expect(next.panels[0]!.layerStack).toEqual(draft.layerStack);
  const parsed = parseWorkspaceProject(
    serializeWorkspaceProject(next, model.workspace),
  );
  expect(parsed.ok).toBe(true);
  if (parsed.ok)
    expect(parsed.template.panels[0]!.layerStack).toEqual(draft.layerStack);
});
it('does not create layerStack when a legacy layer is only opened and applied', () => {
  const model = fixture();
  delete model.template.panels[0]!.layerStack;
  const panel = model.template.panels[0]!;
  panel.stack = { mode: 'normal', members: ['curve-0', 'curve-1'] };
  const ref = { kind: 'panel', panelId: panel.panelId } as const;
  const next = updatePropertyObjectSettings(
    model.template,
    ref,
    readPropertyObjectSettings(model.template, ref),
  );
  expect(next.panels[0]!.layerStack).toBeUndefined();
  expect(next.panels[0]!.stack).toEqual(panel.stack);
});
it('remaps members, subgroups and individual settings when duplicating a panel', () => {
  const model = fixture();
  const next = duplicatePanel(model, 'panel-main');
  const copied = next.template.panels[1]!;
  expect(copied.layerStack!.members).toEqual(
    copied.plotSlots.map((plot) => plot.plotSlotId),
  );
  expect(copied.layerStack!.subgroups[0]!.members).toEqual([
    copied.plotSlots[0]!.plotSlotId,
    copied.plotSlots[2]!.plotSlotId,
  ]);
  expect(
    copied.layerStack!.individual.values.map((value) => value.plotSlotId),
  ).toEqual(copied.layerStack!.members);
});
it('removes deleted curves from all layerStack references', () => {
  const model = fixture();
  const removed = removeSeries(model.template, {}, 'curve-2');
  expect(removed.ok).toBe(true);
  if (!removed.ok) throw new Error(removed.message);
  const stack = removed.value.template.panels[0]!.layerStack!;
  expect(stack.members).toEqual(['curve-0', 'curve-1']);
  expect(stack.subgroups[0]!.members).toEqual(['curve-0']);
  expect(stack.individual.values.map((value) => value.plotSlotId)).toEqual([
    'curve-0',
    'curve-1',
  ]);
});
it('batch-applies complete stack configuration using destination curve IDs', () => {
  const model = fixture();
  const other = structuredClone(model.template.panels[0]!);
  other.panelId = 'other';
  other.axes.forEach((axis) => {
    axis.axisId = `other-${axis.axisId}`;
  });
  other.plotSlots.forEach((plot) => {
    plot.plotSlotId = `other-${plot.plotSlotId}`;
    plot.xAxisId = `other-${plot.xAxisId}`;
    plot.yAxisId = `other-${plot.yAxisId}`;
  });
  delete other.layerStack;
  model.template.panels.push(other);
  const next = applyBatchProperties(model.template, {
    source: { kind: 'panel', panelId: 'panel-main' },
    targets: [{ kind: 'panel', panelId: 'other' }],
    groups: ['panel-stack'],
  });
  expect(next.panels[1]!.layerStack).toMatchObject({
    mode: 'individual',
    members: ['other-curve-0', 'other-curve-1', 'other-curve-2'],
  });
  expect(next.panels[1]!.layerStack!.individual.values[2]).toMatchObject({
    plotSlotId: 'other-curve-2',
    yOffset: 20,
    yMultiplier: 2,
  });
});
it('duplicates a curve with its stack membership, subgroup and individual multipliers', () => {
  const model = fixture();
  const copied = duplicateSeries(model.template, {}, 'curve-2');
  expect(copied.ok).toBe(true);
  if (!copied.ok) throw new Error(copied.message);
  const stack = copied.value.template.panels[0]!.layerStack!;
  const id = copied.value.selectedPlotSlotId;
  expect(stack.members).toContain(id);
  expect(stack.subgroups[0]!.members).toContain(id);
  expect(
    stack.individual.values.find((value) => value.plotSlotId === id),
  ).toMatchObject({ yOffset: 20, yMultiplier: 2 });
});
it.each([false, true])(
  'moves a curve into a destination with existing stack = %s',
  (existing) => {
    const model = fixture();
    const target = structuredClone(model.template.panels[0]!);
    target.panelId = 'target';
    target.axes.forEach((axis) => {
      axis.axisId = `target-${axis.axisId}`;
    });
    target.plotSlots = [];
    delete target.layerStack;
    if (existing) {
      const plot = structuredClone(model.template.panels[0]!.plotSlots[0]!);
      plot.plotSlotId = 'target-curve';
      plot.xAxisId = `target-${plot.xAxisId}`;
      plot.yAxisId = `target-${plot.yAxisId}`;
      target.plotSlots.push(plot);
      target.layerStack = createLayerStack(['target-curve']);
      target.layerStack.mode = 'constant';
      target.layerStack.constant.values = [100];
    }
    model.template.panels.push(target);
    const next = movePlotToPanel(model, 'curve-2', {
      panelId: 'target',
      xAxisId: target.axes.find((axis) => axis.dimension === 'x')!.axisId,
      yAxisId: target.axes.find((axis) => axis.dimension === 'y')!.axisId,
    });
    expect(next.template.panels[0]!.layerStack!.members).not.toContain(
      'curve-2',
    );
    expect(
      next.template.panels[0]!.layerStack!.individual.values.map(
        (value) => value.plotSlotId,
      ),
    ).not.toContain('curve-2');
    const stack = next.template.panels[1]!.layerStack!;
    if (existing)
      expect(stack).toMatchObject({
        mode: 'constant',
        members: ['target-curve', 'curve-2'],
        constant: { values: [100] },
      });
    else
      expect(stack).toMatchObject({
        mode: 'individual',
        members: ['curve-2'],
        individual: {
          values: [{ plotSlotId: 'curve-2', yOffset: 20, yMultiplier: 2 }],
        },
      });
  },
);
