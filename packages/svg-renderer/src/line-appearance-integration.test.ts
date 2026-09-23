import { expect, it } from 'vitest';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from './render.js';
import { legendSample } from './legend-sample.js';

const advanced = {
  cap: 'round',
  join: 'bevel',
  miterLimit: 4,
  opacity: 0.625,
  customDash: { lengthsPt: [8, 3, 1, 3], offsetPt: -0.5 },
};
it.each(['xy', 'area', 'box', 'contour'])(
  'renders %s advanced strokes and legend without changing fills or markers',
  (kind) => {
    const template = chartTemplate(kind),
      plot = template.panels[0]!.plotSlots[0]!;
    Object.assign((plot as any).lineStyle, advanced);
    plot.legendEntry.visible = true;
    const data =
      kind === 'box'
        ? { values: [1, 2, 3, 4, 100] }
        : kind === 'contour'
          ? { x: [0, 1, 0, 1], y: [0, 0, 1, 1], z: [1, 2, 3, 4] }
          : { x: [0, 1, 2], y: [1, 3, 2] };
    const result = renderTemplateSvg(template, chartData(data));
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toContain(
      kind === 'box' ? 'data-role="legend-box"' : 'data-role="legend-line"',
    );
    for (const svg of [result.svg, legendSample(plot, 24)]) {
      expect(svg).toContain('stroke-dasharray="8 3 1 3"');
      expect(svg).toContain('stroke-dashoffset="-0.5"');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="bevel"');
      expect(svg).toContain('stroke-opacity="0.625"');
    }
    const independent =
      result.svg.match(
        /<(?:g|rect|circle|path)[^>]*data-role="(?:marker|area|box-body|box-outlier|error-bar)[^"]*"[^>]*>/g,
      ) ?? [];
    for (const mark of independent)
      expect(mark).not.toMatch(
        /stroke-opacity|stroke-dasharray|stroke-linecap/,
      );
  },
);
it.each(['xy', 'area', 'box', 'contour'])(
  'keeps %s legacy samples free of new attributes',
  (kind) => {
    const plot = chartTemplate(kind).panels[0]!.plotSlots[0]!;
    expect(legendSample(plot, 24)).not.toMatch(
      /stroke-linecap|stroke-linejoin|stroke-opacity|stroke-miterlimit/,
    );
  },
);
