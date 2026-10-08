// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import { originCanvasTarget } from './origin-canvas-target.js';

it('text annotation targets page properties even inside a layer, without depending on text', () => {
  const template = defaultTemplate();
  const panelId = template.panels[0]!.panelId;
  template.annotations = [
    {
      annotationId: 'note',
      kind: 'text',
      coordinateSpace: 'panel',
      panelId,
      position: { x: 0.3, y: 0.4 },
      text: 'same label',
      format: 'plain',
    },
  ];
  const host = document.createElement('div');
  host.innerHTML = `<svg><g data-panel-id="${panelId}"><g data-annotation-id="note"><text>same label</text></g></g></svg>`;
  expect(originCanvasTarget(template, host.querySelector('text')!)).toEqual({
    kind: 'page',
  });
});

it('legend labels still target the curve, preserving existing double-click text editing', () => {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  const plot = panel.plotSlots[0]!;
  const host = document.createElement('div');
  host.innerHTML = `<svg><g data-panel-id="${panel.panelId}"><g data-role="legend" data-annotation-id="auto-${panel.panelId}"><g data-plot-slot-id="${plot.plotSlotId}"><text>label</text></g></g></g></svg>`;
  expect(originCanvasTarget(template, host.querySelector('text')!)).toEqual({
    kind: 'plot',
    panelId: panel.panelId,
    plotSlotId: plot.plotSlotId,
  });
});
