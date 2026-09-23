// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderTemplateSvg } from '../packages/svg-renderer/src/render.js';
import {
  validateRequest,
  validateSvg,
} from '../packages/export-service/src/security.js';
import {
  convertFigure,
  findInkscape,
} from '../packages/export-service/src/converter.js';
import {
  createSvgBlob,
  preparePng,
} from '../packages/web-editor/src/browser/figure-export.js';
import { chartData, chartTemplate } from './helpers/chart-fixtures.js';

function f6Svg() {
  const template: any = chartTemplate('heatmap'),
    plot = template.panels[0].plotSlots[0];
  plot.heatmap = {
    missingColor: '#eeeeee',
    labels: true,
    interpolation: 'bilinear',
    dataRegion: 'matrix',
  };
  Object.assign(plot.colorScale, {
    interpolation: 'discrete',
    transform: 'linear',
  });
  Object.assign(plot.colorScale.colorbar, {
    visible: true,
    orientation: 'horizontal',
    side: 'bottom',
    length: 0.8,
    widthPt: 12,
    majorTicks: 4,
    minorTicks: 2,
    notation: 'fixed',
    precision: 2,
    endpoints: 'triangles',
    mode: 'independent',
    range: { min: 0, max: 3 },
  });
  const rendered = renderTemplateSvg(
    template,
    chartData({ x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [0, 1, 2, 3] }),
  );
  expect(rendered.ok, JSON.stringify(rendered.diagnostics)).toBe(true);
  if (!rendered.ok) throw new Error('render failed');
  return rendered.svg;
}

it('keeps F6 SVG valid for SVG, PNG, PDF and flattened EPS export paths', () => {
  const svg = f6Svg(),
    meta = validateSvg(svg);
  expect(meta.widthPt).toBeGreaterThan(0);
  expect(createSvgBlob(svg).type).toContain('image/svg+xml');
  expect(preparePng(svg, 2)).toMatchObject({ width: 2000 });
  expect(
    validateRequest({
      svg,
      format: 'pdf',
      dpi: 600,
      textToPath: false,
      flattenTransparency: false,
    }).format,
  ).toBe('pdf');
  expect(
    validateRequest({
      svg,
      format: 'eps',
      dpi: 600,
      textToPath: true,
      flattenTransparency: true,
    }).format,
  ).toBe('eps');
});

const inkscape = await findInkscape().catch(() => undefined);
it.runIf(Boolean(inkscape))(
  'converts an F6 figure to real PDF and flattened EPS files',
  async () => {
    const svg = f6Svg(),
      pdf = await convertFigure(
        {
          svg,
          format: 'pdf',
          dpi: 300,
          textToPath: false,
          flattenTransparency: false,
        },
        { executable: inkscape! },
      ),
      eps = await convertFigure(
        {
          svg,
          format: 'eps',
          dpi: 300,
          textToPath: true,
          flattenTransparency: true,
        },
        { executable: inkscape! },
      );
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(eps.subarray(0, 11).toString()).toBe('%!PS-Adobe-');
  },
  60_000,
);
