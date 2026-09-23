import { expect, it } from 'vitest';
import { bindDataSlots, inferDataBindingSet } from '@plot-fig/data-binding';
import { defaultTextStyle } from '@plot-fig/figure-schema';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { figureCoordinates } from './figure-coordinates.js';
import { renderFigureSvg } from './index.js';
import { formatNumber } from './geometry.js';
import { constrainAxisLengths } from './axis-length-ratio.js';
import { createScale } from './scales.js';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';

const pt = 72 / 25.4;
function fixture(ratio = 1) {
  const template = createCurrentTemplate();
  template.page.size = {
    width: { value: 200, unit: 'mm' },
    height: { value: 160, unit: 'mm' },
  };
  const panel = template.panels[0]!;
  panel.frame = { x: 0.1, y: 0.125, width: 0.6, height: 0.5 };
  panel.axisLengthRatio = { xAxisId: 'axis-x', yAxisId: 'axis-y', ratio };
  panel.axes[0]!.range = { mode: 'fixed', min: 0, max: 20 };
  panel.axes[1]!.range = { mode: 'fixed', min: 0, max: 10 };
  const data = bindDataSlots(
    template,
    inferDataBindingSet(
      [
        ['X', 'Y'],
        ['0', '0'],
        ['10', '5'],
        ['20', '10'],
      ],
      'ratio.csv',
    ),
  );
  return { template, panel, data };
}
it.each([
  [1, 120, 60],
  [0.25, 40, 80],
  [2, 120, 30],
])('computes physical axis lengths at ratio %s', (ratio, width, height) => {
  const { template, data } = fixture(ratio);
  const original = structuredClone(template);
  const { rect } = figureCoordinates(template, data).panels.get('panel-main')!;
  expect(rect.width / pt).toBeCloseTo(width!, 9);
  expect(rect.height / pt).toBeCloseTo(height!, 9);
  expect(template).toEqual(original);
});
it('uses the same plot rectangle for SVG clipping and data/panel annotations', () => {
  const { template, data } = fixture(0.25);
  template.annotations.push({
    annotationId: 'data-center',
    kind: 'text',
    coordinateSpace: 'data',
    panelId: 'panel-main',
    xAxisId: 'axis-x',
    yAxisId: 'axis-y',
    position: { x: 10, y: 5 },
    text: 'center',
    format: 'plain',
    textStyle: defaultTextStyle(),
  });
  const { rect } = figureCoordinates(template, data).panels.get('panel-main')!;
  expect(rect.width / pt).toBeCloseTo(40, 9);
  const result = renderFigureSvg(template, data);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
  expect(result.svg).toContain(
    `width="${formatNumber(rect.width)}" height="${formatNumber(rect.height)}"`,
  );
  expect(result.svg).toContain(
    `x="${formatNumber(rect.x + rect.width / 2)}" y="${formatNumber(rect.y + rect.height / 2)}"`,
  );
});
it('works with fixed ranges without data and waits for missing automatic ranges', () => {
  const { template, panel } = fixture();
  expect(
    figureCoordinates(template).panels.get(panel.panelId)!.rect.height / pt,
  ).toBeCloseTo(60);
  panel.axes[0]!.range = { mode: 'auto' };
  expect(
    figureCoordinates(template).panels.get(panel.panelId)!.rect.height / pt,
  ).toBeCloseTo(80);
});
it('keeps data ranges and handles reversed negative decimal axes', () => {
  const { template, panel } = fixture();
  panel.axes[0]!.range = { mode: 'fixed', min: -0.1, max: 0.1 };
  panel.axes[1]!.range = { mode: 'fixed', min: -0.1, max: 0 };
  panel.axes.forEach((axis) => {
    axis.reverse = true;
    axis.visible = false;
  });
  const result = figureCoordinates(template).panels.get(panel.panelId)!;
  expect(result.rect.height / pt).toBeCloseTo(60);
  expect(result.scales.get('axis-x')!.map(-0.1)).toBe(1);
  expect(result.scales.get('axis-y')!.max).toBe(0);
});
it('restores the original available frame when disabled and never accumulates shrinkage', () => {
  const { template, panel } = fixture();
  figureCoordinates(template);
  panel.axisLengthRatio!.ratio = 0.25;
  figureCoordinates(template);
  panel.axisLengthRatio!.ratio = 1;
  expect(
    figureCoordinates(template).panels.get(panel.panelId)!.rect.height / pt,
  ).toBeCloseTo(60);
  delete panel.axisLengthRatio;
  expect(
    figureCoordinates(template).panels.get(panel.panelId)!.rect.height / pt,
  ).toBeCloseTo(80);
});
it('rejects lengths that would collapse to zero in exported SVG precision', () => {
  const { template, data } = fixture(1e-20);
  expect(() => figureCoordinates(template, data)).toThrow(/数值精度/);
  expect(renderFigureSvg(template, data).ok).toBe(false);
});
it('excludes colorbar strips from the physical X axis and shrinks the layer background', () => {
  const { panel } = fixture(0.25);
  const scales = new Map(
    panel.axes.map((axis) => [
      axis.axisId,
      createScale(axis, 0, axis.dimension === 'x' ? 20 : 10),
    ]),
  );
  const result = constrainAxisLengths(
    {
      layer: { x: 10, y: 20, width: 180, height: 80 },
      plot: { x: 10, y: 20, width: 120, height: 80 },
    },
    panel.axisLengthRatio,
    scales,
  );
  expect(result.plot.width).toBeCloseTo(40);
  expect(result.layer.width).toBeCloseTo(100);
  expect(result.layer.height).toBe(80);
});
it.each([
  [-1e308, 1e308],
  [0, Number.MIN_VALUE],
])(
  'handles finite extreme ranges %s to %s without overflowing spans',
  (min, max) => {
    const { template, panel } = fixture();
    panel.axes.forEach((axis) => {
      axis.range = { mode: 'fixed', min: min!, max: max! };
    });
    const { rect } = figureCoordinates(template).panels.get(panel.panelId)!;
    expect(rect.width / pt).toBeCloseTo(80);
    expect(rect.height / pt).toBeCloseTo(80);
  },
);
it('uses the final shared scale without changing shared ranges', () => {
  const { template, panel } = fixture(1);
  const top = {
    ...structuredClone(panel.axes[0]!),
    axisId: 'top-x',
    position: 'top' as const,
  };
  panel.axes.push(top);
  template.sharedAxisGroups = [
    {
      groupId: 'shared-x',
      members: [
        { panelId: panel.panelId, axisId: 'axis-x' },
        { panelId: panel.panelId, axisId: 'top-x' },
      ],
    },
  ];
  panel.axisLengthRatio!.xAxisId = 'top-x';
  const result = figureCoordinates(template).panels.get(panel.panelId)!;
  expect(result.rect.height / pt).toBeCloseTo(60);
  expect(result.scales.get('top-x')).toBe(result.scales.get('axis-x'));
});
it('applies the ratio after the final dual Y alignment range is solved', () => {
  const { template, panel } = fixture();
  panel.axes[1]!.range = { mode: 'auto' };
  panel.axes.push({
    ...structuredClone(panel.axes[1]!),
    axisId: 'right-y',
    position: 'right',
  });
  panel.plotSlots.push({
    ...structuredClone(panel.plotSlots[0]!),
    plotSlotId: 'right-series',
    yAxisId: 'right-y',
    bindings: { x: 'slot-x', y: 'slot-right' },
  });
  template.dataSlots.push({
    dataSlotId: 'slot-right',
    role: 'y',
    valueType: 'number',
    required: true,
    name: 'Right',
  });
  panel.yAxisAlignment = {
    leftAxisId: 'axis-y',
    rightAxisId: 'right-y',
    value: 0,
  };
  panel.axisLengthRatio!.yAxisId = 'right-y';
  const data = bindDataSlots(
    template,
    inferDataBindingSet(
      [
        ['X', 'Y', 'Right'],
        ['0', '-1', '0'],
        ['20', '1', '1000'],
      ],
      'aligned.csv',
    ),
  );
  const { rect, scales } = figureCoordinates(template, data).panels.get(
    panel.panelId,
  )!;
  const x = scales.get('axis-x')!,
    left = scales.get('axis-y')!,
    right = scales.get('right-y')!;
  expect(right.min).toBeLessThan(0);
  expect(left.map(0)).toBeCloseTo(right.map(0), 9);
  expect(rect.width / rect.height).toBeCloseTo(
    (x.max - x.min) / (right.max - right.min),
    9,
  );
  expect(renderFigureSvg(template, data).ok).toBe(true);
});
it.each([0.82, 0.1])(
  'keeps a visible colorbar and its title inside a layer of height %s',
  (height) => {
    const template = chartTemplate('heatmap');
    const panel = template.panels[0]!;
    panel.frame.height = height;
    panel.axisLengthRatio = {
      xAxisId: panel.axes[0]!.axisId,
      yAxisId: panel.axes[1]!.axisId,
      ratio: 100,
    };
    panel.appearance = { background: { color: '#ffffff', opacity: 1 } };
    const data = chartData({
      x: [0, 1, 0, 1],
      y: [0, 0, 1, 1],
      z: [1, 2, 3, 4],
    });
    const result = renderFigureSvg(template, data);
    expect(result.ok).toBe(true);
    if (!result.ok) throw Error(JSON.stringify(result.diagnostics));
    const context = figureCoordinates(template, data).panels.get(
      panel.panelId,
    )!;
    expect(context.rect.width / context.rect.height).toBeCloseTo(100, 8);
    const background = result.svg.match(
      /data-role="layer-background"[^>]*height="([^"]+)"/,
    );
    const bar = result.svg.match(
      /data-role="colorbar"[^>]*>[\s\S]*?<rect[^>]*y="([^"]+)"[^>]*height="([^"]+)"/,
    );
    expect(background).not.toBeNull();
    expect(bar).not.toBeNull();
    expect(Number(bar![1]) + Number(bar![2])).toBeLessThanOrEqual(
      context.rect.y + Number(background![1]) + 1e-6,
    );
    const title = result.svg.match(
      /data-role="colorbar"[^>]*>[\s\S]*?<text[^>]*y="([^"]+)"[^>]*font-size="([^"]+)"/,
    )!;
    expect(Number(title[1]) - Number(title[2])).toBeGreaterThanOrEqual(
      context.rect.y - 1e-6,
    );
  },
);
