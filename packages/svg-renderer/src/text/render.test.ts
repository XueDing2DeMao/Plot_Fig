// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { layoutText } from './layout.js';
import { renderText } from './render.js';

const font = { fontFamily: 'Arial', fontSizePt: 10, color: '#123456' };
it('escapes text and attributes and renders explicit script baselines', () => {
  const layout = layoutText('A^{2}\n<&', font, { format: 'rich' });
  const svg = renderText(layout, 'annotation-text');
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    'image/svg+xml',
  );
  expect(doc.querySelector('parsererror')).toBeNull();
  expect(doc.querySelector('text')!.textContent).toBe('A2<&');
  expect(
    doc.querySelector('[data-script="super"]')!.getAttribute('font-size'),
  ).toBe('7');
  expect(
    Number(doc.querySelector('[data-script="super"]')!.getAttribute('y')),
  ).toBe(-4);
});

it('lets the SVG text cursor place adjacent scripts after the actual base glyphs', () => {
  const layout = layoutText('CO_{2}m^{2}', font, {
    format: 'rich',
    x: 4,
    y: 20,
  });
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${renderText(layout, 'legend-label')}</svg>`,
    'image/svg+xml',
  );
  const runs = [...doc.querySelectorAll('tspan')];
  expect(runs.map((run) => run.textContent)).toEqual(['CO', '2', 'm', '2']);
  expect(runs.map((run) => run.getAttribute('x'))).toEqual([
    '4',
    null,
    null,
    null,
  ]);
  expect(runs.map((run) => run.getAttribute('y'))).toEqual([
    '20',
    '22',
    '20',
    '16',
  ]);
});

it('keeps adjacent scripts in one measured text flow beside inline math', () => {
  const layout = layoutText(
    String.raw`CO_{2} \(x_i\)`,
    font,
    { format: 'rich', x: 4, y: 20 },
    {
      measureMath: () => ({
        advanceWidth: 8,
        ascent: 8,
        descent: 2,
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -800 800 1000"></svg>',
      }),
    },
  );
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${renderText(layout, 'legend-label')}</svg>`,
    'image/svg+xml',
  );
  const textGroup = doc.querySelector('[data-role="legend-label"] > text')!;
  const textRuns = [...textGroup.querySelectorAll('tspan')];
  expect(textGroup.textContent).toBe('CO2 ');
  expect(textGroup.getAttribute('lengthAdjust')).toBe('spacingAndGlyphs');
  expect(Number(textGroup.getAttribute('textLength'))).toBeCloseTo(22.2);
  expect(textRuns.map((run) => run.getAttribute('x'))).toEqual([
    null,
    null,
    null,
  ]);
  expect(doc.querySelectorAll('[data-role="legend-label"] > svg')).toHaveLength(
    1,
  );
});

it('uses the same pivot for background, border and text', () => {
  const svg = renderText(
    layoutText('A\nB', font, {
      x: 12,
      y: 20,
      rotation: 30,
      background: '#fff',
      border: { widthPt: 2, color: '#333' },
    }),
    'axis-title',
  );
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`,
    'image/svg+xml',
  );
  expect(doc.querySelector('rect')!.getAttribute('transform')).toBe(
    'rotate(30 12 20)',
  );
  expect(doc.querySelector('text')!.getAttribute('transform')).toBe(
    'rotate(30 12 20)',
  );
  expect(doc.querySelectorAll('tspan')).toHaveLength(2);
});

it.each([
  ['middle', 'center', 91],
  ['end', 'right', 82],
] as const)(
  'positions a single plain line with %s anchor inside its layout box',
  (anchor, align, expectedX) => {
    const layout = layoutText('ABC', font, {
      x: 100,
      y: 30,
      anchor,
      align,
      format: 'plain',
      background: '#fff',
      rotation: 20,
    });
    const doc = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${renderText(layout, 'annotation-text')}</svg>`,
      'image/svg+xml',
    );
    expect(Number(doc.querySelector('text')!.getAttribute('x'))).toBe(
      expectedX,
    );
    expect(doc.querySelector('text')!.getAttribute('transform')).toBe(
      'rotate(20 100 30)',
    );
    expect(Number(doc.querySelector('rect')!.getAttribute('x'))).toBe(
      expectedX,
    );
  },
);
