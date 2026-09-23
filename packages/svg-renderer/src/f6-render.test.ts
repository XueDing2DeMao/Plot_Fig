import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from './render.js';

function svg(
  kind: Parameters<typeof chartTemplate>[0],
  columns: Record<string, any[]>,
  patch: (plot: any, template: any) => void,
) {
  const template: any = chartTemplate(kind);
  patch(template.panels[0].plotSlots[0], template);
  const result = renderTemplateSvg(template, chartData(columns));
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error('render failed');
  return result.svg;
}

it('renders bar baseline and sign-specific styles', () => {
  const output = svg(
    'bar',
    { category: ['A', 'B'], value: [2, -1] },
    (plot) => {
      plot.options = {
        baseline: 1,
        percentage: false,
        missing: 'gap',
        positive: {
          color: '#00aa00',
          opacity: 1,
          borderColor: '#006600',
          borderWidthPt: 1,
        },
        negative: {
          color: '#aa0000',
          opacity: 1,
          borderColor: '#660000',
          borderWidthPt: 1,
        },
      };
    },
  );
  expect(output).toContain('fill="#00aa00"');
  expect(output).toContain('fill="#aa0000"');
});

it('fills missing stacked categories with zero before percentage stacking', () => {
  const template: any = chartTemplate('bar'),
    first = template.panels[0].plotSlots[0];
  Object.assign(first, {
    layout: 'stacked',
    stackGroup: 'stack-1',
    options: { baseline: 0, percentage: true, missing: 'zero' },
  });
  const second = structuredClone(first);
  second.plotSlotId = 'series-2';
  second.legendEntry.text = 'Series 2';
  second.bindings = { category: 'slot-category2', value: 'slot-value2' };
  template.panels[0].plotSlots.push(second);
  template.dataSlots.push(
    {
      dataSlotId: 'slot-category2',
      name: 'category2',
      role: 'category',
      valueType: 'category',
      required: true,
    },
    {
      dataSlotId: 'slot-value2',
      name: 'value2',
      role: 'value',
      valueType: 'number',
      required: true,
    },
  );
  const result = renderTemplateSvg(
    template,
    chartData({
      category: ['A', 'B'],
      value: [2, 3],
      category2: ['B', 'C'],
      value2: [1, 4],
    }),
  );
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error('render failed');
  expect(result.svg.match(/data-role="bar"/g)).toHaveLength(6);
});

it('renders histogram distribution and box-specific parts', () => {
  const histogram = svg('histogram', { values: [0, 1, 2, 3] }, (plot) => {
    plot.gap = 0.15;
    plot.showStatistics = true;
    plot.distribution = {
      visible: true,
      kind: 'normal',
      samples: 64,
      parameters: { mu: 0, sigma: 1 },
      extendPercent: 100,
      normalize: 'count',
      symmetric: false,
    };
  });
  expect(histogram).toContain('data-role="distribution-curve"');
  expect(histogram).toContain('data-role="histogram-statistics"');
  const box = svg(
    'box',
    {
      values: [1, 2, 3, 4, 20, 2, 3, 4, 5, 6],
      group: ['A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B'],
    },
    (plot, template) => {
      plot.bindings.group = 'slot-group';
      template.dataSlots.push({
        dataSlotId: 'slot-group',
        name: 'group',
        role: 'group',
        valueType: 'category',
        required: false,
      });
      Object.assign(plot, {
        showMean: true,
        showNotch: true,
        showExtremes: true,
        rawPoints: 'jitter',
        percentile: [10, 90],
        showMedian: true,
        distribution: {
          visible: true,
          kind: 'normal',
          samples: 64,
          parameters: { mu: 3, sigma: 1 },
          extendPercent: 100,
          normalize: 'density',
          symmetric: true,
        },
        connections: { mean: true, median: true, percentiles: true },
        confidence: {
          visible: true,
          target: 'mean',
          method: 'normal',
          level: 0.95,
        },
      });
    },
  );
  expect(box).toContain('data-role="box-mean"');
  expect(box).toContain('data-role="box-notch"');
  expect(box).toContain('data-role="box-raw-point"');
  expect(box).toContain('data-role="box-extreme"');
  expect(box).toContain('data-role="box-distribution"');
  expect(box).toContain('data-role="box-mean-connection"');
  expect(box).toContain('data-role="box-confidence"');
});

it('renders irregular XYZ triangles, contour segments, labels and current colorbar settings', () => {
  const columns = { x: [0, 2, 0, 1.2], y: [0, 0, 1, 1.4], z: [1, 2, 3, 4] };
  const heatmap = svg('heatmap', columns, (plot) => {
    plot.heatmap = {
      missingColor: '#eeeeee',
      labels: true,
      interpolation: 'nearest',
      dataRegion: 'xyz',
    };
    Object.assign(plot.colorScale, {
      transform: 'linear',
      interpolation: 'discrete',
    });
    Object.assign(plot.colorScale.colorbar, {
      orientation: 'horizontal',
      side: 'bottom',
      length: 0.7,
      widthPt: 12,
      majorTicks: 4,
      minorTicks: 1,
      notation: 'fixed',
      precision: 1,
      endpoints: 'triangles',
      mode: 'independent',
      range: { min: 0, max: 5 },
    });
  });
  expect(heatmap).toContain('data-role="heatmap-triangle"');
  expect(heatmap).toContain('data-role="heatmap-label"');
  expect(heatmap).toContain('data-orientation="horizontal"');
  expect(heatmap).toContain('data-role="colorbar-major-tick"');
  expect(heatmap).toContain('data-role="colorbar-minor-tick"');
  const contour = svg('contour', columns, (plot) => {
    plot.mode = 'filled';
    plot.levels = { mode: 'values', values: [2, 3] };
    plot.contour = {
      smoothing: false,
      labels: true,
      outOfRange: 'clamp',
      dataRegion: 'xyz',
    };
  });
  expect(contour).toContain('data-role="contour-triangle-band"');
  expect(contour).toContain('data-level="');
  expect(
    [
      ...contour.matchAll(/data-role="contour-label"[^>]*>([^<]+)<\/text>/g),
    ].map((match) => match[1]),
  ).toEqual(['2', '3']);
});

it('renders bilinear matrix cells and interval contour level styles', () => {
  const columns = { x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [0, 1, 1, 2] };
  const heatmap = svg('heatmap', columns, (plot) => {
    plot.heatmap = {
      missingColor: '#eeeeee',
      labels: true,
      interpolation: 'bilinear',
      dataRegion: 'matrix',
      cellBorder: {
        visible: true,
        color: '#123456',
        widthPt: 0.5,
        dash: 'solid',
      },
    };
  });
  expect(heatmap).toContain('data-interpolation="bilinear"');
  expect(heatmap).toMatch(/data-interpolation="bilinear"[^>]*stroke="#123456"/);
  const contour = svg('contour', columns, (plot) => {
    plot.levels = { mode: 'interval', start: 0.5, end: 1.5, step: 0.5 };
    plot.contour = {
      smoothing: true,
      labels: true,
      outOfRange: 'clamp',
      dataRegion: 'matrix',
    };
    plot.levelStyles = [
      {
        level: 1,
        lineStyle: {
          visible: true,
          color: '#ff0000',
          widthPt: 3,
          dash: 'dashed',
        },
      },
    ];
  });
  expect(contour).toContain('data-level="1"');
  expect(contour).toContain('stroke="#ff0000"');
  expect(contour).toContain('data-role="contour-label"');
});

it('keeps a bottom horizontal colorbar below the x-axis title', () => {
  const output = svg(
    'heatmap',
    { x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [0, 1, 2, 3] },
    (plot, template) => {
      template.panels[0].axes[0].title = {
        format: 'plain',
        text: 'X',
        fontFamily: 'Arial',
        fontSizePt: 12,
        color: '#111111',
      };
      Object.assign(plot.colorScale.colorbar, {
        orientation: 'horizontal',
        side: 'bottom',
        length: 0.8,
        widthPt: 10,
      });
    },
  );
  const xTitle = output.match(
      /<text data-role="axis-title"[^>]*>X<\/text>/,
    )?.[0],
    xTitleY = Number(xTitle?.match(/ y="([^"]+)"/)?.[1]),
    colorbarY = Number(
      output.match(
        /data-role="colorbar"[^>]*data-side="bottom"[\s\S]*?<rect x="[^"]+" y="([^"]+)"/,
      )?.[1],
    );
  expect(xTitleY).toBeGreaterThan(0);
  expect(colorbarY).toBeGreaterThan(xTitleY + 4);
});
