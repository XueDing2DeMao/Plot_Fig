import { expect, it } from 'vitest';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import {
  chartData,
  chartTemplate,
} from '../../../../tests/helpers/chart-fixtures.js';
import { parseProjectFile, serializeProjectFile } from './project-file.js';

it.each([
  [
    'histogram',
    { values: [1, 2, 3, 4] },
    (plot: any) =>
      Object.assign(plot, {
        bins: { mode: 'width', width: 1, start: 1, end: 5, scale: 'linear' },
        boundary: 'right',
        gap: 0.15,
        showStatistics: true,
        distribution: {
          visible: true,
          kind: 'gamma',
          samples: 96,
          parameters: { shape: 2, scale: 1 },
          extendPercent: 200,
          normalize: 'density',
          symmetric: false,
        },
      }),
  ],
  [
    'box',
    { values: [1, 2, 3, 4, 20], split: ['L', 'L', 'R', 'R', 'R'] },
    (plot: any, template: any) => {
      plot.bindings.split = 'slot-split';
      template.dataSlots.push({
        dataSlotId: 'slot-split',
        name: 'split',
        role: 'split',
        valueType: 'category',
        required: false,
      });
      Object.assign(plot, {
        quantileMethod: 'type2',
        boxRange: 'percentile',
        whiskerRange: 'percentile',
        percentileLow: 10,
        percentileHigh: 90,
        percentile: [10, 90],
        showMean: true,
        showMedian: true,
        showExtremes: true,
        rawPoints: 'spread',
        confidence: {
          visible: true,
          target: 'mean',
          method: 'normal',
          level: 0.95,
        },
        distribution: {
          visible: true,
          kind: 'normal',
          samples: 64,
          parameters: { mu: 3, sigma: 1 },
          extendPercent: 200,
          normalize: 'count',
          symmetric: false,
          side: 'split',
        },
        connections: { mean: false, median: false, percentiles: false },
      });
    },
  ],
  [
    'heatmap',
    { x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [0, 1, 2, 3] },
    (plot: any) => {
      plot.heatmap = {
        missingColor: '#eeeeee',
        labels: true,
        interpolation: 'bilinear',
        dataRegion: 'matrix',
      };
      Object.assign(plot.colorScale, {
        transform: 'linear',
        interpolation: 'discrete',
      });
      Object.assign(plot.colorScale.colorbar, {
        mode: 'independent',
        range: { min: 0, max: 3 },
        orientation: 'horizontal',
        side: 'bottom',
        length: 0.8,
        widthPt: 12,
        majorTicks: 4,
        minorTicks: 2,
        notation: 'fixed',
        precision: 2,
        endpoints: 'triangles',
      });
    },
  ],
] as const)(
  'saves and reopens F6 %s settings with identical SVG',
  (kind, columns, configure) => {
    const template: any = chartTemplate(kind),
      data = chartData(columns as any);
    configure(template.panels[0].plotSlots[0], template);
    const before = renderFigureSvg(template, data);
    expect(before.ok, JSON.stringify(before.diagnostics)).toBe(true);
    const loaded = parseProjectFile(
      serializeProjectFile(template, data, 'fixture'),
    );
    expect(loaded.ok, JSON.stringify(loaded)).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.document.templateSnapshot).toEqual(template);
    expect(renderFigureSvg(loaded.document.templateSnapshot, data)).toEqual(
      before,
    );
  },
);
