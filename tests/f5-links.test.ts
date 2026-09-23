import { expect, it } from 'vitest';
import { chartTemplate } from './helpers/chart-fixtures.js';
import { figureCoordinates } from '@plot-fig/svg-renderer';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../packages/web-editor/src/state/default-template.js';
it('图层公式链接随源轴范围改变，正逆映射保持对应', () => {
  const t = chartTemplate('xy'),
    source = t.panels[0]!,
    target = structuredClone(source);
  target.panelId = 'child';
  for (const a of target.axes) a.axisId = 'child-' + a.axisId;
  for (const p of target.plotSlots) {
    p.plotSlotId = 'child-' + p.plotSlotId;
    p.xAxisId = 'child-' + p.xAxisId;
    p.yAxisId = 'child-' + p.yAxisId;
  }
  t.panels.push(target);
  source.axes[0]!.range = { mode: 'fixed', min: 0, max: 100 };
  Object.assign(target.axes[0]!, {
    advanced: {
      link: {
        panelId: source.panelId,
        axisId: source.axes[0]!.axisId,
        formula: {
          forward: 'x+273.14',
          inverse: 'x-273.14',
          min: -1000,
          max: 1000,
        },
      },
    },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
  const read = () =>
    figureCoordinates(t)
      .panels.get(target.panelId)!
      .scales.get(target.axes[0]!.axisId)!;
  const s = read();
  expect(s.min).toBeCloseTo(273.14, 10);
  expect(s.max).toBeCloseTo(373.14, 10);
  expect(s.map(293.14)).toBeCloseTo(0.2, 10);
  expect(s.numeric!.invert(0.2)).toBeCloseTo(293.14, 10);
  source.axes[0]!.range = { mode: 'fixed', min: 0, max: 200 };
  expect(read().max).toBeCloseTo(473.14, 10);
  source.axes[0]!.advanced = {
    link: {
      panelId: target.panelId,
      axisId: target.axes[0]!.axisId,
      formula: { forward: 'x', inverse: 'x', min: -1000, max: 1000 },
    },
  };
  expect(validateFigureTemplate(t).ok).toBe(false);
});

it('同层上下轴和左右轴分别按正逆公式共享物理位置', () => {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  const bottom = panel.axes.find((axis) => axis.position === 'bottom')!;
  const top = panel.axes.find((axis) => axis.position === 'top')!;
  const left = panel.axes.find((axis) => axis.position === 'left')!;
  const right = panel.axes.find((axis) => axis.position === 'right')!;
  bottom.range = { mode: 'fixed', min: 0, max: 10 };
  left.range = { mode: 'fixed', min: -10, max: 10 };
  top.advanced = {
    link: {
      panelId: panel.panelId,
      axisId: bottom.axisId,
      formula: { forward: '2*x', inverse: 'x/2', min: 0, max: 10 },
    },
  };
  right.advanced = {
    link: {
      panelId: panel.panelId,
      axisId: left.axisId,
      formula: { forward: 'x/2', inverse: '2*x', min: -10, max: 10 },
    },
  };

  expect(validateFigureTemplate(template).ok).toBe(true);
  const scales = figureCoordinates(template).panels.get(panel.panelId)!.scales;
  const topScale = scales.get(top.axisId)!;
  const rightScale = scales.get(right.axisId)!;
  expect([topScale.min, topScale.max]).toEqual([0, 20]);
  expect(topScale.map(10)).toBeCloseTo(0.5, 10);
  expect(topScale.numeric!.invert(0.5)).toBeCloseTo(10, 10);
  expect([rightScale.min, rightScale.max]).toEqual([-5, 5]);
  expect(rightScale.map(0)).toBeCloseTo(0.5, 10);
  expect(rightScale.numeric!.invert(0.5)).toBeCloseTo(0, 10);
});

it('对侧轴只保存正向公式时自动反解并共享物理位置', () => {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  const bottom = panel.axes.find((axis) => axis.position === 'bottom')!;
  const top = panel.axes.find((axis) => axis.position === 'top')!;
  bottom.range = { mode: 'fixed', min: 0, max: 100 };
  top.advanced = {
    link: {
      panelId: panel.panelId,
      axisId: bottom.axisId,
      formula: { forward: 'x*9/5+32', inverse: 'auto', min: 0, max: 100 },
    },
  };

  expect(validateFigureTemplate(template).ok).toBe(true);
  const scale = figureCoordinates(template)
    .panels.get(panel.panelId)!
    .scales.get(top.axisId)!;
  expect([scale.min, scale.max]).toEqual([32, 212]);
  expect(scale.map(122)).toBeCloseTo(0.5, 10);
  expect(scale.numeric!.invert(0.5)).toBeCloseTo(122, 10);
});
