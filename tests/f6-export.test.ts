// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { renderTemplateSvg } from '../packages/svg-renderer/src/render.js';
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

it('keeps F6 SVG valid for SVG and PNG export paths', () => {
  const svg = f6Svg(),
    doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  expect(doc.querySelector('parsererror')).toBeNull();
  expect(doc.documentElement.localName).toBe('svg');
  expect(doc.querySelector('script, foreignObject')).toBeNull();
  expect(createSvgBlob(svg).type).toContain('image/svg+xml');
  expect(preparePng(svg, 2)).toMatchObject({ width: 2000 });
});
