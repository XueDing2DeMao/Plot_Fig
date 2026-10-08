// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CURRENT_SCHEMA_VERSION } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';
import { figureCoordinates } from './figure-coordinates.js';
import { captureMarkerSource } from './marker-overrides.js';

function fixture() {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  panel.frame = { x: 0.15, y: 0.1, width: 0.78, height: 0.75 };
  const source = panel.plotSlots[0]!;
  panel.plotSlots = ['a', 'b', 'c'].map((plotSlotId) => ({
    ...structuredClone(source),
    plotSlotId,
  }));
  panel.groups = [
    {
      groupId: 'temperature',
      name: '温度',
      members: ['a', 'b', 'c'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: {
        source: 'values',
        colors: ['#000000', '#ffffff'],
        values: [
          { plotSlotId: 'a', value: 500 },
          { plotSlotId: 'b', value: 550 },
          { plotSlotId: 'c', value: 1000 },
        ],
        colorbar: { visible: true },
      },
    },
  ];
  const data = chartData({ x: [0, 1, 2], y: [1, 2, 3] });
  return { template, panel, data };
}
function svgFor(f: ReturnType<typeof fixture>) {
  const result = renderFigureSvg(f.template, f.data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result));
  return new DOMParser().parseFromString(result.svg, 'image/svg+xml');
}
it('renders a saved group colorbar using the same numeric mapping and geometry as the curves', () => {
  const f = fixture(),
    svg = svgFor(f),
    bar = svg.querySelector('[data-role="group-colorbar"]');
  expect(bar).not.toBeNull();
  expect(bar!.getAttribute('data-group-id')).toBe('temperature');
  expect(bar!.textContent).toContain('温度');
  expect(
    [...svg.querySelectorAll('[data-role="plot-slot"] path[stroke]')].map((p) =>
      p.getAttribute('stroke'),
    ),
  ).toEqual(['#000000', '#1a1a1a', '#ffffff']);
  const clip = svg.querySelector('[data-role="panel-clip"]')!;
  const rect = figureCoordinates(f.template, f.data).panels.get(
    f.panel.panelId,
  )!.rect;
  expect(Number(clip.getAttribute('width'))).toBeCloseTo(rect.width, 5);
  expect(Number(bar!.querySelector('rect')!.getAttribute('x'))).toBeGreaterThan(
    rect.x + rect.width,
  );
  const before = rect.width;
  delete f.panel.groups![0]!.colorMapping!.colorbar;
  expect(
    figureCoordinates(f.template, f.data).panels.get(f.panel.panelId)!.rect
      .width,
  ).toBeGreaterThan(before);
});
it('keeps reverse, fixed-domain endpoints and empty explicit titles', () => {
  const f = fixture(),
    mapping = f.panel.groups![0]!.colorMapping!;
  mapping.reverse = true;
  mapping.domain = { min: 550, max: 800 };
  mapping.label = '';
  const svg = svgFor(f),
    bar = svg.querySelector('[data-role="group-colorbar"]')!;
  expect(bar).not.toBeNull();
  expect(bar.textContent).not.toContain('温度');
  const stops = bar.querySelectorAll('stop');
  expect(stops[0]!.getAttribute('stop-color')).toBe('#ffffff');
  expect(stops[stops.length - 1]!.getAttribute('stop-color')).toBe('#000000');
  expect(bar.textContent).toContain('550');
  expect(bar.textContent).toContain('800');
});
it('shows a midpoint single tick for equal values', () => {
  const f = fixture(),
    mapping = f.panel.groups![0]!.colorMapping!;
  if (mapping.source === 'values')
    mapping.values.forEach((e) => {
      e.value = 600;
    });
  const bar = svgFor(f).querySelector('[data-role="group-colorbar"]')!;
  expect(bar).not.toBeNull();
  expect(
    bar.querySelectorAll('[data-role="colorbar-major-tick"]'),
  ).toHaveLength(1);
  expect(
    [...bar.querySelectorAll('stop')].every(
      (s) => s.getAttribute('stop-color') === '#808080',
    ),
  ).toBe(true);
});
it.each(['disabled', 'independent', 'missing', 'hidden', 'no-data'] as const)(
  'does not reserve room for %s groups',
  (mode) => {
    const f = fixture(),
      g = f.panel.groups![0]!;
    const base = structuredClone(f.template);
    delete base.panels[0]!.groups;
    if (mode === 'disabled') g.colorMapping!.colorbar!.visible = false;
    if (mode === 'independent') g.mode = 'independent';
    if (mode === 'missing' && g.colorMapping!.source === 'values')
      g.colorMapping!.values = [];
    if (mode === 'hidden')
      f.panel.plotSlots.forEach((p) => {
        p.visible = false;
      });
    if (mode === 'no-data')
      f.data = chartData({ x: [null, null], y: [null, null] });
    const coords = figureCoordinates(f.template, f.data);
    expect(coords.panels.get(f.panel.panelId)!.rect.width).toBe(
      figureCoordinates(base, f.data).panels.get(f.panel.panelId)!.rect.width,
    );
    if (mode !== 'no-data')
      expect(
        svgFor(f).querySelector('[data-role="group-colorbar"]'),
      ).toBeNull();
  },
);
it('excludes independent descendants, missing values and orphan parameters from the parent domain', () => {
  const f = fixture(),
    parent = f.panel.groups![0]!;
  parent.members = ['a', 'b'];
  f.panel.groups!.push({
    groupId: 'child',
    parentId: parent.groupId,
    name: '子组',
    members: ['c'],
    mode: 'independent',
    increment: 'synchronized',
    step: 1,
  });
  if (parent.colorMapping!.source === 'values')
    parent.colorMapping!.values.push({ plotSlotId: 'orphan', value: 10000 });
  const bar = svgFor(f).querySelector('[data-role="group-colorbar"]')!;
  expect(bar).not.toBeNull();
  expect(bar.textContent).toContain('550');
  expect(bar.textContent).not.toContain('1000');
});
it('preserves the mapped domain when a member is hidden', () => {
  const f = fixture();
  f.panel.plotSlots[2]!.visible = false;
  expect(
    svgFor(f).querySelector('[data-role="group-colorbar"]')!.textContent,
  ).toContain('1000');
});
it('does not reserve a colorbar for a line-only curve with one point', () => {
  const f = fixture();
  f.data = chartData({ x: [0], y: [1] });
  for (const p of f.panel.plotSlots) if (p.kind === 'xy') p.mode = 'line';
  expect(svgFor(f).querySelector('[data-role="group-colorbar"]')).toBeNull();
  for (const p of f.panel.plotSlots)
    if (p.kind === 'xy') {
      p.mode = 'markers';
      p.markerStyle!.visible = true;
    }
  expect(
    svgFor(f).querySelector('[data-role="group-colorbar"]'),
  ).not.toBeNull();
});
it('keeps a colorbar for visible line portions crossing an axis break', () => {
  const f = fixture();
  f.panel.axes.find((a) => a.dimension === 'y')!.range = {
    mode: 'fixed',
    min: 0,
    max: 10,
  };
  f.panel.axes.find((a) => a.dimension === 'y')!.advanced = {
    breaks: { intervals: [{ from: 4, to: 6 }] },
  };
  for (const p of f.panel.plotSlots) if (p.kind === 'xy') p.mode = 'line';
  f.data = chartData({ x: [0, 1], y: [2, 5] });
  expect(
    svgFor(f).querySelector('[data-role="group-colorbar"]'),
  ).not.toBeNull();
});
it('does not reserve a colorbar when line and symbol drawing are both disabled', () => {
  const f = fixture();
  for (const p of f.panel.plotSlots)
    if (p.kind === 'xy') {
      p.lineStyle!.visible = false;
      p.markerStyle!.visible = false;
    }
  expect(svgFor(f).querySelector('[data-role="group-colorbar"]')).toBeNull();
});
it('shows a colorbar when an area fill intersects the viewport but its upper edge does not', () => {
  const template = chartTemplate('area'),
    panel = template.panels[0]!,
    plot = panel.plotSlots[0]!;
  panel.axes.find((a) => a.dimension === 'y')!.range = {
    mode: 'fixed',
    min: 0,
    max: 10,
  };
  panel.groups = [
    {
      groupId: 'g',
      name: 'Area',
      members: [plot.plotSlotId],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: {
        source: 'index',
        colors: ['#000000', '#ffffff'],
        colorbar: { visible: true },
      },
    },
  ];
  const result = renderFigureSvg(
    template,
    chartData({ x: [0, 1], y: [20, 30] }),
  );
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.svg).toContain('data-role="group-colorbar"');
});
it.each([true, false])(
  'uses final per-point symbol visibility: %s',
  (visible) => {
    const f = fixture();
    f.data.columns.forEach((c) => {
      c.source = { tableId: 't', tableName: 'Data', dataStartRow: 1 };
    });
    const source = captureMarkerSource(
      f.data.columns,
      f.data.columns[0]!,
      f.data.columns[1]!,
    );
    for (const p of f.panel.plotSlots)
      if (p.kind === 'xy') {
        p.mode = 'markers';
        p.markerStyle!.visible = !visible;
        p.markerOverrides = {
          source,
          points: [1, 2, 3].map((row) => ({ row, style: { visible } })),
        };
      }
    expect(!!svgFor(f).querySelector('[data-role="group-colorbar"]')).toBe(
      visible,
    );
  },
);
it('rejects layouts too small for titles and several colorbars', () => {
  const f = fixture();
  f.panel.groups![0]!.colorMapping!.label = 'A'.repeat(128);
  const result = renderFigureSvg(f.template, f.data);
  expect(result.ok).toBe(false);
  expect(
    result.diagnostics.some((d) => d.message.includes('图层尺寸不足')),
  ).toBe(true);
});
it('retains byte-identical disabled legacy renders captured before M4B', () => {
  const cases = JSON.parse(
    readFileSync('tests/fixtures/m4b/legacy-render.json', 'utf8').replace(
      /^\uFEFF/,
      '',
    ),
  );
  for (const sample of Object.values(cases) as any[]) {
    sample.template.schemaVersion = CURRENT_SCHEMA_VERSION;
    const result = renderFigureSvg(sample.template, sample.data);
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(createHash('sha256').update(result.svg).digest('hex')).toBe(
        sample.svgHash,
      );
  }
});
