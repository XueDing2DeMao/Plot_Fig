import { expect, it } from 'vitest';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { validateFixedAxisTicks } from './index.js';
const grid = {
  visible: true,
  color: '#cccccc',
  widthPt: 0.5,
  dash: 'solid' as const,
};
function fixture() {
  const template = chartTemplate('xy');
  template.panels[0]!.plotSlots = [];
  template.dataSlots = [];
  for (const axis of template.panels[0]!.axes) {
    axis.range = { mode: 'fixed', min: 0, max: 1 };
    axis.majorTicks.generation = { mode: 'endpoints' };
  }
  return template;
}
it('rejects excessive hidden minor ticks when their grid is visible without requiring data', () => {
  const template = fixture(),
    axis = template.panels[0]!.axes[0]!;
  axis.minorTicks = { ...axis.minorTicks, visible: false, count: 10000 };
  axis.grid = { minor: grid };
  const before = structuredClone(template),
    errors = validateFixedAxisTicks(template);
  expect(errors).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/10000/),
    }),
  );
  expect(template).toEqual(before);
  axis.visible = false;
  expect(validateFixedAxisTicks(template)).toEqual([]);
});
it('rejects label divisor overflow and underflow on an empty fixed graph', () => {
  const template = fixture(),
    axis = template.panels[0]!.axes[0]!;
  axis.tickLabels.divisor = Number.MIN_VALUE;
  expect(validateFixedAxisTicks(template)).toContainEqual(
    expect.objectContaining({ message: expect.stringMatching(/显示值.*浮点/) }),
  );
  axis.range = {
    mode: 'fixed',
    min: Number.MIN_VALUE,
    max: Number.MIN_VALUE * 2,
  };
  axis.tickLabels.divisor = 1e308;
  expect(validateFixedAxisTicks(template)).toContainEqual(
    expect.objectContaining({ message: expect.stringMatching(/显示值.*浮点/) }),
  );
});
it('checks fixed opposite range crossings before data exists', () => {
  const template = fixture(),
    [x, y] = template.panels[0]!.axes;
  x!.placement = { mode: 'cross', axisId: y!.axisId, value: 2 };
  expect(validateFixedAxisTicks(template)).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/交叉.*范围/),
    }),
  );
  x!.placement.value = 0.5;
  expect(validateFixedAxisTicks(template)).toEqual([]);
});
it('defers an unknown automatic crossing range while still validating source labels and grids', () => {
  const template = fixture(),
    [x, y] = template.panels[0]!.axes;
  y!.range = { mode: 'auto' };
  x!.placement = { mode: 'cross', axisId: y!.axisId, value: 2 };
  expect(validateFixedAxisTicks(template)).toEqual([]);
  x!.tickLabels.divisor = Number.MIN_VALUE;
  expect(validateFixedAxisTicks(template)).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/显示值.*浮点/),
    }),
  );
  delete x!.tickLabels.divisor;
  x!.minorTicks.count = 10000;
  x!.grid = { minor: grid };
  expect(validateFixedAxisTicks(template)).toContainEqual(
    expect.objectContaining({ message: expect.stringMatching(/10000/) }),
  );
});
