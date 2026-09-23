import { describe, expect, it } from 'vitest';
import {
  densityCurve,
  histogram,
  boxSummary,
  quantile,
  normalQuantile,
} from './statistics.js';
import { arrangeBands, preparePlot } from './prepare.js';
import { renderBoxes } from './svg-marks.js';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';

describe('F6 chart statistics', () => {
  it('supports explicit bin width and log-scaled bins', () => {
    expect(
      histogram([1, 2, 4, 8], {
        bins: { mode: 'width', width: 2, start: 0 },
        normalization: 'count',
      }).bins.map((b) => b.count),
    ).toEqual([1, 1, 1, 1]);
    expect(
      histogram([1, 10, 100], {
        bins: { mode: 'count', count: 2, scale: 'log10' },
        normalization: 'count',
      }).bins.map((b) => b.count),
    ).toEqual([1, 2]);
    expect(
      histogram([0, 1, 2], {
        bins: { mode: 'edges', edges: [0, 1, 2] },
        normalization: 'count',
        boundary: 'left',
      }).bins.map((b) => b.count),
    ).toEqual([1, 2]);
    expect(
      histogram([0, 1, 2], {
        bins: { mode: 'edges', edges: [0, 1, 2] },
        normalization: 'count',
        boundary: 'right',
      }).bins.map((b) => b.count),
    ).toEqual([2, 1]);
  });
  it('supports percentile and configurable whiskers', () => {
    const summary = boxSummary([1, 2, 3, 4, 20], {
      whisker: 'percentile',
      low: 10,
      high: 90,
    });
    expect(summary.q1).toBe(2);
    expect(summary.q3).toBe(4);
    expect(summary.low).toBeCloseTo(1.4);
    expect(summary.high).toBeCloseTo(13.6);
    expect(summary.extremes).toEqual([20]);
    expect(quantile([1, 2, 3, 4], 0.25, 'linear')).toBe(1.75);
  });
  it('calculates arbitrary normal confidence quantiles', () => {
    expect(normalQuantile(0.9)).toBeCloseTo(1.2815516, 6);
    expect(normalQuantile(0.97)).toBeCloseTo(1.8807936, 6);
    expect(normalQuantile(0.99)).toBeCloseTo(2.3263479, 6);
  });
  it('uses the selected quantile method for percentile marks and connections', () => {
    const template: any = chartTemplate('box'),
      plot = template.panels[0].plotSlots[0];
    plot.bindings.group = 'slot-group';
    plot.quantileMethod = 'type7';
    plot.percentile = [25];
    plot.connections = { mean: false, median: false, percentiles: true };
    template.dataSlots.push({
      dataSlotId: 'slot-group',
      name: 'group',
      role: 'group',
      valueType: 'category',
      required: false,
    });
    const prepared = preparePlot(
      plot,
      chartData({
        values: [0, 10, 20, 30, 0, 20, 40, 60],
        group: ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'],
      }),
      template.panels[0].axes,
    );
    const output = renderBoxes(prepared, {
      rect: { x: 0, y: 0, width: 100, height: 100 },
      xScale: {
        min: 0,
        max: 1,
        scale: 'linear',
        categories: prepared.categories,
        map: (value) => (value + 0.5) / 2,
      },
      yScale: {
        min: 0,
        max: 60,
        scale: 'linear',
        map: (value) => value / 60,
      },
    });
    expect(output).toContain('data-percentile="25"');
    expect(output).toContain('cy="87.5"');
    expect(output).toContain('cy="75"');
    expect(output).toContain('data-role="box-percentile-connection"');
    expect(output).toContain('87.5 L');
    expect(output).toContain(' 75"');
  });
  it('calculates normal and KDE density curves', () => {
    const normal = densityCurve([0, 1, 2], {
      kind: 'normal',
      parameters: { mu: 0, sigma: 1 },
      samples: 9,
    });
    const kde = densityCurve([0, 1, 2], {
      kind: 'kde',
      bandwidth: { method: 'silverman' },
      samples: 9,
    });
    expect(normal).toHaveLength(9);
    expect(kde).toHaveLength(9);
    expect(normal.every((p) => Number.isFinite(p.x) && p.y >= 0)).toBe(true);
  });
  it('rejects missing parameters instead of fitting a parametric distribution', () => {
    expect(() =>
      densityCurve([0, 1, 2], { kind: 'normal', parameters: {}, samples: 9 }),
    ).toThrow(/位置 μ/);
  });
  it('derives parametric support from explicit parameters instead of sample estimates', () => {
    const normal = densityCurve([100, 101], {
        kind: 'normal',
        parameters: { mu: 0, sigma: 2 },
        samples: 9,
        extendPercent: 100,
      }),
      exponential = densityCurve([100, 101], {
        kind: 'exponential',
        parameters: { scale: 2 },
        samples: 9,
        extendPercent: 100,
      });
    expect(normal[0]!.x).toBe(-2);
    expect(normal.at(-1)!.x).toBe(103);
    expect(exponential[0]!.x).toBe(0);
  });
  it('keeps continuous density and discrete probability mass normalized', () => {
    const kde = densityCurve([-2, -1, 0, 1, 2], {
      kind: 'kde',
      bandwidth: { method: 'custom', value: 0.4 },
      samples: 1000,
      extendPercent: 800,
    });
    const area = kde.slice(1).reduce((sum, point, index) => {
      const previous = kde[index]!;
      return sum + ((point.y + previous.y) / 2) * (point.x - previous.x);
    }, 0);
    expect(area).toBeCloseTo(1, 2);
    const poisson = densityCurve([0, 1, 2, 3], {
      kind: 'poisson',
      parameters: { lambda: 2 },
      extendPercent: 1000,
    });
    expect(poisson.reduce((sum, point) => sum + point.y, 0)).toBeCloseTo(1, 2);
    const binomial = densityCurve([0, 1, 2], {
      kind: 'binomial',
      parameters: { trials: 5, p: 0.4 },
    });
    expect(binomial.reduce((sum, point) => sum + point.y, 0)).toBeCloseTo(
      1,
      10,
    );
  });
  it('scales a histogram overlay with each explicit bin width', () => {
    const template: any = chartTemplate('histogram'),
      plot = template.panels[0].plotSlots[0];
    plot.bins = { mode: 'edges', edges: [0, 1, 3] };
    plot.normalization = 'probability';
    plot.distribution = {
      visible: true,
      kind: 'normal',
      parameters: { mu: 1.5, sigma: 1 },
      samples: 33,
      extendPercent: 100,
      normalize: 'probability',
      symmetric: false,
    };
    const values = [0.2, 0.8, 1.2, 2.8],
      prepared = preparePlot(
        plot,
        chartData({ values }),
        template.panels[0].axes,
      ),
      density = densityCurve(values, plot.distribution, [0, 3]),
      overlay = prepared.distributions![0]!.points;
    expect(overlay[0]!.y).toBeCloseTo(density[0]!.y * 1, 12);
    expect(overlay.at(-1)!.y).toBeCloseTo(density.at(-1)!.y * 2, 12);
  });
  it('normalizes box distributions and includes their extended support in the range', () => {
    const template: any = chartTemplate('box'),
      plot = template.panels[0].plotSlots[0];
    plot.bindings.group = 'slot-group';
    template.dataSlots.push({
      dataSlotId: 'slot-group',
      name: 'group',
      role: 'group',
      valueType: 'category',
      required: false,
    });
    plot.distribution = {
      visible: true,
      kind: 'normal',
      parameters: { mu: 2.5, sigma: 1 },
      samples: 33,
      extendPercent: 100,
      normalize: 'count',
      symmetric: false,
    };
    const prepared = preparePlot(
        plot,
        chartData({
          values: [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
          group: ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
        }),
        template.panels[0].axes,
      ),
      peaks = prepared.distributions!.map((entry) =>
        Math.max(...entry.points.map((point) => point.y)),
      );
    expect(peaks[1]! / peaks[0]!).toBeCloseTo(2, 12);
    expect(Math.min(...prepared.yValues)).toBeLessThan(1);
    expect(Math.max(...prepared.yValues)).toBeGreaterThan(4);
  });
  it('renders a two-level split distribution on opposite sides of one box', () => {
    const template: any = chartTemplate('box'),
      plot = template.panels[0].plotSlots[0];
    plot.bindings.group = 'slot-group';
    plot.bindings.split = 'slot-split';
    plot.distribution = {
      visible: true,
      kind: 'normal',
      parameters: { mu: 2.5, sigma: 1 },
      samples: 33,
      extendPercent: 100,
      normalize: 'density',
      symmetric: false,
      side: 'split',
    };
    template.dataSlots.push({
      dataSlotId: 'slot-group',
      name: 'group',
      role: 'group',
      valueType: 'category',
      required: false,
    });
    template.dataSlots.push({
      dataSlotId: 'slot-split',
      name: 'split',
      role: 'split',
      valueType: 'category',
      required: false,
    });
    const prepared = preparePlot(
      plot,
      chartData({
        values: [1, 2, 3, 4, 1, 2, 3, 4],
        group: ['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'],
        split: ['L', 'L', 'R', 'R', 'R', 'R', 'L', 'L'],
      }),
      template.panels[0].axes,
    );
    expect(prepared.boxes).toHaveLength(2);
    expect(
      prepared.distributions?.map(
        (entry) => `${entry.category}:${entry.split}:${entry.side}`,
      ),
    ).toEqual([
      's:A:L:negative',
      's:A:R:positive',
      's:B:L:negative',
      's:B:R:positive',
    ]);
    const output = renderBoxes(prepared, {
      rect: { x: 0, y: 0, width: 100, height: 100 },
      xScale: {
        min: 0,
        max: 1,
        scale: 'linear',
        categories: prepared.categories,
        map: () => 0.5,
      },
      yScale: { min: 0, max: 5, scale: 'linear', map: (value) => value / 5 },
    });
    expect(output.match(/data-role="box-distribution"/g)).toHaveLength(4);
    expect(output).toContain('data-side="negative"');
    expect(output).toContain('data-side="positive"');
  });
  it('rejects split distributions with more than two global levels', () => {
    const template: any = chartTemplate('box'),
      plot = template.panels[0].plotSlots[0];
    Object.assign(plot.bindings, {
      group: 'slot-group',
      split: 'slot-split',
    });
    plot.distribution = {
      visible: true,
      kind: 'normal',
      parameters: { mu: 0, sigma: 1 },
      samples: 33,
      extendPercent: 100,
      normalize: 'density',
      symmetric: false,
      side: 'split',
    };
    template.dataSlots.push(
      {
        dataSlotId: 'slot-group',
        name: 'group',
        role: 'group',
        valueType: 'category',
        required: false,
      },
      {
        dataSlotId: 'slot-split',
        name: 'split',
        role: 'split',
        valueType: 'category',
        required: false,
      },
    );
    expect(() =>
      preparePlot(
        plot,
        chartData({
          values: [1, 2, 3, 4],
          group: ['A', 'A', 'B', 'B'],
          split: ['L', 'R', 'R', 'S'],
        }),
        template.panels[0].axes,
      ),
    ).toThrow(/全局恰含两个层级/);
  });
  it('moves bar errors with baselines and percentage stacks', () => {
    const template: any = chartTemplate('bar'),
      plot = template.panels[0].plotSlots[0];
    Object.assign(plot, {
      layout: 'stacked',
      stackGroup: 's',
      options: { baseline: 10, percentage: true, missing: 'gap' },
      errorBarStyle: {
        visible: true,
        color: '#000000',
        widthPt: 1,
        capWidthPt: 3,
      },
    });
    plot.bindings.valueError = 'slot-error';
    const data = chartData({ category: ['A'], value: [2], error: [0.5] }),
      first = preparePlot(plot, data, template.panels[0].axes),
      second = preparePlot(
        { ...plot, plotSlotId: 'series-2' },
        data,
        template.panels[0].axes,
      );
    expect(first.bars[0]).toMatchObject({
      start: 10,
      end: 12,
      error: [11.5, 12.5],
    });
    expect(arrangeBands([first, second])).toEqual([]);
    expect(first.bars[0]).toMatchObject({
      start: 10,
      end: 60,
      error: [47.5, 72.5],
    });
    expect(second.bars[0]).toMatchObject({
      start: 60,
      end: 110,
      error: [97.5, 122.5],
    });
  });
});
