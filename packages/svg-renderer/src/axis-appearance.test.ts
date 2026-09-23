// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { chartTemplate } from '../../../tests/helpers/chart-fixtures.js';
import { renderAxis } from './axis.js';
import { renderAxisAppearance } from './axis-appearance.js';
import { createScale } from './scales.js';
import { validateSvg } from '../../export-service/src/security.js';

const rect = { x: 30, y: 40, width: 300, height: 160 };
function sample() {
  const axis = chartTemplate('xy').panels[0]!.axes[0]!;
  axis.title = {
    format: 'plain',
    text: 'X',
    fontFamily: 'Arial',
    fontSizePt: 12,
    color: '#111111',
  };
  axis.range = { mode: 'fixed', min: 0, max: 2000 };
  axis.majorTicks.generation = { mode: 'increment', step: 1000 };
  axis.majorTicks.lengthPt = 6;
  axis.minorTicks = { ...axis.minorTicks, visible: false, count: 1 };
  const scale = createScale(axis, 0, 2000)!;
  return { axis, scale };
}
function svg(body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="500pt" height="400pt" viewBox="0 0 500 400">${body}</svg>`;
}
function document(body: string) {
  return new DOMParser().parseFromString(svg(body), 'image/svg+xml');
}

it('keeps the original render path when appearance is omitted', () => {
  const { axis, scale } = sample();
  expect(renderAxisAppearance(axis, rect, scale)).toEqual({
    axisSvg: renderAxis(axis, rect, scale),
    gridSvg: '',
    gridLayer: 'back',
  });
});
it('hides only the axis line and renders independent inward ticks', () => {
  const { axis, scale } = sample();
  const output = renderAxisAppearance(axis, rect, scale, {
    lineVisible: false,
    majorTicks: { direction: 'in', color: '#ff0000' },
  });
  const doc = document(output.axisSvg);
  expect(doc.querySelector('[data-role="axis-line"]')).toBeNull();
  expect(doc.querySelectorAll('[data-role="tick-label"]')).toHaveLength(3);
  expect(doc.querySelector('[data-role="axis-title"]')).not.toBeNull();
  const tick = doc.querySelector('[data-role="major-tick"]')!;
  expect(tick.getAttribute('stroke')).toBe('#ff0000');
  expect(tick.getAttribute('y1')).toBe('200');
  expect(tick.getAttribute('y2')).toBe('194');
});
it('scales and styles only labels while preserving all tick locations and XML escaping', () => {
  const { axis, scale } = sample();
  const before = document(renderAxis(axis, rect, scale));
  const output = renderAxisAppearance(axis, rect, scale, {
    tickLabels: {
      divisor: 1000,
      prefix: '<&',
      suffix: 'k',
      bold: true,
      italic: true,
      rotation: 30,
      background: 'white',
    },
  });
  const doc = document(output.axisSvg);
  expect(
    Array.from(
      doc.querySelectorAll('[data-role="tick-label"]'),
      (x) => x.textContent,
    ),
  ).toEqual(['<&0k', '<&1k', '<&2k']);
  expect(
    Array.from(
      doc.querySelectorAll('[data-role="major-tick"]'),
      (x) => x.outerHTML,
    ),
  ).toEqual(
    Array.from(
      before.querySelectorAll('[data-role="major-tick"]'),
      (x) => x.outerHTML,
    ),
  );
  const label = doc.querySelector('[data-role="tick-label"]')!;
  expect(label.getAttribute('font-weight')).toBe('bold');
  expect(label.getAttribute('font-style')).toBe('italic');
  expect(label.getAttribute('transform')).toMatch(/^rotate\(30 /);
  expect(
    doc.querySelectorAll('[data-role="tick-label-background"]'),
  ).toHaveLength(3);
  expect(() => validateSvg(svg(output.axisSvg))).not.toThrow();
});
it('renders minor grids with hidden minor tick lines and keeps their plan positions', () => {
  const { axis, scale } = sample();
  const output = renderAxisAppearance(axis, rect, scale, {
    grid: {
      minor: { visible: true, color: '#cccccc', widthPt: 0.5, dash: 'dotted' },
      layer: 'front',
    },
  });
  expect(output.gridLayer).toBe('front');
  const doc = document(output.axisSvg + output.gridSvg);
  expect(doc.querySelectorAll('[data-role="minor-tick"]')).toHaveLength(0);
  const lines = doc.querySelectorAll('[data-role="minor-grid"]');
  expect(lines).toHaveLength(2);
  expect(Array.from(lines, (x) => x.getAttribute('x1'))).toEqual([
    '105',
    '255',
  ]);
  expect(doc.querySelector('[clip-path]')).not.toBeNull();
});
it('positions interval labels at mapped midpoints without changing major tick positions', () => {
  const { axis, scale } = sample();
  const doc = document(
    renderAxisAppearance(axis, rect, scale, {
      tickLabels: { position: 'interval', anchor: 'start' },
    }).axisSvg,
  );
  expect(
    Array.from(doc.querySelectorAll('[data-role="tick-label"]'), (x) => [
      x.textContent,
      x.getAttribute('x'),
      x.getAttribute('text-anchor'),
    ]),
  ).toEqual([
    ['0', '105', 'start'],
    ['1000', '255', 'start'],
  ]);
  expect(doc.querySelectorAll('[data-role="major-tick"]')).toHaveLength(3);
});
it('moves the title with the axis and keeps its screen position independent of data reversal', () => {
  const { axis, scale } = sample();
  const doc = document(
    renderAxisAppearance(axis, rect, scale, {
      placement: { mode: 'percent', percent: 50 },
      title: {
        position: 0.25,
        offsetPt: { x: 3, y: 4 },
        rotation: 20,
        bold: true,
      },
    }).axisSvg,
  );
  const line = doc.querySelector('[data-role="axis-line"]')!;
  expect(line.getAttribute('y1')).toBe('120');
  const title = doc.querySelector('[data-role="axis-title"]')!;
  expect(title.getAttribute('x')).toBe('108');
  expect(title.getAttribute('y')).toBe('162');
  expect(title.getAttribute('transform')).toBe('rotate(20 108 162)');
});
