// @vitest-environment jsdom
import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';

function fixture(horizontal = false, reverse = false, count = 1200) {
  const template = chartTemplate('bar');
  template.page.size = {
    width: { value: 500 / 72, unit: 'in' },
    height: { value: 350 / 72, unit: 'in' },
  };
  const panel = template.panels[0]!;
  const plot = panel.plotSlots[0]!;
  if (plot.kind !== 'bar') throw new Error('Expected a bar chart');
  plot.orientation = horizontal ? 'horizontal' : 'vertical';
  const axis = panel.axes[horizontal ? 1 : 0]!;
  panel.axes[0]!.scale = horizontal ? 'linear' : 'category';
  panel.axes[1]!.scale = horizontal ? 'category' : 'linear';
  axis.reverse = reverse;
  axis.grid = {
    major: { visible: true, color: '#dddddd', widthPt: 0.5, dash: 'solid' },
  };
  const category = Array.from({ length: count }, (_, i) =>
    Number((20 + i * 0.02).toFixed(2)),
  );
  const data = chartData({
    category,
    value: category.map((_, i) =>
      i === Math.floor(count * 0.65) ? 430000 : 100,
    ),
  });
  data.source.rowCount = count;
  return { template, axis, data, category };
}

function render(input: ReturnType<typeof fixture>) {
  const result = renderFigureSvg(input.template, input.data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error('Rendering failed');
  const doc = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
  const axis = doc.querySelector(
    `[data-axis-id="${input.axis.axisId}"] [data-role^="axis-"]`,
  )!;
  return {
    doc,
    labels: [...axis.querySelectorAll('[data-role="tick-label"]')],
    ticks: [...axis.querySelectorAll('[data-role="major-tick"]')],
    bars: [...doc.querySelectorAll('[data-role="bar"]')].map(
      (bar) => bar.outerHTML,
    ),
  };
}

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])(
  'fits dense category labels, ticks and grids without dropping bars (horizontal %s, reverse %s)',
  (horizontal, reverse) => {
    const input = fixture(horizontal, reverse);
    const before = structuredClone(input);
    const output = render(input);
    expect(output.labels.length).toBeGreaterThan(1);
    expect(output.labels.length).toBeLessThan(60);
    expect(output.ticks).toHaveLength(output.labels.length);
    expect(output.bars).toHaveLength(input.category.length);
    expect(input).toEqual(before);

    const bounds = output.labels
      .map((label) => {
        const size = Number(label.getAttribute('font-size'));
        const text = label.textContent!;
        expect(input.category).toContain(Number(text));
        const position = Number(label.getAttribute(horizontal ? 'y' : 'x'));
        const extent = horizontal ? size : text.length * size * 0.6;
        return { start: position - extent / 2, end: position + extent / 2 };
      })
      .sort((a, b) => a.start - b.start);
    for (let i = 1; i < bounds.length; i++)
      expect(bounds[i]!.start).toBeGreaterThanOrEqual(
        bounds[i - 1]!.end - 0.001,
      );

    const grids = output.doc.querySelectorAll(
      `[data-role="axis-grid"][data-axis-id="${input.axis.axisId}"] [data-role="major-grid"]`,
    );
    const coordinate = horizontal ? 'y1' : 'x1';
    expect([...grids].map((grid) => grid.getAttribute(coordinate))).toEqual(
      output.ticks.map((tick) => tick.getAttribute(coordinate)),
    );

    input.axis.tickLabels.overlap = 'keep';
    expect(render(input).bars).toEqual(output.bars);
  },
);

it('also limits dense tick marks when category labels are hidden', () => {
  const input = fixture();
  input.axis.tickLabels.visible = false;
  const output = render(input);
  expect(output.labels).toHaveLength(0);
  expect(output.ticks.length).toBeGreaterThan(1);
  expect(output.ticks.length).toBeLessThan(60);
});

it('keeps every category when the user explicitly requests overlapping labels', () => {
  const input = fixture(false, false, 80);
  input.axis.tickLabels.overlap = 'keep';
  const output = render(input);
  expect(output.labels).toHaveLength(80);
  expect(output.ticks).toHaveLength(80);
});

it('keeps every label on a small category axis', () => {
  const input = fixture(false, false, 3);
  const output = render(input);
  expect(output.labels.map((label) => label.textContent)).toEqual([
    '20',
    '20.02',
    '20.04',
  ]);
  expect(output.ticks).toHaveLength(3);
  expect(output.bars).toHaveLength(3);
});

it('uses label rotation and affixes when fitting persisted category styles', () => {
  const input = fixture(false, false, 120);
  input.axis.tickLabels.rotation = 90;
  input.axis.tickLabels.suffix = ' deg';
  const rotated = render(input);
  expect(rotated.labels.length).toBeLessThan(60);
  expect(
    rotated.labels.every((label) => label.textContent!.endsWith(' deg')),
  ).toBe(true);
  input.axis.tickLabels.rotation = 0;
  expect(render(input).labels.length).toBeLessThan(rotated.labels.length);
});

it('fits the default category axis even without appearance or grid options', () => {
  const input = fixture();
  delete input.axis.grid;
  const output = render(input);
  expect(output.labels.length).toBeGreaterThan(1);
  expect(output.labels.length).toBeLessThan(60);
  expect(output.ticks).toHaveLength(output.labels.length);
});

it.each([
  [false, 1],
  [true, 1],
  [false, 2],
  [true, 2],
] as const)(
  'keeps dense bar borders inside their available spacing (horizontal %s, series %s)',
  (horizontal, series) => {
    const input = fixture(horizontal);
    if (series === 2) {
      const plots = input.template.panels[0]!.plotSlots;
      plots.push({ ...structuredClone(plots[0]!), plotSlotId: 'second-bar' });
    }
    const output = render(input);
    const marks = [...output.doc.querySelectorAll('[data-role="bar"]')];
    const size = horizontal ? 'height' : 'width';
    const position = horizontal ? 'y' : 'x';
    const bounds = marks
      .map((bar) => {
        const width = Number(bar.getAttribute(size));
        const stroke = Number(bar.getAttribute('stroke-width'));
        // 边框不能吞掉窄柱的填充，也不能跨过本来存在的柱间空隙。
        expect(stroke).toBeLessThanOrEqual(width / 2 + 0.000001);
        const start = Number(bar.getAttribute(position));
        return { start: start - stroke / 2, end: start + width + stroke / 2 };
      })
      .sort((a, b) => a.start - b.start);
    for (let i = 1; i < bounds.length; i++)
      expect(bounds[i]!.start).toBeGreaterThanOrEqual(
        bounds[i - 1]!.end - 0.000002,
      );
    expect(marks).toHaveLength(input.category.length * series);
  },
);

it('preserves the configured border width on normally spaced bars', () => {
  const input = fixture(false, false, 3);
  const output = render(input);
  expect(
    [...output.doc.querySelectorAll('[data-role="bar"]')].map((bar) =>
      bar.getAttribute('stroke-width'),
    ),
  ).toEqual(['1', '1', '1']);
});

it('keeps label-table row indices attached to the original categories after thinning', () => {
  const input = fixture();
  input.axis.advanced = { labelTable: { rows: [{ source: 'index' }] } };
  const output = render(input);
  const tableLabels = [
    ...output.doc.querySelectorAll('[data-role="axis-label-table"]'),
  ];
  expect(tableLabels.map((label) => label.textContent)).toEqual(
    output.labels.map((label) =>
      String(input.category.indexOf(Number(label.textContent)) + 1),
    ),
  );
});
