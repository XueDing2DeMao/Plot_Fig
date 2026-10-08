// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
  type FigureTemplate,
  type CurveGroup,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';
import { figureCoordinates } from './figure-coordinates.js';

it('keeps linked overlays identical when one layer also has a top heatmap bar', () => {
  const template = chartTemplate('heatmap');
  template.page.size.height.value = 160;
  const panel = template.panels[0]!,
    heat = panel.plotSlots[0]!;
  if (heat.kind !== 'heatmap') throw new Error('fixture');
  heat.colorScale.colorbar.orientation = 'horizontal';
  heat.colorScale.colorbar.side = 'top';
  const curve = structuredClone(chartTemplate('xy').panels[0]!.plotSlots[0]!);
  curve.plotSlotId = 'curve';
  panel.plotSlots.push(curve);
  panel.groups = [group('g', ['curve'])];
  const other = structuredClone(panel);
  other.panelId = 'overlay';
  delete other.groups;
  other.frameLink = {
    parentPanelId: panel.panelId,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  };
  other.plotSlots = [structuredClone(curve)];
  other.axes.forEach((a) => {
    a.axisId += '-other';
  });
  other.plotSlots.forEach((p) => {
    p.plotSlotId += '-other';
    p.xAxisId += '-other';
    p.yAxisId += '-other';
  });
  template.panels.push(other);
  const data = chartData({ x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [1, 2, 3, 4] });
  render(template, data);
  const coords = figureCoordinates(template, data);
  expect(coords.panels.get(panel.panelId)!.rect).toEqual(
    coords.panels.get(other.panelId)!.rect,
  );
});

function group(id: string, members: string[]): CurveGroup {
  return {
    groupId: id,
    name: `Group ${id}`,
    members,
    mode: 'dependent',
    increment: 'synchronized',
    step: 1,
    colorMapping: {
      source: 'index',
      colors: ['#000000', '#ffffff'],
      colorbar: { visible: true },
    },
  };
}
function render(template: FigureTemplate, data: DataBindingSet) {
  expect(
    validateFigureTemplate(template).ok,
    JSON.stringify(validateFigureTemplate(template)),
  ).toBe(true);
  const result = renderFigureSvg(template, data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return new DOMParser().parseFromString(result.svg, 'image/svg+xml');
}
it('allocates distinct slots for three groups and accounts for long right-axis labels', () => {
  const template = chartTemplate('xy');
  template.page.size.width.value = 300;
  const panel = template.panels[0]!,
    source = panel.plotSlots[0]!;
  panel.plotSlots = ['a', 'b', 'c'].map((plotSlotId) => ({
    ...structuredClone(source),
    plotSlotId,
  }));
  panel.groups = panel.plotSlots.map((p) =>
    group(p.plotSlotId, [p.plotSlotId]),
  );
  const y = panel.axes.find((a) => a.dimension === 'y')!;
  y.position = 'right';
  y.tickLabels.precision = 12;
  y.tickLabels.notation = 'fixed';
  y.title = {
    ...y.title!,
    format: 'plain',
    text: 'Long right title',
    fontFamily: 'Arial',
    fontSizePt: 12,
    color: '#000000',
  };
  const data = chartData({ x: [0, 1, 2], y: [1, 2, 3] }),
    svg = render(template, data);
  const bars = [...svg.querySelectorAll('[data-role="group-colorbar"] rect')];
  expect(bars).toHaveLength(3);
  const xs = bars.map((b) => Number(b.getAttribute('x')));
  expect(xs[1]! - xs[0]!).toBeGreaterThanOrEqual(60);
  expect(xs[2]! - xs[1]!).toBeGreaterThanOrEqual(60);
  const rect = figureCoordinates(template, data).panels.get(
    panel.panelId,
  )!.rect;
  expect(xs[0]! - (rect.x + rect.width)).toBeGreaterThan(75);
});
it('places heatmap colorbars before group colorbars without altering their gradients', () => {
  const template = chartTemplate('heatmap'),
    xy = chartTemplate('xy');
  template.page.size.width.value = 260;
  const panel = template.panels[0]!;
  const plot = {
    ...structuredClone(xy.panels[0]!.plotSlots[0]!),
    plotSlotId: 'curve',
  };
  panel.plotSlots.push(plot);
  panel.groups = [group('g', ['curve'])];
  const data = chartData({ x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [1, 2, 3, 4] });
  const svg = render(template, data);
  const bars = [...svg.querySelectorAll('[data-role="colorbar"] > rect')];
  expect(bars).toHaveLength(2);
  expect(
    Number(bars[1]!.getAttribute('x')) - Number(bars[0]!.getAttribute('x')),
  ).toBeGreaterThanOrEqual(60);
  const gradients = [...svg.querySelectorAll('linearGradient')];
  expect(new Set(gradients.map((el) => el.id)).size).toBe(2);
});
it.each(['double-y', 'triple-y', 'quad-y', 'stacked-shared-x'])(
  'keeps %s plots horizontally aligned and assigns colorbars to their own groups',
  (preset) => {
    const cases = JSON.parse(
      readFileSync('tests/fixtures/m4b/legacy-render.json', 'utf8').replace(
        /^\uFEFF/,
        '',
      ),
    );
    const { template, data } = cases[preset] as {
      template: FigureTemplate;
      data: DataBindingSet;
    };
    template.schemaVersion = CURRENT_SCHEMA_VERSION;
    template.page.size.width.value = 300;
    for (const panel of template.panels) {
      const first = panel.plotSlots[0]!;
      panel.groups = [group('same-group-id', [first.plotSlotId])];
    }
    const svg = render(template, data),
      coords = figureCoordinates(template, data);
    const widths = [...coords.panels.values()].map((p) => p.rect.width);
    expect(widths.every((w) => Math.abs(w - widths[0]!) < 1e-6)).toBe(true);
    const bars = [...svg.querySelectorAll('[data-role="group-colorbar"]')];
    expect(bars).toHaveLength(template.panels.length);
    const ids = bars.map((bar) => bar.querySelector('linearGradient')!.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const panel of template.panels) {
      const clip = svg.querySelector(
        `[data-role="panel"][data-panel-id="${panel.panelId}"] [data-role="panel-clip"]`,
      )!;
      expect(Number(clip.getAttribute('width'))).toBeCloseTo(
        coords.panels.get(panel.panelId)!.rect.width,
        5,
      );
    }
    if (preset === 'triple-y' || preset === 'quad-y') {
      const xs = bars.map((bar) =>
        Number(bar.querySelector('rect')!.getAttribute('x')),
      );
      expect(xs.every((x, i) => i === 0 || x > xs[i - 1]! + 10)).toBe(true);
    }
  },
);
it('matches constrained plot geometry and escapes plain titles', () => {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  panel.axisLengthRatio = {
    xAxisId: panel.axes[0]!.axisId,
    yAxisId: panel.axes[1]!.axisId,
    ratio: 1,
  };
  panel.groups = [group('g', [panel.plotSlots[0]!.plotSlotId])];
  panel.groups[0]!.colorMapping!.label = '<Temperature & value>';
  const data = chartData({ x: [0, 1, 2], y: [0, 1, 2] }),
    svg = render(template, data);
  const rect = figureCoordinates(template, data).panels.get(
    panel.panelId,
  )!.rect;
  expect(rect.width).toBeCloseTo(rect.height, 6);
  expect(
    svg.querySelector('[data-role="group-colorbar"]')!.textContent,
  ).toContain('<Temperature & value>');
  expect(svg.querySelector('parsererror')).toBeNull();
});
it('rejects colorbars obscured by an unrelated overlapping panel', () => {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!;
  panel.groups = [group('g', [panel.plotSlots[0]!.plotSlotId])];
  const other = structuredClone(panel);
  other.panelId = 'other';
  delete other.groups;
  other.axes.forEach((a) => {
    a.axisId += '-other';
  });
  other.plotSlots.forEach((p) => {
    p.plotSlotId += '-other';
    p.xAxisId += '-other';
    p.yAxisId += '-other';
  });
  template.panels.push(other);
  const result = renderFigureSvg(
    template,
    chartData({ x: [0, 1, 2], y: [1, 2, 3] }),
  );
  expect(result.ok).toBe(false);
  expect(
    result.diagnostics.some((d) => d.message.includes('图层尺寸不足')),
  ).toBe(true);
});
it('reserves right-axis label tables and special leaders', () => {
  const template = chartTemplate('xy');
  template.page.size.width.value = 300;
  const panel = template.panels[0]!,
    y = panel.axes.find((a) => a.dimension === 'y')!;
  panel.groups = [group('g', [panel.plotSlots[0]!.plotSlotId])];
  y.position = 'right';
  y.range = { mode: 'fixed', min: 0, max: 10 };
  y.advanced = {
    labelTable: { rows: [{ source: 'index', title: 'Index' }] },
    specialTicks: [{ at: 'value', value: 2, leaderPt: 110 }],
    arrow: 'both',
  };
  const data = chartData({ x: [0, 1, 2, 3], y: [1, 3, 7, 9] }),
    svg = render(template, data);
  expect(svg.querySelector('[data-role="axis-label-table"]')).not.toBeNull();
  const rect = figureCoordinates(template, data).panels.get(
    panel.panelId,
  )!.rect;
  expect(
    Number(
      svg.querySelector('[data-role="group-colorbar"] rect')!.getAttribute('x'),
    ) -
      rect.x -
      rect.width,
  ).toBeGreaterThan(118);
});
