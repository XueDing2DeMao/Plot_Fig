import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import type { MarkerStyle, XyPlot } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { applyBatchProperties, batchCommonValue } from './batch-properties.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
import { duplicateSeries } from './series-operations.js';
import { duplicatePanel } from './panel-operations.js';
import { movePlotToPanel } from './plot-panel-operations.js';
import {
  batchFieldText,
  parseBatchField,
} from '../components/batch-field-drafts.js';

const marker: MarkerStyle = {
  visible: true,
  shape: 'custom',
  sizePt: 12,
  fill: '#abcdef',
  stroke: '#123456',
  strokeWidthPt: 1.5,
  rotationDeg: -22.5,
  opacity: 0.625,
  followLineOpacity: true,
  customVertices: [
    [0, -1],
    [1, 1],
    [-1, 1],
  ],
};
function setup() {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  const first = panel.plotSlots[0] as XyPlot;
  first.markerStyle = structuredClone(marker);
  const source = {
    kind: 'plot' as const,
    panelId: panel.panelId,
    plotSlotId: first.plotSlotId,
  };
  const target = { ...source, plotSlotId: 'other' };
  const second = structuredClone(first);
  second.plotSlotId = target.plotSlotId;
  second.markerStyle = {
    ...marker,
    shape: 'star',
    rotationDeg: 45,
    opacity: 1,
  };
  delete second.markerStyle.customVertices;
  panel.plotSlots.push(second);
  return { template, source, target };
}
it('copies custom geometry atomically without copying unselected appearance or bindings', () => {
  const { template, source, target } = setup();
  const before = structuredClone(template),
    other = template.panels[0]!.plotSlots[1] as XyPlot;
  expect(
    batchCommonValue(template, [source, target], 'plot-symbol.shape'),
  ).toEqual({ mixed: true });
  const copied = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['plot-symbol'],
  });
  expect(copied.panels[0]!.plotSlots[1]).toEqual({
    ...other,
    markerStyle: { ...marker, rotationDeg: 45, opacity: 1 },
  });
  expect(
    batchCommonValue(copied, [source, target], 'plot-symbol.shape'),
  ).toEqual({
    mixed: false,
    value: { shape: 'custom', customVertices: marker.customVertices },
  });
  (
    copied.panels[0]!.plotSlots[1] as XyPlot
  ).markerStyle!.customVertices![0]![0] = 0.5;
  expect(template).toEqual(before);
  expect((copied.panels[0]!.plotSlots[0] as XyPlot).markerStyle).toEqual(
    marker,
  );
});
it('clears custom geometry when switching shape and copies or resets advanced appearance separately', () => {
  const { template, source, target } = setup();
  const next = applyBatchProperties(template, {
    source,
    targets: [source, target],
    edits: {
      'plot-symbol.shape': { shape: 'diamond' },
      'plot-symbol-appearance.rotationDeg': -45.5,
      'plot-symbol-appearance.opacity': 0.5,
    },
  });
  for (const plot of next.panels[0]!.plotSlots as XyPlot[]) {
    expect(plot.markerStyle).toMatchObject({
      shape: 'diamond',
      rotationDeg: -45.5,
      opacity: 0.5,
    });
    expect(plot.markerStyle).not.toHaveProperty('customVertices');
  }
  const copied = applyBatchProperties(template, {
    source,
    targets: [target],
    groups: ['plot-symbol-appearance'],
  });
  expect((copied.panels[0]!.plotSlots[1] as XyPlot).markerStyle).toMatchObject({
    shape: 'star',
    rotationDeg: -22.5,
    opacity: 0.625,
    followLineOpacity: true,
  });
  const reset = applyBatchProperties(copied, {
    source,
    targets: [target],
    edits: {
      'plot-symbol-appearance.rotationDeg': undefined,
      'plot-symbol-appearance.opacity': undefined,
      'plot-symbol-appearance.followLineOpacity': undefined,
    },
  });
  const result = (reset.panels[0]!.plotSlots[1] as XyPlot).markerStyle!;
  for (const key of ['rotationDeg', 'opacity', 'followLineOpacity'])
    expect(result).not.toHaveProperty(key);
});
it('rejects invalid batches with no partial mutation', () => {
  const { template, source, target } = setup(),
    before = structuredClone(template);
  for (const edits of [
    {
      'plot-symbol.shape': {
        shape: 'custom',
        customVertices: [
          [0, 0],
          [1, 1],
        ],
      },
    },
    {
      'plot-symbol.shape': {
        shape: 'custom',
        customVertices: [
          [-1, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
        ],
      },
    },
    { 'plot-symbol.shape': { shape: 'star', opacity: 0.5 } },
    { 'plot-symbol-appearance.opacity': 1.1 },
    { 'plot-symbol-appearance.rotationDeg': -361 },
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
it('retains all marker settings through save/reopen, curve/layer copying and moving', () => {
  const { template, source } = setup();
  const json = serializeWorkspaceProject(template, emptyWorkspace());
  expect(JSON.parse(json)).toMatchObject({
    version: '2.0.0',
    template: { schemaVersion: '1.22.0' },
  });
  expect(parseWorkspaceProject(json)).toMatchObject({ ok: true, template });
  const copy = duplicateSeries(template, {}, source.plotSlotId);
  expect(copy.ok).toBe(true);
  if (copy.ok)
    expect(
      (copy.value.template.panels[0]!.plotSlots.at(-1) as XyPlot).markerStyle,
    ).toEqual(marker);
  const layers = duplicatePanel(
    { template, workspace: emptyWorkspace() },
    source.panelId,
  );
  const destination = layers.template.panels.at(-1)!;
  expect((destination.plotSlots[0] as XyPlot).markerStyle).toEqual(marker);
  const moved = movePlotToPanel(layers, source.plotSlotId, {
    panelId: destination.panelId,
    xAxisId: destination.axes[0]!.axisId,
    yAxisId: destination.axes[1]!.axisId,
  });
  expect(
    (
      moved.template.panels
        .at(-1)!
        .plotSlots.find((p) => p.plotSlotId === source.plotSlotId) as XyPlot
    ).markerStyle,
  ).toEqual(marker);
});
it('round trips batch shape drafts and rejects incomplete coordinates while allowing a shape switch', () => {
  const field = {
    key: 'shape',
    label: '符号形状',
    type: 'marker-shape' as const,
  };
  const geometry = { shape: 'custom', customVertices: marker.customVertices };
  const text = batchFieldText(field, geometry);
  expect(parseBatchField(field, text)).toEqual(geometry);
  const invalid = { shape: 'custom', vertices: '0, -\n1,1\n-1,1' };
  expect(() => parseBatchField(field, JSON.stringify(invalid))).toThrow();
  expect(
    parseBatchField(field, JSON.stringify({ ...invalid, shape: 'star' })),
  ).toEqual({ shape: 'star' });
});
