import { expect, it } from 'vitest';
import { chartTemplate } from './helpers/chart-fixtures.js';
import {
  validateFigureTemplate,
  CURRENT_SCHEMA_VERSION,
} from '@plot-fig/figure-schema';
it('正式1.18接受Log2和跨零SymLog并验证不兼容参数', () => {
  expect(CURRENT_SCHEMA_VERSION).toBe('1.22.0');
  const t = chartTemplate('xy'),
    axis = t.panels[0]!.axes[1]!;
  Object.assign(axis, {
    scale: 'log2',
    range: { mode: 'fixed', min: 1, max: 16 },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
  Object.assign(axis, {
    symLog: { threshold: 1, linearLength: 1 },
    range: { mode: 'fixed', min: -10, max: 10 },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
  axis.majorTicks.generation = { mode: 'increment', step: 1, anchor: 0 };
  expect(validateFigureTemplate(t).ok).toBe(true);
  Object.assign(axis, { logTicks: { mode: 'logarithmic' } });
  expect(validateFigureTemplate(t).ok).toBe(false);
});
it('正式尺度支持范围、共享参数及图型限制校验', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    y = p.axes[1]!;
  Object.assign(y, {
    scale: 'log10',
    symLog: { threshold: 1, linearLength: 1 },
  });
  const right = {
    ...structuredClone(y),
    axisId: 'axis-right',
    position: 'right' as const,
  };
  p.axes.push(right);
  t.sharedAxisGroups = [
    {
      groupId: 'shared-y',
      members: [
        { panelId: p.panelId, axisId: y.axisId },
        { panelId: p.panelId, axisId: right.axisId },
      ],
    },
  ];
  expect(validateFigureTemplate(t).ok).toBe(true);
  Object.assign(right, { symLog: { threshold: 2, linearLength: 1 } });
  expect(validateFigureTemplate(t).ok).toBe(false);
  delete t.sharedAxisGroups;
  const plot = p.plotSlots[0]!;
  if (plot.kind === 'xy') plot.lineConnection = 'spline';
  expect(validateFigureTemplate(t).ok).toBe(false);
});
