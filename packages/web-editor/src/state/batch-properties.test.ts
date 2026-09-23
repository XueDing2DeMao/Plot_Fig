import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { duplicatePanel } from './panel-operations.js';
import type { PropertyObjectRef } from './property-objects.js';
import {
  applyBatchProperties,
  batchGroups,
  batchCommonValue,
  batchTargets,
} from './batch-properties.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { setOppositeAxisSharing } from './axis-operations.js';

const source: PropertyObjectRef = {
  kind: 'axis',
  panelId: 'panel-main',
  axisId: 'axis-x',
};
const target: PropertyObjectRef = {
  kind: 'axis',
  panelId: 'panel-main',
  axisId: 'axis-y',
};
it('copies only requested axis style groups and preserves independent ranges and references', () => {
  const template = defaultTemplate();
  const [x, y] = template.panels[0]!.axes;
  x!.tickLabels.color = '#ff0000';
  x!.majorTicks.generation = { mode: 'increment', step: 2 };
  y!.range = { mode: 'fixed', min: -0.25, max: 6.5 };
  const before = structuredClone(template);
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['axis-labels'],
  });
  expect(next.panels[0]!.axes[1]!.tickLabels.color).toBe('#ff0000');
  const expected = structuredClone(before.panels[0]!.axes[1]!);
  expected.tickLabels = next.panels[0]!.axes[1]!.tickLabels;
  expect(next.panels[0]!.axes[1]).toEqual(expected);
  expect(next.panels[0]!.axes[0]).toEqual(before.panels[0]!.axes[0]);
  expect(template).toEqual(before);
});
it('shows mixed values and writes only the explicitly edited leaf, including the source value', () => {
  const template = defaultTemplate();
  template.panels[0]!.axes[0]!.line.widthPt = 1;
  template.panels[0]!.axes[1]!.line.widthPt = 3;
  template.panels[0]!.axes[1]!.line.color = '#123456';
  expect(
    batchCommonValue(template, [source, target], 'axis-line.widthPt'),
  ).toEqual({ mixed: true });
  const next = applyBatchProperties(template, {
    source,
    targets: [source, target],
    edits: { 'axis-line.widthPt': 1 },
  });
  expect(next.panels[0]!.axes[1]!.line).toMatchObject({
    widthPt: 1,
    color: '#123456',
  });
  expect(batchCommonValue(next, [source, target], 'axis-line.widthPt')).toEqual(
    { mixed: false, value: 1 },
  );
});
it('rejects unlisted paths and invalid edits atomically', () => {
  const template = defaultTemplate(),
    before = structuredClone(template);
  for (const edits of [
    { 'axis-line.widthPt': -1 },
    { axisId: 'renamed' },
    { 'axis-line.widthPt': Number.NaN },
  ])
    expect(() =>
      applyBatchProperties(template, {
        source,
        targets: [source, target],
        edits,
      }),
    ).toThrow();
  expect(template).toEqual(before);
});
it('includes cross-layer peers and rejects missing or wrong-kind targets', () => {
  const template = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  ).template;
  expect(batchTargets(template, source)).toHaveLength(8);
  expect(() =>
    applyBatchProperties(template, {
      source,
      targets: [{ kind: 'axis', panelId: 'panel-main', axisId: 'missing' }],
      groups: ['axis-line'],
    }),
  ).toThrow();
  expect(() =>
    applyBatchProperties(template, {
      source,
      targets: [{ kind: 'panel', panelId: 'panel-main' }],
      groups: ['axis-line'],
    }),
  ).toThrow();
});
it('initializes only the edited optional style and keeps target title text', () => {
  const template = defaultTemplate();
  delete template.panels[0]!.axes[1]!.grid;
  const title = structuredClone(template.panels[0]!.axes[1]!.title);
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    edits: { 'axis-grid.major.widthPt': 0.25, 'axis-title.fontSizePt': 16 },
  });
  expect(next.panels[0]!.axes[1]!.grid!.major!.widthPt).toBe(0.25);
  expect(next.panels[0]!.axes[1]!.grid!.minor).toBeUndefined();
  expect(next.panels[0]!.axes[1]!.title).toEqual({ ...title, fontSizePt: 16 });
});
it('edits layer appearance without copying geometry, naming or ratio', () => {
  const template = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  ).template;
  const panel = template.panels[1]!,
    before = structuredClone(panel);
  const next = applyBatchProperties(template, {
    source: { kind: 'panel', panelId: 'panel-main' },
    targets: [{ kind: 'panel', panelId: panel.panelId }],
    edits: { 'panel-shadow.offsetXPt': -2.5 },
  });
  expect(next.panels[1]!.appearance!.shadow).toMatchObject({
    offsetXPt: -2.5,
    offsetYPt: 3,
  });
  expect({ ...next.panels[1], appearance: undefined }).toEqual({
    ...before,
    appearance: undefined,
  });
});
it('preserves curve bindings, axis selection, mode and legend text', () => {
  const template = duplicatePanel(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    'panel-main',
  ).template;
  const plot = template.panels[0]!.plotSlots[0]!,
    other = template.panels[1]!.plotSlots[0]!;
  const ref: PropertyObjectRef = {
    kind: 'plot',
    panelId: 'panel-main',
    plotSlotId: plot.plotSlotId,
  };
  const next = applyBatchProperties(template, {
    source: ref,
    targets: [
      {
        kind: 'plot',
        panelId: template.panels[1]!.panelId,
        plotSlotId: other.plotSlotId,
      },
    ],
    edits: { 'plot-line.widthPt': 2.5, 'plot-legend.visible': true },
  });
  expect(next.panels[1]!.plotSlots[0]).toMatchObject({
    bindings: other.bindings,
    xAxisId: other.xAxisId,
    yAxisId: other.yAxisId,
    legendEntry: { visible: true, text: other.legendEntry.text },
  });
});

it('validates the final whole batch and leaves earlier targets unchanged when a later target rejects a format', () => {
  const template = defaultTemplate();
  const category = template.panels[0]!.axes.find(
    (axis) => axis.axisId === 'frame-x',
  )!;
  category.scale = 'category';
  category.minorTicks.visible = false;
  category.minorTicks.count = 0;
  template.panels[0]!.axes[0]!.tickLabels.divisor = 2;
  const before = structuredClone(template);
  expect(() =>
    applyBatchProperties(template, {
      source,
      targets: [
        target,
        { kind: 'axis', panelId: 'panel-main', axisId: category.axisId },
      ],
      groups: ['axis-labels'],
    }),
  ).toThrow();
  expect(template).toEqual(before);
});

it('copies all listed axis groups with optional defaults and saves without a version change', () => {
  const template = defaultTemplate();
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: batchGroups(template, source).map((group) => group.id),
  });
  expect(next.schemaVersion).toBe(template.schemaVersion);
  expect(next.panels[0]!.axes[1]!.majorTicks.generation).toEqual(
    template.panels[0]!.axes[1]!.majorTicks.generation,
  );
  expect(next.panels[0]!.axes[1]!.minorTicks.count).toBe(
    template.panels[0]!.axes[1]!.minorTicks.count,
  );
  const workspace = emptyWorkspace();
  expect(
    parseWorkspaceProject(serializeWorkspaceProject(next, workspace)),
  ).toEqual({ ok: true, template: next, workspace });
});

it('compares inherited defaults as effective values and changes only one nested optional field', () => {
  const template = defaultTemplate();
  const [x, y] = template.panels[0]!.axes;
  delete x!.tickLabels.bold;
  y!.tickLabels.bold = false;
  expect(
    batchCommonValue(template, [source, target], 'axis-labels.bold'),
  ).toEqual({ mixed: false, value: false });
  const next = applyBatchProperties(template, {
    source,
    targets: [target],
    edits: { 'axis-labels.offsetPt.x': -0.5 },
  });
  expect(next.panels[0]!.axes[1]!.tickLabels.offsetPt).toEqual({
    x: -0.5,
    y: 0,
  });
});

it('keeps absent curve line and symbol styles hidden when changing only width or size', () => {
  const template = defaultTemplate();
  const plot = template.panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'xy') throw new Error('expected xy');
  delete plot.lineStyle;
  delete plot.markerStyle;
  const ref: PropertyObjectRef = {
    kind: 'plot',
    panelId: 'panel-main',
    plotSlotId: plot.plotSlotId,
  };
  const next = applyBatchProperties(template, {
    source: ref,
    targets: [ref],
    edits: { 'plot-line.widthPt': 2, 'plot-symbol.sizePt': 8 },
  });
  const changed = next.panels[0]!.plotSlots[0]!;
  expect(changed).toMatchObject({
    lineStyle: { widthPt: 2, visible: false },
    markerStyle: { sizePt: 8, visible: false },
  });
});

it('preserves combined shared ranges, Y alignment and physical ratio during a style-only edit', () => {
  const template = setOppositeAxisSharing(
    defaultTemplate(),
    'panel-main',
    'frame-x',
    true,
  );
  const panel = template.panels[0]!;
  panel.axes.forEach((axis) => {
    axis.range = {
      mode: 'fixed',
      min: 0,
      max: axis.dimension === 'x' ? 20 : 10,
    };
  });
  panel.axisLengthRatio = { xAxisId: 'axis-x', yAxisId: 'axis-y', ratio: 1 };
  panel.yAxisAlignment = {
    leftAxisId: 'axis-y',
    rightAxisId: 'frame-y',
    value: 0,
  };
  const expected = structuredClone(template);
  expected.panels[0]!.axes[1]!.line.widthPt = 0.5;
  expect(
    applyBatchProperties(template, {
      source,
      targets: [target],
      edits: { 'axis-line.widthPt': 0.5 },
    }),
  ).toEqual(expected);
});
