import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import {
  createCurrentDocument,
  createCurrentTemplate,
} from '../../../tests/helpers/figure-payloads.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import { renderFigureSvg } from './index.js';
import { legendSample } from './legend-sample.js';
import { figureCoordinates } from './figure-coordinates.js';

const extras = {
  closeLine: true,
  symbolGapPct: 25,
  lineArrows: { position: 'both', lengthPt: 5, angleDeg: 40 },
  dropLines: { vertical: { target: { mode: 'value', value: -0.5 } } },
};
it.each(['figure-template', 'figure-document'])(
  'migrates 1.11 %s changing only versions',
  (kind) => {
    const input: any =
      kind === 'figure-template'
        ? createCurrentTemplate()
        : createCurrentDocument();
    input.schemaVersion = '1.11.0';
    if (input.templateSnapshot) input.templateSnapshot.schemaVersion = '1.11.0';
    const before = structuredClone(input),
      expected = structuredClone(input);
    expected.schemaVersion = '1.21.0';
    if (expected.templateSnapshot)
      expected.templateSnapshot.schemaVersion = '1.21.0';
    const loaded = loadFigurePayload(input);
    expect(loaded).toMatchObject({ ok: true, value: expected });
    expect(input).toEqual(before);
    Object.assign(
      (input.templateSnapshot ?? input).panels[0].plotSlots[0],
      extras,
    );
    expect(loadFigurePayload(input).ok).toBe(false);
  },
);
it('renders saved extras with original symbols and unchanged auto ranges', () => {
  const template = chartTemplate('xy');
  const plot = template.panels[0]!.plotSlots[0]!;
  Object.assign(plot, { mode: 'line-markers' });
  const data = chartData({ x: [0, 1, 3], y: [0, 2, 0] });
  const before = figureCoordinates(template, data);
  Object.assign(plot, extras);
  expect(validateFigureTemplate(template).ok).toBe(true);
  const after = figureCoordinates(template, data);
  for (const [id, panel] of before.panels) {
    expect(after.panels.get(id)!.rect).toEqual(panel.rect);
    for (const [axisId, scale] of panel.scales) {
      const other = after.panels.get(id)!.scales.get(axisId)!;
      expect([other.min, other.max]).toEqual([scale.min, scale.max]);
      expect(other.map(0.5)).toBe(scale.map(0.5));
    }
  }
  const result = renderFigureSvg(template, data);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const body = result.svg.match(
    /data-role="plot-slot"[^>]*>([\s\S]*?)<\/g>/,
  )![1]!;
  expect(body.match(/data-role="marker"/g)).toHaveLength(3);
  expect(body.match(/data-role="drop-line-vertical"/g)).toHaveLength(3);
  expect(body).toContain('data-role="curve-arrow"');
  expect(body.indexOf('drop-line-vertical')).toBeLessThan(
    body.indexOf('<path'),
  );
  expect(body).not.toMatch(/<mask|<rect/);
});
it('shows the line symbol gap and arrow in the actual legend sample', () => {
  const plot = chartTemplate('xy').panels[0]!.plotSlots[0]!;
  Object.assign(plot, {
    mode: 'line-markers',
    symbolGapPct: 25,
    lineArrows: { position: 'end', lengthPt: 3, angleDeg: 40 },
  });
  const sample = legendSample(plot, 60);
  expect(sample).toContain('curve-arrow');
  expect(sample.match(/<path /g)).toHaveLength(2);
  expect(sample.match(/legend-marker/g)).toHaveLength(1);
});
it('fits an arrow into the default narrow legend while retaining its plot length', () => {
  const plot = chartTemplate('xy').panels[0]!.plotSlots[0]!;
  Object.assign(plot, {
    mode: 'line-markers',
    symbolGapPct: 25,
    markerStyle: {
      visible: true,
      shape: 'circle',
      sizePt: 4,
      strokeWidthPt: 0.8,
      stroke: '#000000',
      fill: 'none',
    },
    lineArrows: { position: 'end', lengthPt: 7, angleDeg: 40 },
  });
  const before = structuredClone(plot);
  expect(legendSample(plot, 18)).toContain('curve-arrow');
  expect(plot).toEqual(before);
});
it('checks a custom drop target against its bound logarithmic axis', () => {
  const template = chartTemplate('xy');
  const plot = template.panels[0]!.plotSlots[0]!;
  Object.assign(plot, {
    dropLines: { vertical: { target: { mode: 'value', value: -0.5 } } },
  });
  expect(validateFigureTemplate(template).ok).toBe(true);
  const y = template.panels[0]!.axes.find((a) => a.axisId === plot.yAxisId)!;
  y.scale = 'log10';
  const result = validateFigureTemplate(template);
  expect(result.ok).toBe(false);
  expect(result.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: expect.stringContaining('dropLines/vertical/target/value'),
      }),
    ]),
  );
});
it('uses reversed top/right bound axes for drop targets in the formal renderer', () => {
  const template = chartTemplate('xy'),
    panel = template.panels[0]!,
    plot = panel.plotSlots[0]!;
  const top = structuredClone(panel.axes.find((a) => a.dimension === 'x')!);
  const right = structuredClone(panel.axes.find((a) => a.dimension === 'y')!);
  Object.assign(top, {
    axisId: 'top-x',
    position: 'top',
    reverse: true,
    range: { mode: 'fixed', min: -2, max: 2 },
  });
  Object.assign(right, {
    axisId: 'right-y',
    position: 'right',
    reverse: true,
    scale: 'log10',
    range: { mode: 'fixed', min: 1, max: 100 },
  });
  panel.axes.push(top, right);
  Object.assign(plot, {
    xAxisId: top.axisId,
    yAxisId: right.axisId,
    dropLines: {
      horizontal: { target: { mode: 'axis-max' } },
      vertical: { target: { mode: 'axis-min' } },
    },
  });
  const data = chartData({ x: [-2, 0, 2], y: [1, 10, 100] });
  const rect = figureCoordinates(template, data).panels.get(
    panel.panelId,
  )!.rect;
  const result = renderFigureSvg(template, data);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const horizontal = [
    ...result.svg.matchAll(/<line data-role="drop-line-horizontal"[^>]*>/g),
  ];
  const vertical = [
    ...result.svg.matchAll(/<line data-role="drop-line-vertical"[^>]*>/g),
  ];
  expect(horizontal).toHaveLength(3);
  expect(vertical).toHaveLength(3);
  horizontal.forEach(([line], i) => {
    expect(Number(line.match(/x2="([^"]+)"/)![1])).toBeCloseTo(rect.x, 4);
    expect(line).toContain(`data-source-index="${i}"`);
  });
  vertical.forEach(([line]) =>
    expect(Number(line.match(/y2="([^"]+)"/)![1])).toBeCloseTo(rect.y, 4),
  );
});
