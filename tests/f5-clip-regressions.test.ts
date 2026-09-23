import { expect, it } from 'vitest';
import { chartTemplate, chartData } from './helpers/chart-fixtures.js';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { renderPlot } from '../packages/svg-renderer/src/plot.js';
import { createScale } from '../packages/svg-renderer/src/scales.js';
it('断轴保持阶梯线原始水平段与垂直段', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    plot = p.plotSlots[0]!;
  if (plot.kind !== 'xy') throw Error();
  plot.lineConnection = 'step-h';
  const svg = renderPlot(plot, chartData({ x: [0, 100], y: [0, 100] }), {
    rect: { x: 0, y: 0, width: 100, height: 100 },
    xScale: createScale(p.axes[0]!, 80, 100)!,
    yScale: createScale(p.axes[1]!, 0, 100)!,
    dataClip: { xMin: 80, xMax: 100, yMin: 0, yMax: 100 },
  })!.svg;
  expect(svg).toContain('M-400 100 H100 V0');
});
it('Y 断轴保留首类别完整半带宽度，箱线中位数在断区时隐藏', () => {
  const t = chartTemplate('bar'),
    d = chartData({ category: ['a', 'b'], value: [10, 90] });
  const before = renderFigureSvg(t, d);
  if (!before.ok) throw Error();
  const width = before.svg.match(/data-role="bar"[^>]*\swidth="([^"]+)"/)![1];
  t.panels[0]!.axes[1]!.range = { mode: 'fixed', min: 0, max: 100 };
  t.panels[0]!.axes[1]!.advanced = {
    breaks: { intervals: [{ from: 20, to: 80 }] },
  };
  const after = renderFigureSvg(t, d);
  expect(after.ok).toBe(true);
  if (after.ok)
    expect(after.svg.match(/data-role="bar"[^>]*\swidth="([^"]+)"/)![1]).toBe(
      width,
    );
  const b = chartTemplate('box');
  Object.assign(b.panels[0]!.axes[1]!, {
    range: { mode: 'fixed', min: 0, max: 100 },
    advanced: { breaks: { intervals: [{ from: 20, to: 80 }] } },
  });
  const box = renderFigureSvg(b, chartData({ values: [10, 40, 50, 60, 90] }));
  expect(box.ok).toBe(true);
  if (box.ok) expect(box.svg).not.toContain('box-median');
});
it('断区中的误差中心仍保留跨区线段，默认箭头不在断点产生箭头', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    plot = p.plotSlots[0]!;
  if (plot.kind !== 'xy') throw Error();
  p.axes[0]!.range = { mode: 'fixed', min: 0, max: 100 };
  Object.assign(p.axes[1]!, {
    range: { mode: 'fixed', min: 0, max: 100 },
    advanced: { breaks: { intervals: [{ from: 20, to: 80 }] } },
  });
  t.dataSlots.push({
    dataSlotId: 'slot-yError',
    name: 'error',
    role: 'yError',
    valueType: 'number',
    required: true,
  });
  plot.bindings.yError = 'slot-yError';
  plot.errorBarStyle = {
    visible: true,
    color: '#111111',
    widthPt: 1,
    capWidthPt: 4,
  };
  t.annotations = [
    {
      annotationId: 'arrow',
      kind: 'arrow',
      coordinateSpace: 'data',
      panelId: p.panelId,
      xAxisId: plot.xAxisId,
      yAxisId: plot.yAxisId,
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
    },
  ];
  const result = renderFigureSvg(
    t,
    chartData({ x: [50], y: [50], yError: [40] }),
  );
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.svg.match(/data-role="error-bar"/g)).toHaveLength(2);
    const heads = [
      ...result.svg.matchAll(/data-role="arrow-head" points="([^"]+)"/g),
    ];
    expect(heads).toHaveLength(2);
    expect(heads[0]![1]).not.toBe(heads[1]![1]);
  } // 原端点可存在于各组 DOM，实际只在所属 cell 可见。
});
