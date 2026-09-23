import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { applyBatchProperties } from './batch-properties.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
import { duplicateSeries } from './series-operations.js';
import { duplicatePanel } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import {
  batchFieldText,
  parseBatchField,
} from '../components/batch-field-drafts.js';
import type { BatchField } from './batch-property-fields.js';
import { resizePageLayers } from './page-geometry.js';
const extras = {
  closeLine: true,
  symbolGapPct: 25.5,
  lineArrows: {
    position: 'repeat',
    lengthPt: 7.5,
    angleDeg: 45,
    spacingFactor: 5,
    curveTolerance: 1.5,
  },
  dropLines: {
    horizontal: { target: { mode: 'axis-max' } },
    vertical: {
      target: { mode: 'value', value: -0.5 },
      style: { color: '#334455', widthPt: 1.25, dash: 'dotted' },
    },
  },
};
function setup() {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  const source = {
    kind: 'plot' as const,
    panelId: panel.panelId,
    plotSlotId: panel.plotSlots[0]!.plotSlotId,
  };
  const target = { ...source, plotSlotId: 'target' };
  panel.plotSlots.push({
    ...structuredClone(panel.plotSlots[0]!),
    plotSlotId: target.plotSlotId,
  });
  Object.assign(panel.plotSlots[0]!, extras);
  return { template, source, target };
}
it('saves and reopens all extras while retaining the 2.0 project envelope', () => {
  const { template, source } = setup();
  const next = updatePropertyObjectSettings(
    template,
    source,
    readPropertyObjectSettings(template, source),
  );
  const json = serializeWorkspaceProject(next, emptyWorkspace());
  expect(JSON.parse(json)).toMatchObject({
    version: '2.0.0',
    template: { schemaVersion: '1.22.0' },
  });
  expect(parseWorkspaceProject(json)).toMatchObject({
    ok: true,
    template: next,
  });
});
it('copies independent extras groups atomically and clears them without changing identity/binding/style', () => {
  const { template, source, target } = setup();
  const original = structuredClone(template.panels[0]!.plotSlots[1]);
  const groups = ['plot-line-extras', 'plot-arrows', 'plot-drop-lines'];
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    groups,
  });
  expect(next.panels[0]!.plotSlots[1]).toEqual({ ...original, ...extras });
  const cleared = applyBatchProperties(template, {
    source: target,
    targets: [source],
    groups,
  });
  expect(cleared.panels[0]!.plotSlots[0]).toEqual({
    ...original,
    plotSlotId: source.plotSlotId,
  });
  expect(template.panels[0]!.plotSlots[0]).toMatchObject(extras);
});
it('rejects a batch target incompatible with the bound logarithmic axis without partial changes', () => {
  const { template, source, target } = setup();
  const panel = template.panels[0]!,
    y = structuredClone(panel.axes.find((a) => a.dimension === 'y')!);
  Object.assign(y, { axisId: 'right-y', position: 'right', scale: 'log10' });
  panel.axes.push(y);
  panel.plotSlots[1]!.yAxisId = y.axisId;
  const before = structuredClone(template);
  expect(() =>
    applyBatchProperties(template, {
      source,
      targets: [source, target],
      groups: ['plot-drop-lines'],
    }),
  ).toThrow();
  expect(template).toEqual(before);
});
it('retains extras through curve/layer copying and moving', () => {
  const { template, source } = setup();
  const model = { template, workspace: emptyWorkspace() };
  const copied = duplicateSeries(template, {}, source.plotSlotId);
  expect(copied.ok).toBe(true);
  if (copied.ok)
    expect(copied.value.template.panels[0]!.plotSlots.at(-1)).toMatchObject(
      extras,
    );
  const layers = duplicatePanel(model, source.panelId);
  const destination = layers.template.panels.at(-1)!;
  expect(destination.plotSlots[0]).toMatchObject(extras);
  const moved = movePlotToPanel(layers, source.plotSlotId, {
    panelId: destination.panelId,
    xAxisId: destination.axes[0]!.axisId,
    yAxisId: destination.axes[1]!.axisId,
  });
  expect(
    moved.template.panels
      .at(-1)!
      .plotSlots.find((p) => p.plotSlotId === source.plotSlotId),
  ).toMatchObject(extras);
});
it('retains physical effect sizes and numeric targets when resizing the page and layer', () => {
  const { template } = setup(),
    candidate = structuredClone(template);
  candidate.page.size.width.value *= 1.5;
  const resized = resizePageLayers(template, candidate, true);
  expect(resized.panels[0]!.plotSlots[0]).toMatchObject(extras);
  expect(resized.panels[0]!.frame.width).toBeLessThan(
    template.panels[0]!.frame.width,
  );
  const ref = { kind: 'panel' as const, panelId: resized.panels[0]!.panelId };
  const settings = readPropertyObjectSettings(resized, ref);
  if (settings.kind !== 'panel') throw new Error('panel');
  settings.frame.width *= 0.8;
  expect(
    updatePropertyObjectSettings(resized, ref, settings).panels[0]!
      .plotSlots[0],
  ).toMatchObject(extras);
});
it.each([
  ['curve-arrows', extras.lineArrows],
  ['drop-line', extras.dropLines.vertical],
] as const)(
  'round trips %s batch draft and rejects incomplete numbers',
  (type, value) => {
    const field = {
      key: 'effect',
      label: '效果',
      type,
      optional: true,
    } as BatchField;
    const text = batchFieldText(field, value);
    expect(parseBatchField(field, text)).toEqual(value);
    const bad = JSON.parse(text);
    bad[type === 'curve-arrows' ? 'length' : 'value'] = '-';
    expect(() => parseBatchField(field, JSON.stringify(bad))).toThrow();
  },
);
