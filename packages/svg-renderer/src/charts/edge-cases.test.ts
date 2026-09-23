import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
  colorScale,
} from '../../../../tests/helpers/chart-fixtures.js';
import { preparePlot, arrangeBands } from './prepare.js';
import { prepareGrid, MAX_GRID_CELLS } from './grid.js';
import { makeColorScale, renderColorbar } from './color-scale.js';
import { renderTemplateSvg } from '../render.js';
import { prepareAxisScale } from '../panel-scales.js';
import { histogram, boxSummary } from './statistics.js';

function bar(id: string, categories: (number | string)[], values: number[]) {
  const plot = chartTemplate('bar').panels[0]!.plotSlots[0]!;
  if (plot.kind !== 'bar') throw new Error('fixture');
  plot.plotSlotId = id;
  plot.layout = 'stacked';
  plot.stackGroup = 'stack-1';
  return preparePlot(plot, chartData({ category: categories, value: values }));
}

it('aligns reordered categories, separates positive and negative stacks, and includes totals in range', () => {
  const a = bar('a', ['A', 'B', 'C'], [2, -3, 1]);
  const b = bar('b', ['B', 'A'], [-4, 5]);
  arrangeBands([a, b]);
  expect(b.bars.map(({ start, end }) => [start, end])).toEqual([
    [-3, -7],
    [2, 7],
  ]);
  expect(b.bandIndex).toBe(a.bandIndex);
  const axis = chartTemplate('bar').panels[0]!.axes[1]!;
  expect(prepareAxisScale(axis, [a, b])).toMatchObject({ min: -7, max: 7 });
  expect(b.categories.map((c) => c.label)).toEqual(['B', 'A']);
});

it('keeps numeric and text category identities and separate stack groups', () => {
  const a = bar('a', [1, '1'], [2, 3]),
    b = bar('b', ['1'], [5]);
  if (b.plot.kind === 'bar') b.plot.stackGroup = 'stack-2';
  arrangeBands([a, b]);
  expect(a.categories[0]!.key).not.toBe(a.categories[1]!.key);
  expect(b.bars[0]).toMatchObject({ start: 0, end: 5 });
  expect([a.bandIndex, b.bandIndex]).toEqual([0, 1]);
});

it('isolates an overflowing stack series without corrupting valid totals', () => {
  const a = bar('a', ['A', 'B'], [1, 1e308]);
  const bad = bar('bad', ['A', 'B'], [2, 1e308]);
  const c = bar('c', ['A', 'B'], [3, -1]);
  const failures = arrangeBands([a, bad, c]);
  expect(failures).toHaveLength(1);
  expect(c.bars.map(({ start, end }) => [start, end])).toEqual([
    [1, 4],
    [0, -1],
  ]);
});

it('reconstructs unordered non-square grids and tolerates floating point spacing', () => {
  const grid = prepareGrid(
    {
      x: [4, 0, 2, 2, 0, 4],
      y: [20, 10, 20, 10, 20, 10],
      z: [6, 1, 5, 2, 4, 3],
    },
    true,
  );
  expect(grid).toMatchObject({
    x: [0, 2, 4],
    y: [10, 20],
    dx: 2,
    dy: 10,
    values: [1, 2, 3, 4, 5, 6],
  });
  expect(
    prepareGrid(
      {
        x: [0.1, 0.2, 0.3, 0.1, 0.2, 0.3],
        y: [0, 0, 0, 1, 1, 1],
        z: [1, 2, 3, 4, 5, 6],
      },
      true,
    ).values,
  ).toHaveLength(6);
});

it('rejects duplicate, irregular and oversized grids before allocating the product', () => {
  expect(() =>
    prepareGrid({ x: [0, 1, 0, 0], y: [0, 0, 1, 1], z: [1, 2, 3, 4] }, false),
  ).toThrow(/重复/);
  expect(() =>
    prepareGrid({ x: [0, 1, 3], y: [0, 1, 0], z: [1, 2, 3] }, false),
  ).toThrow(/等间距/);
  const count = Math.ceil(Math.sqrt(MAX_GRID_CELLS)) + 1;
  const coordinates = Array.from({ length: count }, (_, i) => i);
  expect(() =>
    prepareGrid({ x: coordinates, y: coordinates, z: coordinates }, false),
  ).toThrow(/超过/);
});

it('handles constant and single samples and rejects invalid histogram boundaries', () => {
  expect(
    histogram([4, 4, null], {
      bins: { mode: 'auto' },
      normalization: 'probability',
    }),
  ).toMatchObject({ skipped: 1, bins: [{ value: 1, count: 2 }] });
  expect(boxSummary([3])).toMatchObject({
    q1: 3,
    median: 3,
    q3: 3,
    low: 3,
    high: 3,
    outliers: [],
  });
  expect(() =>
    histogram([1], {
      bins: { mode: 'edges', edges: [0, 0, 2] },
      normalization: 'count',
    }),
  ).toThrow(/严格递增/);
  expect(() =>
    histogram([null], { bins: { mode: 'auto' }, normalization: 'count' }),
  ).toThrow(/有效数值/);
});

it('interpolates wide finite color ranges without overflow or invalid colors', () => {
  const config = {
    ...colorScale,
    range: { mode: 'fixed' as const, min: -1e308, max: 1e308 },
  };
  const scale = makeColorScale(config, [-1e308, 1e308]);
  expect(scale.color(0)).toBe('#21918c');
  expect(scale.color(1e308)).toBe('#fde725');
  expect(
    renderColorbar(config, [-1e308, 1e308], {
      rect: { x: 0, y: 0, width: 100, height: 100 },
      id: 'z',
      index: 0,
    }),
  ).not.toMatch(/NaN|Infinity/);
});

it('uses every configured color for a discrete scale, including the upper endpoint', () => {
  const config = {
      ...colorScale,
      interpolation: 'discrete',
      colors: ['#000000', '#888888', '#ffffff'],
      range: { mode: 'fixed', min: 0, max: 3 },
    } as const,
    scale = makeColorScale(config, [0, 3]);
  expect(scale.color(0)).toBe('#000000');
  expect(scale.color(1.5)).toBe('#888888');
  expect(scale.color(3)).toBe('#ffffff');
  const colorbar = renderColorbar(config, [0, 3], {
    rect: { x: 0, y: 0, width: 100, height: 100 },
    id: 'discrete',
    index: 0,
  });
  expect(colorbar).toContain(
    '<stop offset="0.3333333333333333" stop-color="#000000" /><stop offset="0.3333333333333333" stop-color="#888888" />',
  );
});

it('distinguishes triangle-only and combined colorbar endpoints', () => {
  const render = (endpoints: 'triangles' | 'both') =>
    renderColorbar(
      {
        ...colorScale,
        colorbar: { ...colorScale.colorbar, endpoints },
      },
      [0, 1],
      {
        rect: { x: 0, y: 0, width: 100, height: 100 },
        id: endpoints,
        index: 0,
      },
    );
  expect(render('triangles')).not.toContain('colorbar-endpoint-cap');
  expect(render('both').match(/colorbar-endpoint-cap/g)).toHaveLength(2);
});

it('keeps maximum-width colorbars inside their reserved side slots', () => {
  const render = (
      orientation: 'vertical' | 'horizontal',
      side: 'left' | 'top',
    ) =>
      renderColorbar(
        {
          ...colorScale,
          colorbar: {
            ...colorScale.colorbar,
            orientation,
            side,
            widthPt: 72,
          },
        },
        [0, 1],
        {
          rect: { x: 122, y: 130, width: 278, height: 170 },
          id: `${orientation}-${side}`,
          index: 0,
          offset: 0,
        },
      ),
    vertical = render('vertical', 'left').match(
      /<rect x="([^"]+)" y="[^"]+" width="([^"]+)"/,
    ),
    horizontal = render('horizontal', 'top').match(
      /<rect x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/,
    );
  expect(Number(vertical?.[1]) + Number(vertical?.[2])).toBeLessThanOrEqual(
    122,
  );
  expect(Number(horizontal?.[1]) + Number(horizontal?.[2])).toBeLessThanOrEqual(
    130,
  );
});

it('renders a valid series when a different series has invalid grid data', () => {
  const template = chartTemplate('area'),
    grid = chartTemplate('contour');
  const contour = grid.panels[0]!.plotSlots[0]!;
  contour.plotSlotId = 'bad-grid';
  template.panels[0]!.plotSlots.push(contour);
  template.dataSlots.push(grid.dataSlots.find((s) => s.role === 'z')!);
  const result = renderTemplateSvg(
    template,
    chartData({ x: [0, 1, 2], y: [1, 2, 3], z: [0, 1, 2] }),
  );
  expect(result.ok).toBe(true);
  expect(
    result.diagnostics.some((d) => d.sourcePath.includes('bad-grid')),
  ).toBe(true);
  if (result.ok) expect(result.svg).toContain('data-role="area"');
});
