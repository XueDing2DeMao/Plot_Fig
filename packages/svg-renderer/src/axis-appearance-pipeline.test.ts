// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { validateRequest } from '../../export-service/src/security.js';
import { renderFigureSvg } from './index.js';
import { preparePanel, renderPanel } from './panel.js';

const grid = {
  visible: true,
  color: '#aabbcc',
  widthPt: 0.5,
  dash: 'dotted' as const,
};
const data = chartData({ x: [0, 1000, 2000], y: [0, 2, 1] });
function fixture() {
  const template = chartTemplate('xy');
  template.page.size = {
    width: { value: 500 / 72, unit: 'in' },
    height: { value: 400 / 72, unit: 'in' },
  };
  const panel = template.panels[0]!;
  panel.frame = { x: 0.1, y: 0.15, width: 0.7, height: 0.65 };
  const [x, y] = panel.axes;
  x!.range = { mode: 'fixed', min: 0, max: 2000 };
  y!.range = { mode: 'fixed', min: 0, max: 2 };
  x!.majorTicks.generation = { mode: 'increment', step: 1000 };
  y!.majorTicks.generation = { mode: 'endpoints' };
  for (const axis of panel.axes)
    axis.title = {
      format: 'plain',
      text: axis.dimension.toUpperCase(),
      fontFamily: 'Arial',
      fontSizePt: 10,
      color: '#111111',
    };
  return template;
}
function render(template: ReturnType<typeof fixture>, binding = data) {
  expect(validateFigureTemplate(template).ok).toBe(true);
  const result = renderFigureSvg(template, binding);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return {
    svg: result.svg,
    doc: new DOMParser().parseFromString(result.svg, 'image/svg+xml'),
  };
}
function group(doc: Document, index = 0) {
  return doc.querySelectorAll('[data-role="axes"] > g')[index]!;
}

it('consumes appearance after preparing the real panel data and places front grids below its axis labels', () => {
  const template = fixture(),
    panel = template.panels[0]!,
    axis = panel.axes[0]!;
  axis.line.visible = false;
  axis.tickLabels.suffix = ' k';
  axis.grid = { major: grid, layer: 'front' };
  const output = renderPanel(template, data, {
    panel,
    plots: preparePanel(panel, data, []),
    shared: new Map(),
    diagnostics: [],
  });
  expect(output.diagnostics).toEqual([]);
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${output.svg}</svg>`,
    'image/svg+xml',
  );
  expect(doc.querySelectorAll('[data-role="major-grid"]')).toHaveLength(3);
  expect(group(doc).querySelector('[data-role="axis-line"]')).toBeNull();
  expect(
    group(doc).querySelector('[data-role="tick-label"]')!.textContent,
  ).toBe('0 k');
  const grids = doc.querySelector('[data-role="axis-grid"]')!,
    plots = doc.querySelector('[data-role="plots"]')!,
    axes = doc.querySelector('[data-role="axes"]')!;
  expect(
    plots.compareDocumentPosition(grids) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    grids.compareDocumentPosition(axes) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it('renders persisted 1.4 line visibility, tick directions/colors and automatic minor length through the public pipeline', () => {
  const template = fixture(),
    axis = template.panels[0]!.axes[0]!;
  axis.line.visible = false;
  axis.majorTicks = {
    ...axis.majorTicks,
    lengthPt: 6,
    direction: 'both',
    color: '#ff0000',
  };
  axis.minorTicks = {
    ...axis.minorTicks,
    visible: true,
    count: 1,
    lengthPt: 17,
    lengthMode: 'auto',
    direction: 'in',
    color: '#0000ff',
  };
  const before = structuredClone(template),
    { doc } = render(template),
    x = group(doc);
  expect(x.querySelector('[data-role="axis-line"]')).toBeNull();
  const major = x.querySelector('[data-role="major-tick"]')!;
  expect([
    major.getAttribute('y1'),
    major.getAttribute('y2'),
    major.getAttribute('stroke'),
  ]).toEqual(['314', '326', '#ff0000']);
  const minor = x.querySelector('[data-role="minor-tick"]')!;
  expect([
    minor.getAttribute('y1'),
    minor.getAttribute('y2'),
    minor.getAttribute('stroke'),
  ]).toEqual(['320', '317', '#0000ff']);
  expect(x.querySelectorAll('[data-role="tick-label"]')).toHaveLength(3);
  expect(x.querySelector('[data-role="axis-title"]')).not.toBeNull();
  expect(template).toEqual(before);
});

it('renders the label formula before divisor and styling without moving data or ticks', () => {
  const template = fixture(),
    baseline = render(template),
    axis = template.panels[0]!.axes[0]!;
  Object.assign(axis.tickLabels, {
    notation: 'engineering',
    precision: 1,
    formula: 'x*2',
    divisor: 1000,
    prefix: '<&',
    suffix: 'k',
    bold: true,
    italic: true,
    rotation: 30,
    offsetPt: { x: 3, y: 4 },
    background: 'white',
    anchor: 'start',
  });
  const { doc, svg } = render(template),
    x = group(doc),
    labels = x.querySelectorAll('[data-role="tick-label"]');
  expect(Array.from(labels, (label) => label.textContent)).toEqual([
    '<&0.0e+0k',
    '<&2.0e+0k',
    '<&4.0e+0k',
  ]);
  expect(labels[0]!.getAttribute('transform')).toBe('rotate(30 53 338)');
  expect(labels[0]!.getAttribute('font-weight')).toBe('bold');
  expect(labels[0]!.getAttribute('font-style')).toBe('italic');
  expect(labels[0]!.getAttribute('text-anchor')).toBe('start');
  expect(
    x.querySelectorAll('[data-role="tick-label-background"]'),
  ).toHaveLength(3);
  expect(
    Array.from(
      x.querySelectorAll('[data-role="major-tick"]'),
      (e) => e.outerHTML,
    ),
  ).toEqual(
    Array.from(
      group(baseline.doc).querySelectorAll('[data-role="major-tick"]'),
      (e) => e.outerHTML,
    ),
  );
  expect(doc.querySelector('[data-role="plots"]')!.outerHTML).toBe(
    baseline.doc.querySelector('[data-role="plots"]')!.outerHTML,
  );
  for (const format of ['pdf', 'eps'] as const)
    expect(() =>
      validateRequest({
        svg,
        format,
        dpi: 300,
        textToPath: false,
        flattenTransparency: false,
      }),
    ).not.toThrow();
});

it('renders persisted wrapping, line-height and overlap filtering while retaining every tick', () => {
  const template = fixture(),
    axis = template.panels[0]!.axes[0]!;
  axis.majorTicks.generation = { mode: 'increment', step: 100 };
  Object.assign(axis.tickLabels, {
    prefix: 'long-label-',
    wrapWidthPt: 30,
    lineHeight: 2,
    overlap: 'hide',
  });
  const x = group(render(template).doc),
    labels = x.querySelectorAll('[data-role="tick-label"]');
  expect(x.querySelectorAll('[data-role="major-tick"]')).toHaveLength(21);
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.length).toBeLessThan(21);
  const lines = labels[0]!.querySelectorAll('tspan');
  expect(lines.length).toBeGreaterThan(1);
  expect(
    Number(lines[1]!.getAttribute('y')) - Number(lines[0]!.getAttribute('y')),
  ).toBe(16);
});

it('renders interval text at reversed mapped midpoints and positions titles by screen coordinates', () => {
  const template = fixture(),
    axis = template.panels[0]!.axes[0]!;
  axis.reverse = true;
  axis.placement = { mode: 'percent', percent: 25, offsetPt: 3 };
  axis.tickLabels.position = 'interval';
  Object.assign(axis.title!, {
    position: 0.2,
    rotation: 20,
    offsetPt: { x: 4, y: 5 },
    bold: true,
    italic: true,
  });
  const x = group(render(template).doc);
  expect(
    Array.from(x.querySelectorAll('[data-role="tick-label"]'), (e) => [
      e.textContent,
      e.getAttribute('x'),
    ]),
  ).toEqual([
    ['0', '312.5'],
    ['1000', '137.5'],
  ]);
  expect(x.querySelector('[data-role="axis-line"]')!.getAttribute('y1')).toBe(
    '128',
  );
  const title = x.querySelector('[data-role="axis-title"]')!;
  expect([
    title.getAttribute('x'),
    title.getAttribute('y'),
    title.getAttribute('transform'),
  ]).toEqual(['124', '171', 'rotate(20 124 171)']);
  expect(title.getAttribute('font-weight')).toBe('bold');
  expect(title.getAttribute('font-style')).toBe('italic');
});

it('composes back and front grids around curves, below axis text, with one panel clip even when plot clipping is disabled', () => {
  const template = fixture(),
    panel = template.panels[0]!,
    [x, y] = panel.axes;
  panel.clip = false;
  x!.minorTicks = { ...x!.minorTicks, visible: false, count: 1 };
  x!.grid = {
    major: grid,
    minor: { ...grid, color: '#111111' },
    layer: 'back',
  };
  y!.grid = { major: { ...grid, color: '#ff0000' }, layer: 'front' };
  const { doc } = render(template),
    plot = doc.querySelector('[data-role="plots"]')!,
    axes = doc.querySelector('[data-role="axes"]')!;
  const grids = doc.querySelectorAll('[data-role="axis-grid"]');
  expect(grids).toHaveLength(2);
  expect(doc.querySelectorAll('clipPath')).toHaveLength(1);
  expect(Array.from(grids, (e) => e.getAttribute('clip-path'))).toEqual([
    'url(#panel-clip-panel-main)',
    'url(#panel-clip-panel-main)',
  ]);
  expect(grids[0]!.querySelectorAll('[data-role="minor-grid"]')).toHaveLength(
    2,
  );
  expect(group(doc).querySelectorAll('[data-role="minor-tick"]')).toHaveLength(
    0,
  );
  expect(
    grids[0]!.compareDocumentPosition(plot) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    plot.compareDocumentPosition(grids[1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    grids[1]!.compareDocumentPosition(axes) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(plot.getAttribute('clip-path')).toBeNull();
});

it('uses panel-specific grid clips for multiple layers and hides all grids when their axis is hidden', () => {
  const template = fixture(),
    first = template.panels[0]!,
    second = structuredClone(first);
  second.panelId = 'panel-second';
  second.axes.forEach((axis) => (axis.axisId += '-second'));
  second.plotSlots.forEach((plot) => {
    plot.plotSlotId += '-second';
    plot.xAxisId += '-second';
    plot.yAxisId += '-second';
  });
  first.axes[0]!.grid = { major: grid };
  second.axes[0]!.grid = { major: grid };
  template.panels.push(second);
  let doc = render(template).doc;
  expect(Array.from(doc.querySelectorAll('clipPath'), (e) => e.id)).toEqual([
    'panel-clip-panel-main',
    'panel-clip-panel-second',
  ]);
  expect(
    Array.from(doc.querySelectorAll('[data-role="axis-grid"]'), (e) =>
      e.getAttribute('clip-path'),
    ),
  ).toEqual(['url(#panel-clip-panel-main)', 'url(#panel-clip-panel-second)']);
  first.axes[0]!.visible = false;
  first.axes[0]!.minorTicks.count = 10000;
  first.axes[0]!.grid!.minor = grid;
  doc = render(template).doc;
  expect(doc.querySelectorAll('[data-role="axis-grid"]')).toHaveLength(1);
});

it('maps a persisted crossing through an automatic opposite scale and reports range errors at the source axis', () => {
  const template = fixture(),
    [x, y] = template.panels[0]!.axes;
  y!.range = { mode: 'auto' };
  y!.reverse = true;
  x!.placement = { mode: 'cross', axisId: y!.axisId, value: 0.5 };
  const before = render(fixture()).doc;
  const { doc } = render(template);
  expect(
    group(doc).querySelector('[data-role="axis-line"]')!.getAttribute('y1'),
  ).toBe('125');
  const control = structuredClone(template);
  delete control.panels[0]!.axes[0]!.placement;
  expect(doc.querySelector('[data-role="plots"]')!.outerHTML).toBe(
    render(control).doc.querySelector('[data-role="plots"]')!.outerHTML,
  );
  expect(before.querySelectorAll('[data-role="plot-slot"]')).toHaveLength(1);
  x!.placement.value = 3;
  expect(validateFigureTemplate(template).ok).toBe(true);
  const failure = renderFigureSvg(template, data);
  expect(failure.ok).toBe(false);
  expect(failure.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/交叉.*范围/),
    }),
  );
});

it('applies category affixes and wrapping on the normal bar chart path', () => {
  const template = chartTemplate('bar'),
    axis = template.panels[0]!.axes[0]!;
  Object.assign(axis.tickLabels, { prefix: '[', suffix: ']', wrapWidthPt: 15 });
  const { doc } = render(
    template,
    chartData({ category: ['Alpha', 'Beta'], value: [1, 2] }),
  );
  const labels = group(doc).querySelectorAll('[data-role="tick-label"]');
  expect(Array.from(labels, (e) => e.textContent)).toEqual([
    '[Alpha]',
    '[Beta]',
  ]);
  expect(labels[0]!.querySelectorAll('tspan').length).toBeGreaterThan(1);
});

it('keeps existing category newlines as raw SVG text when only label styles or affixes change', () => {
  const template = chartTemplate('bar'),
    axis = template.panels[0]!.axes[0]!,
    binding = chartData({ category: ['Alpha\nBeta', 'Gamma'], value: [1, 2] });
  const baseline = group(render(template, binding).doc).querySelector(
    '[data-role="tick-label"]',
  )!;
  expect(baseline.querySelector('tspan')).toBeNull();
  Object.assign(axis.tickLabels, {
    bold: true,
    italic: true,
    background: 'white',
    prefix: '[',
    suffix: ']',
  });
  const label = group(render(template, binding).doc).querySelector(
    '[data-role="tick-label"]',
  )!;
  expect(label.querySelector('tspan')).toBeNull();
  expect(label.textContent).toBe('[Alpha\nBeta]');
  expect(label.getAttribute('font-weight')).toBe('bold');
  expect(label.getAttribute('font-style')).toBe('italic');
  expect(label.getAttribute('x')).toBe(baseline.getAttribute('x'));
  expect(label.getAttribute('y')).toBe(baseline.getAttribute('y'));
});

it('preserves explicit category line breaks when label layout is deliberately enabled', () => {
  const template = chartTemplate('bar'),
    axis = template.panels[0]!.axes[0]!;
  axis.tickLabels.lineHeight = 2;
  const label = group(
    render(template, chartData({ category: ['Alpha\nBeta'], value: [1] })).doc,
  ).querySelector('[data-role="tick-label"]')!;
  expect(
    Array.from(label.querySelectorAll('tspan'), (line) => line.textContent),
  ).toEqual(['Alpha', 'Beta']);
});

it('checks grid tick budgets and label overflow on data-derived automatic axes at runtime', () => {
  const template = fixture(),
    axis = template.panels[0]!.axes[0]!;
  axis.range = { mode: 'auto' };
  axis.minorTicks.count = 10000;
  axis.grid = { minor: grid };
  let failure = renderFigureSvg(template, data);
  expect(failure.ok).toBe(false);
  expect(failure.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/10000/),
    }),
  );
  axis.minorTicks.count = 0;
  delete axis.grid;
  axis.tickLabels.divisor = Number.MIN_VALUE;
  failure = renderFigureSvg(template, data);
  expect(failure.ok).toBe(false);
  expect(failure.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/显示值.*浮点/),
    }),
  );
});

it('defers unresolved automatic crossings on truly empty layers without drawing a substitute frame axis or suppressing other fixed axes', () => {
  const template = fixture(),
    panel = template.panels[0]!,
    [x, y] = panel.axes;
  const top = structuredClone(x!);
  top.axisId = 'axis-top';
  top.position = 'top';
  top.title!.text = 'Known top';
  panel.axes.push(top);
  panel.plotSlots = [];
  template.dataSlots = [];
  y!.range = { mode: 'auto' };
  x!.placement = { mode: 'cross', axisId: y!.axisId, value: 2 };
  x!.grid = { major: grid };
  const { doc } = render(template, chartData({}));
  expect(doc.querySelectorAll('[data-role="axes"] > g')).toHaveLength(1);
  expect(doc.querySelector('[data-role="axis-title"]')!.textContent).toBe(
    'Known top',
  );
  expect(doc.querySelectorAll('[data-role="axis-grid"]')).toHaveLength(0);
});

it('still validates an empty layer source axis when its automatic crossing target is unresolved', () => {
  const template = fixture(),
    panel = template.panels[0]!,
    [x, y] = panel.axes;
  panel.plotSlots = [];
  template.dataSlots = [];
  y!.range = { mode: 'auto' };
  x!.placement = { mode: 'cross', axisId: y!.axisId, value: 2 };
  x!.minorTicks.count = 10000;
  x!.grid = { minor: grid };
  let result = renderFigureSvg(template, chartData({}));
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/10000/),
    }),
  );
  x!.minorTicks.count = 0;
  delete x!.grid;
  x!.tickLabels.divisor = Number.MIN_VALUE;
  result = renderFigureSvg(template, chartData({}));
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/显示值.*浮点/),
    }),
  );
});

it('reports an unavailable automatic crossing target when the layer contains valid curves', () => {
  const template = fixture(),
    panel = template.panels[0]!,
    [x, y] = panel.axes;
  y!.range = { mode: 'fixed', min: -2, max: -1 };
  const target = structuredClone(y!);
  target.axisId = 'axis-log';
  target.position = 'right';
  target.scale = 'log10';
  target.range = { mode: 'auto' };
  target.visible = false;
  panel.axes.push(target);
  x!.placement = { mode: 'cross', axisId: target.axisId, value: 1 };
  const result = renderFigureSvg(
    template,
    chartData({ x: [0, 1000, 2000], y: [-2, -1, -1.5] }),
  );
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/交叉.*范围/),
    }),
  );
});

it('keeps persisted appearance independent across four sides with reverse, logarithmic crossings and screen-positioned titles', () => {
  const template = fixture(),
    panel = template.panels[0]!,
    [x, y] = panel.axes;
  y!.scale = 'log10';
  y!.range = { mode: 'fixed', min: 0.1, max: 10 };
  y!.reverse = true;
  y!.majorTicks.direction = 'both';
  y!.majorTicks.color = '#2222ff';
  y!.title!.position = 0.25;
  x!.placement = { mode: 'cross', axisId: y!.axisId, value: 1 };
  x!.majorTicks.direction = 'in';
  x!.grid = { major: grid };
  const top = structuredClone(x!);
  top.axisId = 'axis-top';
  top.position = 'top';
  top.scale = 'ln';
  top.range = { mode: 'fixed', min: 1, max: Math.exp(2) };
  top.reverse = true;
  top.placement = { mode: 'percent', percent: 25, offsetPt: 4 };
  top.majorTicks.generation = { mode: 'endpoints' };
  top.majorTicks.direction = 'both';
  top.tickLabels.prefix = 'n:';
  top.minorTicks.count = 1;
  top.grid = { minor: grid, layer: 'front' };
  const right = structuredClone(y!);
  right.axisId = 'axis-right';
  right.position = 'right';
  right.scale = 'linear';
  right.range = { mode: 'fixed', min: -5, max: 5 };
  right.reverse = false;
  right.placement = {
    mode: 'cross',
    axisId: x!.axisId,
    value: 1000,
    offsetPt: 2,
  };
  right.majorTicks.direction = 'in';
  right.title!.position = 0.75;
  panel.axes.push(top, right);
  const original = structuredClone(template),
    binding = chartData({ x: [0, 1000, 2000], y: [0.1, 1, 10] });
  const { doc } = render(template, binding),
    groups = doc.querySelectorAll('[data-role="axes"] > g');
  expect(groups).toHaveLength(4);
  expect(
    Array.from(groups, (node) => {
      const line = node.querySelector('[data-role="axis-line"]')!;
      return ['x1', 'y1', 'x2', 'y2'].map((name) => line.getAttribute(name));
    }),
  ).toEqual([
    ['50', '190', '400', '190'],
    ['50', '60', '50', '320'],
    ['50', '121', '400', '121'],
    ['227', '60', '227', '320'],
  ]);
  expect(
    Array.from(
      groups[2]!.querySelectorAll('[data-role="tick-label"]'),
      (node) => [node.textContent, node.getAttribute('x')],
    ),
  ).toEqual([
    ['n:1', '400'],
    ['n:' + String(Math.exp(2)), '50'],
  ]);
  expect(
    groups[1]!
      .querySelector('[data-role="major-tick"]')!
      .getAttribute('stroke'),
  ).toBe('#2222ff');
  expect(
    groups[1]!.querySelector('[data-role="axis-title"]')!.getAttribute('y'),
  ).toBe('125');
  expect(
    groups[3]!.querySelector('[data-role="axis-title"]')!.getAttribute('y'),
  ).toBe('255');
  const control = structuredClone(template);
  for (const axis of control.panels[0]!.axes) {
    delete axis.placement;
    delete axis.grid;
  }
  expect(doc.querySelector('[data-role="plots"]')!.outerHTML).toBe(
    render(control, binding).doc.querySelector('[data-role="plots"]')!
      .outerHTML,
  );
  expect(template).toEqual(original);
});
