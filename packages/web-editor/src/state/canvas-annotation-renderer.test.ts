import { expect, it } from 'vitest';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  defaultLegendLayout,
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { figureCoordinates, renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { moveAnnotationBySvgDelta } from './canvas-annotation-drag.js';
import { isolateLayer } from './layer-batch.js';
import { synchronizeLegendSources } from './legend-bindings.js';

const data = chartData({ x: [1, 2, 3], y: [2, 3, 4] });

function preview(template: FigureTemplate) {
  const view = isolateLayer(
    { template, workspace: emptyWorkspace() },
    'panel-main',
  ).template;
  const result = renderFigureSvg(view, data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error('Expected valid preview');
  const root = result.svg.match(/<g data-role="legend"[^>]*>/)?.[0];
  expect(root).toBeDefined();
  return {
    coordinates: figureCoordinates(view, data),
    id: root!.match(/data-annotation-id="([^"]+)"/)![1]!,
    implicitPanelId: root!.match(
      /data-implicit-legend-panel-id="([^"]+)"/,
    )?.[1],
    bounds: root!
      .match(/data-bounds="([^"]+)"/)![1]!
      .split(' ')
      .map(Number),
    entries: [
      ...result.svg.matchAll(
        /data-role="legend-entry"[^>]*data-plot-slot-id="([^"]+)"/g,
      ),
    ].map((match) => match[1]),
  };
}

function multiPanelTemplate() {
  const template = chartTemplate('xy');
  const other = structuredClone(template.panels[0]!);
  other.panelId = 'other';
  for (const axis of other.axes) axis.axisId = `other-${axis.axisId}`;
  for (const plot of other.plotSlots) {
    plot.plotSlotId = 'other-series';
    plot.xAxisId = `other-${plot.xAxisId}`;
    plot.yAxisId = `other-${plot.yAxisId}`;
  }
  template.panels.push(other);
  return template;
}

it('materializing a default legend preserves its entries and dimensions after legend source synchronization', () => {
  const template = chartTemplate('xy');
  const shown = template.panels[0]!.plotSlots[0]!;
  shown.legendEntry.source = 'auto';
  template.panels[0]!.plotSlots.push({
    ...structuredClone(shown),
    plotSlotId: 'hidden-entry',
    legendEntry: { visible: false, text: 'Hidden', source: 'auto' },
  });
  const model = synchronizeLegendSources({
    template,
    workspace: emptyWorkspace(),
  });
  const before = preview(model.template);
  const moved = moveAnnotationBySvgDelta(
    model.template,
    before.coordinates,
    before.id,
    { x: -20, y: 10 },
    before.implicitPanelId,
  );
  const after = preview(
    synchronizeLegendSources({ ...model, template: moved }).template,
  );
  expect(after.implicitPanelId).toBeUndefined();
  expect(after.entries).toEqual(before.entries);
  expect(after.entries).toEqual(['series-1']);
  expect(after.bounds.slice(2)).toEqual(before.bounds.slice(2));
  expect(after.bounds[0]!).toBeCloseTo(before.bounds[0]! - 20, 3);
  expect(after.bounds[1]!).toBeCloseTo(before.bounds[1]! + 10, 3);
});

it('moves the rendered implicit legend without editing a colliding ID omitted from the isolated preview', () => {
  const template = multiPanelTemplate();
  template.annotations.push({
    annotationId: 'auto-panel-main',
    kind: 'text',
    coordinateSpace: 'panel',
    panelId: 'other',
    position: { x: 0.1, y: 0.2 },
    text: 'Other layer',
    format: 'plain',
  });
  const before = preview(template);
  expect(before.id).toBe('auto-panel-main');
  const moved = moveAnnotationBySvgDelta(
    template,
    before.coordinates,
    before.id,
    { x: -20, y: 10 },
    before.implicitPanelId,
  );
  expect(validateFigureTemplate(moved).ok).toBe(true);
  expect(moved.annotations[0]).toBe(template.annotations[0]);
  expect(moved.annotations[1]).toMatchObject({
    annotationId: 'auto-panel-main-2',
    kind: 'legend',
    panelId: 'panel-main',
  });
  const after = preview(moved);
  expect(after.id).toBe('auto-panel-main-2');
  expect(after.implicitPanelId).toBeUndefined();
  expect(after.bounds[0]!).toBeCloseTo(before.bounds[0]! - 20, 3);
  expect(after.bounds[1]!).toBeCloseTo(before.bounds[1]! + 10, 3);
});

it('moves an implicit legend when an unrelated page legend was filtered out of the isolated preview', () => {
  const template = multiPanelTemplate();
  template.annotations.push({
    annotationId: 'other-page-legend',
    kind: 'legend',
    coordinateSpace: 'page',
    visible: true,
    position: { x: 0.5, y: 0.5 },
    layout: { ...defaultLegendLayout(), plotSlotIds: ['other-series'] },
  });
  const before = preview(template);
  expect(before.implicitPanelId).toBe('panel-main');
  const moved = moveAnnotationBySvgDelta(
    template,
    before.coordinates,
    before.id,
    { x: -10, y: 10 },
    before.implicitPanelId,
  );
  expect(validateFigureTemplate(moved).ok).toBe(true);
  expect(moved.annotations[0]).toBe(template.annotations[0]);
  expect(moved.annotations[1]).toMatchObject({
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId: 'panel-main',
  });
  expect(preview(moved).implicitPanelId).toBeUndefined();
});
