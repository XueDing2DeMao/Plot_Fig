import { expect, it } from 'vitest';
import { chartTemplate, chartData } from './helpers/chart-fixtures.js';
import { renderFigureSvg, figureCoordinates } from '@plot-fig/svg-renderer';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { createScale } from '../packages/svg-renderer/src/scales.js';
import { planAxisTicks } from '../packages/svg-renderer/src/tick-plan.js';
it.each(['xy', 'bar', 'histogram', 'box', 'area', 'heatmap', 'contour'])(
  '%s 断后对数区段裁剪零基线、曲线和网格，且剪裁引用唯一',
  (kind) => {
    const t = chartTemplate(kind),
      p = t.panels[0]!,
      a = p.axes[kind === 'bar' || kind === 'box' || kind === 'area' ? 1 : 0]!;
    a.range = { mode: 'fixed', min: 0, max: 100 };
    a.advanced = {
      breaks: {
        intervals: [{ from: 20, to: 80, after: { scale: 'log10' } }],
        weights: [1, 10],
      },
    };
    const d =
      kind === 'bar'
        ? chartData({ category: ['a', 'b', 'c'], value: [10, 50, 90] })
        : kind === 'box' || kind === 'histogram'
          ? chartData({ values: [0, 10, 20, 50, 90, 100] })
          : ['heatmap', 'contour'].includes(kind)
            ? chartData({
                x: [0, 50, 100, 0, 50, 100, 0, 50, 100],
                y: [0, 0, 0, 50, 50, 50, 100, 100, 100],
                z: [1, 2, 3, 4, 5, 6, 7, 8, 9],
              })
            : chartData({ x: [0, 10, 50, 90, 100], y: [0, 10, 50, 90, 100] });
    expect(validateFigureTemplate(t).ok).toBe(true);
    const r = renderFigureSvg(t, d);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (r.ok) {
      expect(r.svg).not.toMatch(/NaN|Infinity/);
      const ids = [...r.svg.matchAll(/<clipPath id="([^"]+)"/g)].map(
        (m) => m[1],
      );
      expect(new Set(ids).size).toBe(ids.length);
      expect(r.svg).toContain('plot-segment');
    }
  },
);
it('断轴合并后才应用序号、全轴端点和标签，断区样本不会被避让移回', () => {
  const t = chartTemplate('xy'),
    p = t.panels[0]!,
    x = p.axes[0]!,
    plot = p.plotSlots[0]!;
  x.range = { mode: 'fixed', min: 0, max: 100 };
  x.advanced = {
    breaks: { intervals: [{ from: 20, to: 80 }] },
    ticks: { major: { mode: 'values', values: [0, 10, 20, 80, 90, 100] } },
    labels: { source: 'index' },
    specialTicks: [
      { at: 'min', label: 'minimum' },
      { at: 'max', label: 'maximum' },
    ],
  };
  const ticks = planAxisTicks(x, createScale(x, 0, 100)!);
  expect(ticks.major.map((t) => t.label)).toEqual([
    'minimum',
    '2',
    '3',
    '4',
    '5',
    'maximum',
  ]);
  if (plot.kind !== 'xy') throw Error();
  plot.dataLabels = { visible: true, source: 'x', collision: 'move' };
  const r = renderFigureSvg(t, chartData({ x: [10, 50, 90], y: [10, 50, 90] }));
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.svg.match(/data-role="data-label"/g)).toHaveLength(2);
    expect(r.svg).not.toMatch(/data-role="data-label"[^>]*>50</);
  }
});
it('Probit 格式不会因新增箭头而消失', () => {
  const t = chartTemplate('xy'),
    y = t.panels[0]!.axes[1]!;
  y.scale = 'probit';
  y.range = { mode: 'fixed', min: 10, max: 90 };
  Object.assign(y.tickLabels, {
    notation: 'fixed',
    precision: 2,
    prefix: 'P=',
  });
  y.advanced = { arrow: 'end' };
  const r = renderFigureSvg(t, chartData({ x: [0, 1, 2], y: [10, 50, 90] }));
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.svg).toContain('P=5.00');
});
