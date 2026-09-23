import { expect, it } from 'vitest';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { validateFixedAxisTicks } from './index.js';

function emptyFixedTemplate() {
  const template = createCurrentTemplate();
  template.panels[0]!.plotSlots = [];
  template.dataSlots = [];
  template.panels[0]!.axes.forEach((axis) => {
    axis.range = { mode: 'fixed', min: 0, max: 1 };
  });
  return template;
}

it('reports each visible fixed axis exceeding its tick budget without data or SVG rendering', () => {
  const template = emptyFixedTemplate();
  template.panels[0]!.axes.forEach((axis) => {
    axis.minorTicks = { ...axis.minorTicks, visible: true, count: 2001 };
  });
  const before = structuredClone(template);
  const diagnostics = validateFixedAxisTicks(template);
  expect(diagnostics).toHaveLength(2);
  expect(diagnostics.map((entry) => entry.sourcePath)).toEqual([
    '/panels/panel-main/axes/axis-x',
    '/panels/panel-main/axes/axis-y',
  ]);
  expect(
    diagnostics.every(
      (entry) =>
        entry.severity === 'error' && /刻度.*10000/.test(entry.message),
    ),
  ).toBe(true);
  expect(template).toEqual(before);
});

it('checks new generation precision even when the graph has no curves or data slots', () => {
  const template = emptyFixedTemplate();
  const axis = template.panels[0]!.axes[0]!;
  axis.range = { mode: 'fixed', min: 1, max: 1 + Number.EPSILON };
  axis.minorTicks = { ...axis.minorTicks, visible: true, count: 1 };
  axis.majorTicks.generation = { mode: 'endpoints' };
  expect(validateFixedAxisTicks(template)).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/次刻度.*浮点精度/),
    }),
  );
});

it('keeps legacy automatic tick precision and ignores hidden axes and unknown automatic domains', () => {
  const template = emptyFixedTemplate();
  const [x, y] = template.panels[0]!.axes;
  x!.range = { mode: 'fixed', min: 1, max: 1 + Number.EPSILON };
  x!.minorTicks = { ...x!.minorTicks, visible: true, count: 1 };
  y!.minorTicks = { ...y!.minorTicks, visible: true, count: 1e12 };
  y!.visible = false;
  expect(validateFixedAxisTicks(template)).toEqual([]);
  y!.visible = true;
  y!.range = { mode: 'auto' };
  expect(validateFixedAxisTicks(template)).toEqual([]);
});
