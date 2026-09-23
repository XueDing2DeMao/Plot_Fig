import { describe, expect, it } from 'vitest';
import { validTemplate } from '../schema/fixtures.js';
import { validateFigureTemplate } from './validate.js';

function template() {
  const value: any = structuredClone(validTemplate);
  value.schemaVersion = '1.22.0';
  value.panels[0].axes[1].range = { mode: 'fixed', min: -1, max: 1 };
  return value;
}

function axis(value: ReturnType<typeof template>) {
  return value.panels[0].axes[0];
}

function set(value: any, path: string, property: unknown) {
  const segments = path.split('.');
  let target = value;
  for (const segment of segments.slice(0, -1)) target = target[segment] ??= {};
  target[segments.at(-1)!] = property;
}

function title(value: ReturnType<typeof template>) {
  axis(value).title = {
    format: 'plain',
    text: 'X',
    fontFamily: 'Arial',
    fontSizePt: 12,
    color: '#111',
  };
}

function expectDomainFailure(value: unknown, path: string) {
  const result = validateFigureTemplate(value);
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
        path: '/panels/0/axes/0/' + path,
      }),
    );
}

describe('axis appearance schema 1.4.0', () => {
  it('accepts every appearance field without changing the supplied object', () => {
    const value = template();
    title(value);
    Object.assign(axis(value), {
      placement: { mode: 'percent', percent: 25, offsetPt: -6 },
      grid: {
        major: { visible: true, color: '#ccc', widthPt: 1, dash: 'dashed' },
        minor: { visible: false, color: '#eee', widthPt: 0.5, dash: 'dotted' },
        layer: 'front',
      },
    });
    Object.assign(axis(value).line, { visible: false });
    Object.assign(axis(value).majorTicks, { direction: 'both', color: '#f00' });
    Object.assign(axis(value).minorTicks, {
      direction: 'in',
      color: '#00f',
      lengthMode: 'auto',
    });
    Object.assign(axis(value).tickLabels, {
      notation: 'engineering',
      formula: 'abs(x)',
      prefix: '≈',
      suffix: 'k',
      divisor: 1000,
      bold: true,
      italic: true,
      background: 'white',
      anchor: 'end',
      position: 'interval',
      rotation: -45,
      offsetPt: { x: 3, y: -4 },
      wrapWidthPt: 48,
      lineHeight: 1.5,
      overlap: 'hide',
    });
    Object.assign(axis(value).title, {
      bold: true,
      italic: true,
      position: 0.75,
      rotation: 20,
      offsetPt: { x: 1, y: 2 },
    });
    const before = structuredClone(value);
    expect(validateFigureTemplate(value)).toEqual({
      ok: true,
      value,
      issues: [],
    });
    expect(value).toEqual(before);
  });

  it('does not insert defaults into old axis objects', () => {
    const value = template();
    const before = structuredClone(value);
    expect(validateFigureTemplate(value).ok).toBe(true);
    expect(value).toEqual(before);
    expect(axis(value)).not.toHaveProperty('grid');
    expect(axis(value)).not.toHaveProperty('placement');
    expect(axis(value).line).not.toHaveProperty('visible');
  });

  it.each([
    ['line.visible', 'false'],
    ['majorTicks.direction', 'none'],
    ['majorTicks.color', ''],
    ['minorTicks.direction', 'inside'],
    ['minorTicks.color', ''],
    ['minorTicks.lengthMode', 'relative'],
    ['grid.major', { visible: true, color: '#ccc', widthPt: 1 }],
    [
      'grid.major',
      { visible: true, color: '#ccc', widthPt: -1, dash: 'solid' },
    ],
    [
      'grid.minor',
      { visible: true, color: '#ccc', widthPt: 1, dash: 'custom' },
    ],
    ['grid.layer', 'above'],
    ['grid.extra', true],
    ['placement', { mode: 'percent', percent: -1 }],
    ['placement', { mode: 'percent', percent: 101 }],
    ['placement', { mode: 'cross', axisId: 'bad id', value: 0 }],
    ['placement', { mode: 'frame', value: 0 }],
    ['placement', { mode: 'frame', offsetPt: 14400.1 }],
    ['placement', { mode: 'cross', axisId: 'axis-y', value: Infinity }],
    ['tickLabels.prefix', 'x'.repeat(1025)],
    ['tickLabels.suffix', '<script>alert(1)</script>'],
    ['tickLabels.divisor', 0],
    ['tickLabels.divisor', -1],
    ['tickLabels.divisor', Infinity],
    ['tickLabels.rotation', -180.1],
    ['tickLabels.offsetPt', { x: 0 }],
    ['tickLabels.offsetPt', { x: 0, y: -14400.1 }],
    ['tickLabels.wrapWidthPt', 0],
    ['tickLabels.wrapWidthPt', 14401],
    ['tickLabels.lineHeight', 0.49],
    ['tickLabels.lineHeight', 5.01],
    ['tickLabels.background', 'transparent'],
    ['tickLabels.anchor', 'center'],
    ['tickLabels.position', 'end'],
    ['tickLabels.overlap', 'auto'],
    ['title.position', 1.01],
    ['title.rotation', 181],
    ['title.offsetPt', { x: NaN, y: 0 }],
    ['title.bold', 'bold'],
  ])('rejects invalid %s', (path, property) => {
    const value = template();
    title(value);
    set(axis(value), path as string, property);
    const result = validateFigureTemplate(value);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          code: 'FIGURE_SCHEMA_INVALID',
        }),
      );
  });

  it('accepts inclusive style bounds, literal escapes and Unicode character limits', () => {
    const value = template();
    title(value);
    Object.assign(axis(value).tickLabels, {
      prefix: '😀'.repeat(1024),
      suffix: '<&"',
      divisor: Number.MIN_VALUE,
      rotation: -180,
      offsetPt: { x: -14400, y: 14400 },
      wrapWidthPt: 14400,
      lineHeight: 0.5,
    });
    Object.assign(axis(value).title, {
      position: 1,
      rotation: 180,
      offsetPt: { x: 14400, y: -14400 },
    });
    axis(value).placement = { mode: 'percent', percent: 100, offsetPt: 14400 };
    expect(validateFigureTemplate(value).ok).toBe(true);
    axis(value).tickLabels.lineHeight = 5;
    axis(value).title.position = 0;
    axis(value).placement.percent = 0;
    expect(validateFigureTemplate(value).ok).toBe(true);
  });
});

describe('axis placement and category domains', () => {
  it.each([-1, 0, 1])(
    'accepts in-range orthogonal crossings including endpoint %s',
    (value) => {
      const input = template();
      axis(input).placement = {
        mode: 'cross',
        axisId: 'axis-y',
        value,
        offsetPt: -10,
      };
      expect(validateFigureTemplate(input).ok).toBe(true);
    },
  );

  it.each(['missing', 'axis-x', 'other-panel-y'])(
    'rejects reference %s with a precise path',
    (axisId) => {
      const input = template();
      const source = input.panels[0].axes[1];
      input.panels.push({
        ...structuredClone(input.panels[0]),
        panelId: 'other-panel',
        axes: [
          {
            ...structuredClone(input.panels[0].axes[0]),
            axisId: 'other-panel-x',
          },
          { ...structuredClone(source), axisId: 'other-panel-y' },
        ],
        plotSlots: [],
      });
      axis(input).placement = { mode: 'cross', axisId, value: 0 };
      expectDomainFailure(input, 'placement/axisId');
    },
  );

  it.each([-2, 2])(
    'rejects crossing %s outside the target fixed range',
    (value) => {
      const input = template();
      axis(input).placement = { mode: 'cross', axisId: 'axis-y', value };
      expectDomainFailure(input, 'placement/value');
    },
  );

  it.each(['log10', 'ln'])(
    'requires positive raw crossings on %s even before an auto domain is known',
    (scale) => {
      const input = template();
      Object.assign(input.panels[0].axes[1], {
        scale,
        range: { mode: 'auto' },
      });
      for (const value of [0, -1]) {
        axis(input).placement = { mode: 'cross', axisId: 'axis-y', value };
        expectDomainFailure(input, 'placement/value');
      }
      axis(input).placement.value = 0.1;
      expect(validateFigureTemplate(input).ok).toBe(true);
    },
  );

  it('defers unknown automatic bounds and allows independent mutual crossings', () => {
    const input = template();
    input.panels[0].axes[1].range = { mode: 'auto' };
    axis(input).placement = { mode: 'cross', axisId: 'axis-y', value: 1e6 };
    input.panels[0].axes[1].placement = {
      mode: 'cross',
      axisId: 'axis-x',
      value: -1e6,
    };
    expect(validateFigureTemplate(input).ok).toBe(true);
  });

  it('rejects crossing a category target but allows a category source to cross a numeric target', () => {
    const input = template();
    input.panels[0].plotSlots = [];
    Object.assign(input.panels[0].axes[1], {
      scale: 'category',
      range: { mode: 'auto' },
    });
    axis(input).placement = { mode: 'cross', axisId: 'axis-y', value: 0 };
    expectDomainFailure(input, 'placement/axisId');
    input.panels[0].axes[1].scale = 'linear';
    axis(input).scale = 'category';
    expect(validateFigureTemplate(input).ok).toBe(true);
  });

  it('keeps legacy category notations while rejecting newly numeric-only label settings', () => {
    const input = template();
    input.panels[0].plotSlots = [];
    axis(input).scale = 'category';
    Object.assign(axis(input).tickLabels, {
      prefix: 'Class ',
      suffix: '!',
      bold: true,
      italic: true,
      background: 'white',
      wrapWidthPt: 30,
      position: 'interval',
      divisor: 1,
    });
    for (const notation of ['auto', 'fixed', 'scientific']) {
      axis(input).tickLabels.notation = notation;
      expect(validateFigureTemplate(input).ok).toBe(true);
    }
    axis(input).tickLabels.notation = 'engineering';
    expectDomainFailure(input, 'tickLabels/notation');
    axis(input).tickLabels.notation = 'auto';
    axis(input).tickLabels.divisor = 2;
    expectDomainFailure(input, 'tickLabels/divisor');
    axis(input).tickLabels.divisor = 1;
    axis(input).tickLabels.formula = 'x*2';
    expectDomainFailure(input, 'tickLabels/formula');
  });

  it('accepts non-monotonic numeric label formulas and rejects invalid syntax', () => {
    const input = template();
    axis(input).tickLabels.formula = 'abs(x)';
    expect(validateFigureTemplate(input).ok).toBe(true);
    axis(input).tickLabels.formula = 'globalThis.process.exit()';
    expectDomainFailure(input, 'tickLabels/formula');
  });
});
