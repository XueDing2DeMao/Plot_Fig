// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { defaultTextStyle } from '@plot-fig/figure-schema';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from './render.js';

it('uses the shared measured layout for titles, ticks, legends and annotations', () => {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  panel.axes[0]!.title = {
    text: '横轴\n单位',
    format: 'plain',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
    bold: false,
  };
  panel.axes[0]!.tickLabels.wrapWidthPt = 20;
  panel.plotSlots[0]!.legendEntry.visible = true;
  panel.plotSlots[0]!.legendEntry.text = '曲线\n一';
  template.annotations.push({
    annotationId: 'note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: '说明\n两行',
    format: 'plain',
    textStyle: defaultTextStyle(),
  });
  const output = renderTemplateSvg(
    template,
    chartData({ x: [0, 1], y: [1, 2] }),
  );
  expect(output.ok).toBe(true);
  if (!output.ok) return;
  const document = new DOMParser().parseFromString(output.svg, 'image/svg+xml');
  const title = document.querySelector('[data-role="axis-title"]')!;
  const tick = document.querySelector('[data-role="tick-label"]')!;
  const legend = document.querySelector('[data-role="legend-entry"] text')!;
  const annotation = document.querySelector('[data-role="annotation-text"]')!;
  expect(title.querySelectorAll('tspan')).toHaveLength(2);
  expect(legend.querySelectorAll('tspan')).toHaveLength(2);
  expect(annotation.querySelectorAll('tspan')).toHaveLength(2);
});

it('renders existing latex titles and annotations as self-contained SVG paths', () => {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  panel.axes[0]!.title = {
    text: String.raw`\frac{x_i}{2}`,
    format: 'latex',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
  };
  template.annotations.push({
    annotationId: 'formula-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: String.raw`\sqrt{x}`,
    format: 'latex',
    textStyle: defaultTextStyle(),
  });
  const output = renderTemplateSvg(
    template,
    chartData({ x: [0, 1], y: [1, 2] }),
  );
  expect(output.ok).toBe(true);
  if (!output.ok) return;
  const document = new DOMParser().parseFromString(output.svg, 'image/svg+xml');
  for (const role of ['axis-title', 'annotation-text']) {
    const formula = document.querySelector(`[data-role="${role}"]`)!;
    expect(formula.localName).toBe('g');
    expect(formula.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(formula.textContent).not.toContain('frac');
  }
  expect(output.svg).not.toContain('LaTeX 注释按原始文字显示');
});

it('applies rich scripts and the same box layout to every text consumer', () => {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  const layout = {
    paddingPt: { top: 1, right: 2, bottom: 1, left: 2 },
    background: '#ffffff',
    border: { widthPt: 0.5, color: '#222222' },
  } as const;
  panel.axes[0]!.title = {
    text: String.raw`x_{2}`,
    format: 'rich',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
    layout,
  };
  panel.axes[0]!.tickLabels = {
    ...panel.axes[0]!.tickLabels,
    color: '#aa3377',
    fontFamily: 'Georgia',
    prefix: 'v_{',
    suffix: '}',
    textFormat: 'rich',
    layout,
  };
  panel.plotSlots[0]!.legendEntry = {
    visible: true,
    text: String.raw`L_{1}`,
    format: 'rich',
  };
  template.annotations.push({
    annotationId: 'rich-legend',
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId: panel.panelId,
    visible: true,
    position: { x: 1, y: 1 },
    textStyle: { ...defaultTextStyle(), layout },
  });
  template.annotations.push({
    annotationId: 'rich-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: String.raw`CO_{2}`,
    format: 'rich',
    textStyle: { ...defaultTextStyle(), layout },
  });

  const output = renderTemplateSvg(
    template,
    chartData({ x: [0, 1], y: [1, 2] }),
  );
  expect(output.ok).toBe(true);
  if (!output.ok) return;
  const document = new DOMParser().parseFromString(output.svg, 'image/svg+xml');
  const richTick = document.querySelector('[data-role="tick-label"]')!;
  expect(richTick.getAttribute('fill')).toBe('#aa3377');
  expect(richTick.getAttribute('font-family')).toBe('Georgia');
  for (const role of [
    'axis-title',
    'tick-label',
    'legend-label',
    'annotation-text',
  ]) {
    const text = document.querySelector(`[data-role="${role}"]`)!;
    expect(text.getAttribute('data-text-layout')).toBe('shared');
    expect(text.querySelector('[data-script="sub"]')).not.toBeNull();
    expect(text.querySelector('[data-script="sub"]')!.hasAttribute('x')).toBe(
      false,
    );
    expect(
      document.querySelector(`[data-role="${role}-box"]`),
      `${role} should use the shared box layout`,
    ).not.toBeNull();
  }
});

it('auto-detects formulas and braced scripts without consuming bare underscore or caret text', () => {
  const template = chartTemplate('xy');
  const panel = template.panels[0]!;
  panel.axes[0]!.title = {
    text: String.raw`\frac{x_i}{2}`,
    format: 'auto',
    fontFamily: 'Arial',
    fontSizePt: 10,
    color: '#222222',
  };
  panel.axes[0]!.tickLabels = {
    ...panel.axes[0]!.tickLabels,
    prefix: 'sample_',
    suffix: '^raw',
    textFormat: 'auto',
  };
  panel.plotSlots[0]!.legendEntry = {
    visible: true,
    text: '$x_i^2$',
    format: 'auto',
  };
  template.annotations.push({
    annotationId: 'auto-note',
    kind: 'text',
    coordinateSpace: 'page',
    position: { x: 0.2, y: 0.8 },
    text: 'CO_{2}',
    format: 'auto',
    textStyle: defaultTextStyle(),
  });

  const output = renderTemplateSvg(
    template,
    chartData({ x: [0, 1], y: [1, 2] }),
  );
  expect(output.ok).toBe(true);
  if (!output.ok) return;
  const document = new DOMParser().parseFromString(output.svg, 'image/svg+xml');
  expect(
    document.querySelectorAll('[data-role="axis-title"] path').length,
  ).toBeGreaterThan(0);
  expect(
    document.querySelectorAll('[data-role="legend-label"] path').length,
  ).toBeGreaterThan(0);
  expect(
    document.querySelector('[data-role="annotation-text"] [data-script="sub"]')
      ?.textContent,
  ).toBe('2');
  expect(
    document.querySelector('[data-role="tick-label"]')?.textContent,
  ).toContain('sample_0^raw');
});
