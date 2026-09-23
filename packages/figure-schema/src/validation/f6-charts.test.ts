import { expect, it } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { validateFigureTemplate } from './validate.js';

it('accepts F6 chart-specific settings and rejects invalid combinations', () => {
  const histogram: any = chartTemplate('histogram');
  histogram.panels[0].plotSlots[0] = {
    ...histogram.panels[0].plotSlots[0],
    bins: { mode: 'width', width: 0.5, start: 0, end: 3, scale: 'linear' },
    boundary: 'right',
    gap: 0.1,
    distribution: {
      visible: true,
      kind: 'kde',
      samples: 256,
      parameters: {},
      bandwidth: { method: 'silverman' },
      extendPercent: 300,
      normalize: 'density',
      symmetric: false,
    },
  };
  expect(validateFigureTemplate(histogram).issues).toEqual([]);
  histogram.panels[0].plotSlots[0].bins.end = -1;
  expect(
    validateFigureTemplate(histogram).issues.some((i) =>
      i.path.endsWith('/bins'),
    ),
  ).toBe(true);

  const box: any = chartTemplate('box');
  Object.assign(box.panels[0].plotSlots[0], {
    quantileMethod: 'type2',
    whiskerFactor: 2,
    boxRange: 'percentile',
    whiskerRange: 'percentile',
    percentileLow: 90,
    percentileHigh: 10,
  });
  expect(
    validateFigureTemplate(box).issues.some((i) =>
      i.path.endsWith('/percentileLow'),
    ),
  ).toBe(true);
});

it('accepts current color-scale and independent colorbar classification', () => {
  const heatmap: any = chartTemplate('heatmap');
  const scale = heatmap.panels[0].plotSlots[0].colorScale;
  Object.assign(scale, { transform: 'log10', interpolation: 'discrete' });
  Object.assign(scale.colorbar, {
    orientation: 'horizontal',
    side: 'bottom',
    length: 0.7,
    widthPt: 12,
    majorTicks: 5,
    minorTicks: 1,
    notation: 'scientific',
    precision: 3,
    endpoints: 'triangles',
    mode: 'independent',
    range: { min: 1, max: 4 },
  });
  heatmap.panels[0].plotSlots[0].heatmap = {
    missingColor: '#eeeeee',
    labels: true,
    interpolation: 'nearest',
    dataRegion: 'xyz',
  };
  expect(validateFigureTemplate(heatmap).issues).toEqual([]);
});

it('validates explicit distribution parameters and interval contour levels', () => {
  const histogram: any = chartTemplate('histogram');
  histogram.panels[0].plotSlots[0].distribution = {
    visible: true,
    kind: 'binomial',
    samples: 64,
    parameters: { trials: 10, p: 1.2 },
    extendPercent: 100,
    normalize: 'probability',
    symmetric: false,
  };
  expect(validateFigureTemplate(histogram).issues).toContainEqual(
    expect.objectContaining({
      path: expect.stringContaining('/distribution/parameters/p'),
    }),
  );
  const contour: any = chartTemplate('contour');
  contour.panels[0].plotSlots[0].levels = {
    mode: 'interval',
    start: 0,
    end: 100,
    step: 1,
  };
  expect(validateFigureTemplate(contour).issues).toContainEqual(
    expect.objectContaining({ path: expect.stringContaining('/levels/step') }),
  );
});

it('requires every parameter of a selected parametric distribution', () => {
  const histogram: any = chartTemplate('histogram');
  histogram.panels[0].plotSlots[0].distribution = {
    visible: true,
    kind: 'normal',
    samples: 64,
    parameters: {},
    extendPercent: 100,
    normalize: 'density',
    symmetric: false,
  };
  expect(validateFigureTemplate(histogram).issues).toContainEqual(
    expect.objectContaining({
      path: expect.stringContaining('/distribution/parameters/mu'),
    }),
  );
});

it('rejects unsupported notch confidence combinations', () => {
  const box: any = chartTemplate('box');
  box.panels[0].plotSlots[0].confidence = {
    visible: true,
    target: 'mean',
    method: 'notch',
    level: 0.9,
  };
  expect(validateFigureTemplate(box).issues).toContainEqual(
    expect.objectContaining({ path: expect.stringContaining('/confidence') }),
  );
});

it('requires the split binding when split distributions are enabled', () => {
  const box: any = chartTemplate('box');
  box.panels[0].plotSlots[0].distribution = {
    visible: true,
    kind: 'kde',
    samples: 64,
    parameters: {},
    bandwidth: { method: 'custom', value: 1 },
    extendPercent: 100,
    normalize: 'density',
    symmetric: false,
    side: 'split',
  };
  expect(validateFigureTemplate(box).issues).toContainEqual(
    expect.objectContaining({
      path: expect.stringContaining('/bindings/split'),
    }),
  );
});
