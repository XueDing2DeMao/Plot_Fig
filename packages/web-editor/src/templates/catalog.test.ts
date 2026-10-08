import { afterEach, expect, it, vi } from 'vitest';
import {
  createLayerStack,
  validateFigureTemplate,
  type FigureTemplate,
} from '@plot-fig/figure-schema';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from '../state/default-template.js';
import { templateThumbnail } from './catalog.js';

vi.mock('@plot-fig/svg-renderer', async (original) => {
  const renderer = await original<typeof import('@plot-fig/svg-renderer')>();
  return { ...renderer, renderFigureSvg: vi.fn(renderer.renderFigureSvg) };
});
afterEach(() => vi.clearAllMocks());

function thumbnail(template: FigureTemplate) {
  const checked = validateFigureTemplate(template);
  expect(checked.ok, JSON.stringify(checked)).toBe(true);
  const before = structuredClone(template);
  const svg = templateThumbnail(template);
  expect(template).toEqual(before);
  expect(
    svg,
    JSON.stringify(
      vi.mocked(renderFigureSvg).mock.results.at(-1)?.value.diagnostics,
    ),
  ).toContain('<svg');
  expect(svg).not.toMatch(/NaN|Infinity/);
  const data = vi.mocked(renderFigureSvg).mock.calls.at(-1)![1]!;
  return {
    svg,
    values: (id: string) =>
      data.columns.find((column) => column.columnId === id)!.values as number[],
  };
}

function expectWithin(values: number[], min: number, max: number) {
  expect(values).toHaveLength(9);
  expect(
    values.every(
      (value) => Number.isFinite(value) && value >= min && value <= max,
    ),
  ).toBe(true);
  expect(new Set(values).size).toBeGreaterThan(1);
}

it('renders curves inside fixed axis ranges without changing the imported template', () => {
  const template = defaultTemplate();
  template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: 100, max: 200 };
  template.panels[0]!.axes[1]!.range = { mode: 'fixed', min: -500, max: -300 };
  const { svg, values } = thumbnail(template);
  expectWithin(values('slot-x'), 100, 200);
  expectWithin(values('slot-y'), -500, -300);
  expect(svg).toMatch(/data-role="plot-slot"[^>]*>\s*<(?:path|g|rect|circle)/);
});

it.each(['log10', 'ln', 'log2'] as const)(
  'uses positive sample values for automatic and fixed %s axes',
  (scale) => {
    const template = defaultTemplate();
    const [x, y] = template.panels[0]!.axes;
    x!.scale = y!.scale = scale;
    x!.range = { mode: 'fixed', min: 1e3, max: 1e9 };
    const { values } = thumbnail(template);
    expectWithin(values('slot-x'), 1e3, 1e9);
    expect(
      values('slot-y').every((value) => value > 0 && Number.isFinite(value)),
    ).toBe(true);
  },
);

it('uses each plotted binding’s axis, including a right Y axis', () => {
  const template = defaultTemplate(),
    panel = template.panels[0]!;
  panel.axes[1]!.range = { mode: 'fixed', min: 100, max: 200 };
  panel.axes.push({
    ...structuredClone(panel.axes[1]!),
    axisId: 'right-y',
    dimension: 'y',
    position: 'right',
    range: { mode: 'fixed', min: 1e6, max: 2e6 },
  });
  const plot = structuredClone(panel.plotSlots[0]!);
  if (plot.kind !== 'xy') throw new Error('fixture');
  plot.plotSlotId = 'series-2';
  plot.yAxisId = 'right-y';
  plot.bindings.y = 'slot-right';
  panel.plotSlots.push(plot);
  template.dataSlots.push({
    ...template.dataSlots[1]!,
    dataSlotId: 'slot-right',
  });
  const { values } = thumbnail(template);
  expectWithin(values('slot-y'), 100, 200);
  expectWithin(values('slot-right'), 1e6, 2e6);
});

it('keeps samples on the permitted side of a one-sided range', () => {
  const template = defaultTemplate();
  template.panels[0]!.axes[0]!.range = { mode: 'min-only', min: 1000 };
  template.panels[0]!.axes[1]!.range = { mode: 'max-only', max: -1000 };
  template.panels[0]!.axes[0]!.rescale = { mode: 'fixed-min-auto' };
  template.panels[0]!.axes[1]!.rescale = { mode: 'fixed-max-auto' };
  const { values } = thumbnail(template);
  expect(values('slot-x').every((value) => value >= 1000)).toBe(true);
  expect(values('slot-y').every((value) => value <= -1000)).toBe(true);
});

it.each(['heatmap', 'contour'])(
  'keeps a complete sample grid for %s with fixed ranges',
  (kind) => {
    const template = chartTemplate(kind);
    template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: 100, max: 200 };
    template.panels[0]!.axes[1]!.range = {
      mode: 'fixed',
      min: 1000,
      max: 2000,
    };
    const { values } = thumbnail(template);
    const x = values('slot-x'),
      y = values('slot-y');
    expectWithin(x, 100, 200);
    expectWithin(y, 1000, 2000);
    expect(new Set(x).size).toBe(3);
    expect(new Set(y).size).toBe(3);
    expect(new Set(x.map((value, index) => `${value}:${y[index]}`)).size).toBe(
      9,
    );
  },
);

it.each(['bar', 'box', 'histogram', 'area'])(
  'uses the value axis for %s samples',
  (kind) => {
    const template = chartTemplate(kind),
      panel = template.panels[0]!;
    const axis = kind === 'histogram' ? panel.axes[0]! : panel.axes[1]!;
    axis.range = { mode: 'fixed', min: 100, max: 200 };
    const { values } = thumbnail(template);
    expectWithin(
      values(
        kind === 'bar'
          ? 'slot-value'
          : kind === 'area'
            ? 'slot-y'
            : 'slot-values',
      ),
      100,
      200,
    );
  },
);

it.each(['probability', 'logit', 'weibull'] as const)(
  'produces finite samples within the automatic %s domain',
  (scale) => {
    const template = defaultTemplate();
    template.panels[0]!.axes[1]!.scale = scale;
    const { values } = thumbnail(template);
    expect(
      values('slot-y').every(
        (value) =>
          value > 0 &&
          value < (scale === 'weibull' ? 1 : 100) &&
          Number.isFinite(value),
      ),
    ).toBe(true);
  },
);

it.each(['xy', 'area'])(
  'uses unique X coordinates for cumulative %s previews',
  (kind) => {
    const template = chartTemplate(kind),
      panel = template.panels[0]!;
    panel.layerStack = {
      ...createLayerStack(panel.plotSlots.map((plot) => plot.plotSlotId)),
      mode: 'cumulative',
    };
    const { values } = thumbnail(template);
    expect(new Set(values('slot-x')).size).toBe(9);
  },
);
