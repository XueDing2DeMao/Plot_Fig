import { expect, it } from 'vitest';
import { validateFigureTemplate, type XyPlot, type BarPlot } from '@plot-fig/figure-schema';
import { chartTemplate, chartData } from '../../../tests/helpers/chart-fixtures.js';
import { preparePlot } from './charts/prepare.js';
import { errorRange } from './error-values.js';
import { renderBarError } from './charts/bar-errors.js';
import { createScale } from './scales.js';

it('正式范围入口按高级端点与单方向扩展，不扩大隐藏侧', () => {
  const t = chartTemplate('xy'), p = t.panels[0]!.plotSlots[0]! as XyPlot;
  p.bindings.yErrorUpper = 'slot-yErrorUpper';
  p.errorBarStyle = { visible: true, color: '#111111', widthPt: 1, capWidthPt: 4 };
  p.errorDetails = { y: { source: 'endpoints', direction: 'positive' } };
  const d = chartData({ x: [0, 1], y: [-4, -3], yErrorUpper: [-1, -2] });
  expect(errorRange(p, d, { prefix: 'y', index: 0, base: -4 })).toEqual([-4, -1]);
  const prepared = preparePlot(p, d);
  expect(prepared.yValues).toContain(-1);
  expect(Math.min(...prepared.yValues)).toBe(-4);
});
it('结构与语义允许正向仅上端点槽，旧非对称及不兼容的对称端点继续拒绝', () => {
  const t = chartTemplate('xy'), p = t.panels[0]!.plotSlots[0]! as XyPlot;
  t.dataSlots.push({ dataSlotId: 'slot-yErrorUpper', name: 'Upper', role: 'yErrorUpper', valueType: 'number', required: false });
  p.bindings.yErrorUpper = 'slot-yErrorUpper';
  p.errorBarStyle = { visible: true, color: '#111111', widthPt: 1, capWidthPt: 4 };
  p.errorDetails = { y: { source: 'endpoints', direction: 'positive' } };
  expect(validateFigureTemplate(t).ok).toBe(true);
  delete p.errorDetails;
  expect(validateFigureTemplate(t).ok).toBe(false);
  p.errorDetails = { y: { source: 'endpoints', direction: 'negative' } };
  expect(validateFigureTemplate(t).ok).toBe(false);
  delete p.bindings.yErrorUpper;
  p.bindings.yError = 'slot-yError';
  t.dataSlots.push({ dataSlotId: 'slot-yError', name: 'error', role: 'yError', valueType: 'number', required: false });
  expect(validateFigureTemplate(t).ok).toBe(false);
});
it('柱图保存高级端点且范围计算允许负绝对端点', () => {
  const t = chartTemplate('bar'), p = t.panels[0]!.plotSlots[0]! as BarPlot;
  p.errorDetails = { value: { source: 'endpoints', direction: 'negative', dash: 'dot', opacity: 0.5 } };
  p.bindings.valueErrorLower = 'slot-valueErrorLower';
  t.dataSlots.push({ dataSlotId: 'slot-valueErrorLower', name: 'Lower', role: 'valueErrorLower', valueType: 'number', required: false });
  p.errorBarStyle = { visible: true, color: '#111111', widthPt: 1, capWidthPt: 4 };
  expect(validateFigureTemplate(t).ok).toBe(true);
  const prepared = preparePlot(p, chartData({ category: ['A'], value: [-3], valueErrorLower: [-5] }));
  expect(prepared.bars[0]!.error).toEqual([-5, -3]);
});
it('柱图单方向端帽、跟随填充颜色及描边透明线型接通，默认输出不附加属性', () => {
  const context = { rect: { x: 0, y: 0, width: 100, height: 100 }, xScale: createScale({ scale: 'linear' }, 0, 10)!, yScale: createScale({ scale: 'linear' }, 0, 10)! };
  const options = { center: 5, bounds: [3, 5] as [number, number], horizontal: false }, style = { visible: true, color: '#111111', widthPt: 1, capWidthPt: 4 };
  const legacy = renderBarError(context, options, style);
  expect(legacy.match(/data-role="error-cap"/g)).toHaveLength(2);
  expect(legacy).not.toContain('stroke-opacity');
  const result = renderBarError(context, options, style, { base: 3, details: { direction: 'positive', dash: 'dot', opacity: 0.5, followColor: true }, followColor: '#ff0000' });
  expect(result.match(/data-role="error-cap"/g)).toHaveLength(1);
  expect(result).toContain('stroke="#ff0000"');
  expect(result).toContain('stroke-opacity="0.5"');
  expect(result).toContain('stroke-dasharray="1 3"');
});
