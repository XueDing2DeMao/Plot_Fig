import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from '../render.js';
import { renderPanelAnnotations } from '../annotations.js';
import { prepareAxisScale } from '../panel-scales.js';
import { preparePlot } from './prepare.js';

it('uses each plot axis reference for automatic ranges and annotations', () => {
  const template = chartTemplate('area'),
    panel = template.panels[0]!;
  const second = structuredClone(panel.plotSlots[0]!);
  second.plotSlotId = 'second';
  second.yAxisId = 'right';
  if (second.kind !== 'area') throw new Error('fixture');
  second.bindings.y = 'slot-right';
  panel.plotSlots.push(second);
  panel.axes.push({
    ...structuredClone(panel.axes[1]!),
    axisId: 'right',
    position: 'right',
  });
  template.dataSlots.push({
    ...template.dataSlots[1]!,
    dataSlotId: 'slot-right',
  });
  const data = chartData({ x: [0, 1], y: [0, 2], right: [0, 200] });
  const prepared = panel.plotSlots.map((p) => preparePlot(p, data));
  const scales = new Map(
    panel.axes.map((axis) => [axis.axisId, prepareAxisScale(axis, prepared)!]),
  );
  expect(scales.get(second.yAxisId)).toMatchObject({ min: 0, max: 200 });
  expect(scales.get(panel.axes[1]!.axisId)).toMatchObject({ min: 0, max: 2 });
  const annotations: typeof template.annotations = [
    {
      annotationId: 'ref',
      kind: 'reference-line',
      coordinateSpace: 'data',
      panelId: panel.panelId,
      xAxisId: second.xAxisId,
      yAxisId: 'right',
      orientation: 'y',
      value: 100,
    },
  ];
  expect(
    renderPanelAnnotations(annotations, panel, {
      rect: { x: 0, y: 0, width: 100, height: 100 },
      scales,
    }),
  ).toContain('y1="50"');
  template.annotations = annotations;
  expect(renderTemplateSvg(template, data).ok).toBe(true);
});
