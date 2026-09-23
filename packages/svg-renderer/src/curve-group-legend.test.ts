import { expect, it } from 'vitest';
import type { XyPlot } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { captureMarkerSource } from './marker-overrides.js';
import { renderFigureSvg } from './index.js';

function fixture() {
  const template = chartTemplate('xy');
  const plot = template.panels[0]!.plotSlots[0]! as XyPlot;
  plot.mode = 'line-markers';
  plot.subset = {
    mode: 'length',
    length: 2,
    breakConnection: false,
    colors: ['#ff0000'],
    markerShapes: ['square'],
  };
  const data = chartData({ x: [1, 2, 3], y: [2, 4, 3], color: [0, 1, 2] });
  for (const column of data.columns)
    column.source = { tableId: 't', tableName: 'T', dataStartRow: 1 };
  return { template, plot, data };
}
function markers(svg: string) {
  const main = svg.match(
    /<(?:rect|circle|polygon|path)\b[^>]*data-role="marker"[^>]*>/,
  )?.[0];
  const legend = svg.match(
    /<(?:rect|circle|polygon|path)\b[^>]*data-role="legend-marker"[^>]*>/,
  )?.[0];
  expect(main).toBeDefined();
  expect(legend).toBeDefined();
  return { main: main!, legend: legend! };
}
it.each(['display', 'export'] as const)(
  'uses the actual subset marker for the %s legend',
  (purpose) => {
    const { template, data } = fixture();
    const result = renderFigureSvg(template, data, { purpose });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    const { main, legend } = markers(result.svg);
    expect(main).toMatch(/^<rect\b/);
    expect(main).toContain('fill="#ff0000"');
    expect(legend).toMatch(/^<rect\b/);
    expect(legend).toContain('fill="#ff0000"');
    expect(legend).toContain('stroke="#ff0000"');
  },
);
it('keeps column mapping above subset colors when preparing the representative legend sample', () => {
  const { template, plot, data } = fixture();
  template.dataSlots.push({
    dataSlotId: 'slot-color',
    name: 'Color',
    role: 'color',
    valueType: 'number',
    required: false,
  });
  plot.bindings.color = 'slot-color';
  plot.markerMapping = {
    color: {
      mode: 'continuous',
      target: 'fill',
      colors: ['#00ff00', '#0000ff'],
    },
  };
  plot.transform = { offsetY: { mode: 'constant', value: 5 } };
  const result = renderFigureSvg(template, data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  const { main, legend } = markers(result.svg);
  expect(main).toContain('fill="#00ff00"');
  expect(legend).toMatch(/^<rect\b/);
  expect(legend).toContain('fill="#00ff00"');
  expect(legend).toContain('stroke="#ff0000"');
});
it('uses source-protected point overrides above both subset and mapping in the legend', () => {
  const { template, plot, data } = fixture();
  template.dataSlots.push({
    dataSlotId: 'slot-color',
    name: 'Color',
    role: 'color',
    valueType: 'number',
    required: false,
  });
  plot.bindings.color = 'slot-color';
  plot.markerMapping = {
    color: {
      mode: 'continuous',
      target: 'fill',
      colors: ['#00ff00', '#0000ff'],
    },
  };
  plot.markerOverrides = {
    source: captureMarkerSource(
      data.columns,
      data.columns[0]!,
      data.columns[1]!,
    ),
    points: [
      {
        row: 1,
        style: { shape: 'circle', fill: '#ff00ff', stroke: '#112233' },
      },
    ],
  };
  const result = renderFigureSvg(template, data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  const { main, legend } = markers(result.svg);
  expect(main).toMatch(/^<circle\b/);
  expect(main).toContain('fill="#ff00ff"');
  expect(legend).toMatch(/^<circle\b/);
  expect(legend).toContain('fill="#ff00ff"');
  expect(legend).toContain('stroke="#112233"');
});
