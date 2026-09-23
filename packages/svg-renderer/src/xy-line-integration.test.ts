import { expect, it } from 'vitest';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderFigureSvg } from './index.js';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { figureCoordinates } from './figure-coordinates.js';

function fixture(connection?: string) {
  const template = chartTemplate('xy');
  const plot = template.panels[0]!.plotSlots[0]!;
  Object.assign(plot, {
    mode: 'line-markers',
    ...(connection ? { lineConnection: connection } : {}),
  });
  return { template, plot };
}
function path(svg: string) {
  return svg.match(/data-role="plot-slot"[^>]*><path d="([^"]+)"/)?.[1];
}
it.each(['straight', 'step-h', 'step-v', 'spline'])(
  'renders the formal %s property without changing sample markers',
  (connection) => {
    const { template } = fixture(connection);
    const result = renderFigureSvg(
      template,
      chartData({ x: [0, 1, 3], y: [0, 2, 0] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(path(result.svg)).toMatch(
      connection === 'spline'
        ? /C/
        : connection === 'straight'
          ? /L/
          : /H.*V|V.*H/,
    );
    expect(
      result.svg
        .match(/data-role="plot-slot"[^>]*>([\s\S]*?)<\/g>/)?.[1]
        ?.match(/<circle /g),
    ).toHaveLength(3);
  },
);
it('keeps the old default SVG byte identical to explicit straight', () => {
  const data = chartData({ x: [2, 1, 1], y: [1, 3, 2] });
  expect(renderFigureSvg(fixture().template, data)).toEqual(
    renderFigureSvg(fixture('straight').template, data),
  );
});
it.each([
  [0, 1, 1],
  [3, 2, 1],
  [0, 2, 1],
])('rejects invalid raw spline X: %j even beside a valid plot', (...x) => {
  const { template, plot } = fixture('spline');
  const neighbor = structuredClone(plot);
  Object.assign(neighbor, {
    plotSlotId: 'neighbor',
    lineConnection: 'straight',
  });
  template.panels[0]!.plotSlots.push(neighbor);
  const result = renderFigureSvg(template, chartData({ x, y: [1, 3, 2] }));
  expect(result).toMatchObject({
    ok: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({
        severity: 'error',
        message: expect.stringMatching(/严格递增/),
      }),
    ]),
  });
});
it('supports reversed linear axes but rejects logarithmic spline axes', () => {
  const { template } = fixture('spline');
  const axis = template.panels[0]!.axes[0]!;
  axis.reverse = true;
  expect(
    renderFigureSvg(template, chartData({ x: [1, 2, 4], y: [1, 3, 2] })).ok,
  ).toBe(true);
  axis.scale = 'log10';
  expect(validateFigureTemplate(template).ok).toBe(false);
});
it('does not draw or validate a dormant connection in a pure scatter plot', () => {
  const { template, plot } = fixture('spline');
  Object.assign(plot, { mode: 'markers' });
  const result = renderFigureSvg(
    template,
    chartData({ x: [3, 1, 1], y: [1, 2, 3] }),
  );
  expect(result.ok).toBe(true);
  if (result.ok) expect(path(result.svg)).toBeUndefined();
});

it.each(['step-h', 'step-v', 'spline'])(
  'retains source errors, autoscale and clipping with %s',
  (connection) => {
    const straight = fixture().template;
    Object.assign(straight.panels[0]!.plotSlots[0]!, {
      bindings: { x: 'slot-x', y: 'slot-y', yError: 'slot-yError' },
      errorBarStyle: {
        visible: true,
        color: '#333333',
        widthPt: 1,
        capWidthPt: 4,
      },
    });
    straight.dataSlots.push({
      dataSlotId: 'slot-yError',
      name: 'error',
      role: 'yError',
      valueType: 'number',
      required: false,
    });
    const curved = structuredClone(straight);
    Object.assign(curved.panels[0]!.plotSlots[0]!, {
      lineConnection: connection,
    });
    const data = chartData({
      x: [0, 1, 3],
      y: [0, 2, 0],
      yError: [0.1, 0.5, 0.2],
    });
    const a = renderFigureSvg(straight, data),
      b = renderFigureSvg(curved, data);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(
      [...b.svg.matchAll(/<line data-role="error-bar"[^>]*>/g)].map(
        (m) => m[0],
      ),
    ).toEqual(
      [...a.svg.matchAll(/<line data-role="error-bar"[^>]*>/g)].map(
        (m) => m[0],
      ),
    );
    expect(b.svg.match(/<g data-role="plots"[^>]*>/)?.[0]).toEqual(
      a.svg.match(/<g data-role="plots"[^>]*>/)?.[0],
    );
    const first = figureCoordinates(straight, data)
      .panels.values()
      .next().value!;
    const second = figureCoordinates(curved, data)
      .panels.values()
      .next().value!;
    expect(second.rect).toEqual(first.rect);
    for (const [id, scale] of first.scales)
      expect(second.scales.get(id)).toMatchObject({
        min: scale.min,
        max: scale.max,
      });
  },
);
it('reports spline arithmetic failure even alongside a valid straight curve', () => {
  const { template, plot } = fixture('spline');
  const axis = template.panels[0]!.axes[0]!;
  axis.range = { mode: 'fixed', min: 0, max: 1e300 };
  template.panels[0]!.plotSlots.push({
    ...structuredClone(plot),
    plotSlotId: 'neighbor',
    lineConnection: 'straight',
  } as typeof plot);
  const result = renderFigureSvg(
    template,
    chartData({ x: [0, 1, 2], y: [0, 2, 0] }),
  );
  expect(result).toMatchObject({
    ok: false,
    diagnostics: expect.arrayContaining([
      expect.objectContaining({
        severity: 'error',
        message: expect.stringMatching(/样条/),
      }),
    ]),
  });
});
