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

const appearance = {
  cap: 'round',
  join: 'bevel',
  miterLimit: 7,
  opacity: 0.625,
  customDash: { lengthsPt: [8, 3, 1, 3], offsetPt: -0.75 },
};
function fixture(kind = 'xy') {
  const template = chartTemplate(kind),
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
  return { template, source, target };
}
it.each(['xy', 'area', 'box', 'contour'])(
  'saves/reopens %s advanced settings with the workspace envelope unchanged',
  (kind) => {
    const { template, source } = fixture(kind),
      value = readPropertyObjectSettings(template, source);
    if (value.kind !== 'plot') throw new Error('plot');
    Object.assign(value.settings.line, appearance);
    const next = updatePropertyObjectSettings(template, source, value);
    expect(next.panels[0]!.plotSlots[0]).toMatchObject({
      lineStyle: appearance,
    });
    const json = serializeWorkspaceProject(next, emptyWorkspace());
    expect(JSON.parse(json)).toMatchObject({
      version: '2.0.0',
      template: { schemaVersion: '1.22.0' },
    });
    expect(parseWorkspaceProject(json)).toMatchObject({
      ok: true,
      template: next,
    });
  },
);
it('copies advanced appearance atomically without changing target color, width, identities or bindings', () => {
  const { template, source, target } = fixture();
  Object.assign(
    (template.panels[0]!.plotSlots[0] as any).lineStyle,
    appearance,
  );
  const before = structuredClone(template),
    oldTarget = before.panels[0]!.plotSlots[1] as any;
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['plot-line-appearance'],
  });
  expect(next.panels[0]!.plotSlots[1]).toEqual({
    ...oldTarget,
    lineStyle: { ...oldTarget.lineStyle, ...appearance },
  });
  expect(template).toEqual(before);
  const cleared = applyBatchProperties(before, {
    source: target,
    targets: [source],
    groups: ['plot-line-appearance'],
  });
  expect((cleared.panels[0]!.plotSlots[0] as any).lineStyle).toEqual(
    (template.panels[0]!.plotSlots[1] as any).lineStyle,
  );
});
it('clears custom dash when choosing a preset and gives an explicitly supplied complete pattern precedence regardless of edit order', () => {
  const { template, source, target } = fixture();
  Object.assign(
    (template.panels[0]!.plotSlots[1] as any).lineStyle,
    appearance,
  );
  const preset = applyBatchProperties(template, {
    source,
    targets: [target],
    edits: { 'plot-line.dash': 'dotted' },
  });
  expect((preset.panels[0]!.plotSlots[1] as any).lineStyle).not.toHaveProperty(
    'customDash',
  );
  for (const entries of [
    [
      ['plot-line.dash', 'dotted'],
      ['plot-line-appearance.customDash', appearance.customDash],
    ],
    [
      ['plot-line-appearance.customDash', appearance.customDash],
      ['plot-line.dash', 'dotted'],
    ],
  ]) {
    const next = applyBatchProperties(template, {
      source,
      targets: [target],
      edits: Object.fromEntries(entries),
    });
    expect(next.panels[0]!.plotSlots[1]).toMatchObject({
      lineStyle: { dash: 'dotted', customDash: appearance.customDash },
    });
  }
});
it.each([
  { lengthsPt: [1, 2, 3] },
  { lengthsPt: [1, 2], offsetPt: NaN },
  { offsetPt: 2 },
])('rejects invalid batch dash atomically %j', (customDash) => {
  const { template, source, target } = fixture(),
    before = structuredClone(template);
  expect(() =>
    applyBatchProperties(template, {
      source,
      targets: [source, target],
      edits: { 'plot-line-appearance.customDash': customDash },
    }),
  ).toThrow();
  expect(template).toEqual(before);
});
it('keeps complete appearance through curve/layer duplication and curve movement', () => {
  const { template, source } = fixture();
  Object.assign(
    (template.panels[0]!.plotSlots[0] as any).lineStyle,
    appearance,
  );
  const copied = duplicateSeries(template, {}, source.plotSlotId);
  expect(copied.ok).toBe(true);
  if (copied.ok)
    expect(copied.value.template.panels[0]!.plotSlots.at(-1)).toMatchObject({
      lineStyle: appearance,
    });
  const model = duplicatePanel(
      { template, workspace: emptyWorkspace() },
      source.panelId,
    ),
    target = model.template.panels[1]!;
  expect(target.plotSlots[0]).toMatchObject({ lineStyle: appearance });
  const moved = movePlotToPanel(model, source.plotSlotId, {
    panelId: target.panelId,
    xAxisId: target.axes[0]!.axisId,
    yAxisId: target.axes[1]!.axisId,
  });
  expect(moved.template.panels[1]!.plotSlots.at(-1)).toMatchObject({
    plotSlotId: source.plotSlotId,
    lineStyle: appearance,
  });
});
