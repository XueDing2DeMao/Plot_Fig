import { expect, it } from 'vitest';
import {
  validateFigureTemplate,
  type Axis,
  type MajorTickGeneration,
} from '@plot-fig/figure-schema';
import { createCurrentTemplate } from '../../../tests/helpers/figure-payloads.js';
import { chartData } from '../../../tests/helpers/chart-fixtures.js';
import { validateRequest } from '../../export-service/src/security.js';
import { renderFigureSvg, validateFixedAxisTicks } from './index.js';

function configure(axis: Axis, generation: MajorTickGeneration) {
  axis.majorTicks.generation = generation;
}

function configuredTemplate(generation: MajorTickGeneration) {
  const template = createCurrentTemplate();
  template.panels[0]!.axes[0]!.range = { mode: 'fixed', min: -0.25, max: 0.55 };
  template.panels[0]!.axes[1]!.range = { mode: 'fixed', min: 0, max: 1 };
  configure(template.panels[0]!.axes[0]!, generation);
  return template;
}

function axisGroups(svg: string) {
  return Array.from(
    svg.matchAll(/<g data-role="axis-[xy]">([\s\S]*?)<\/g>/g),
    (match) => match[1]!,
  );
}
function labels(svg: string) {
  return Array.from(
    svg.matchAll(/data-role="tick-label"[^>]*>([^<]*)<\/text>/g),
    (match) => match[1]!,
  );
}
function positions(svg: string, dimension: 'x' | 'y') {
  return Array.from(
    svg.matchAll(/<line data-role="major-tick"[^>]*>/g),
    (match) =>
      Number(match[0].match(new RegExp(`${dimension}1="([^"]+)"`))![1]),
  );
}

it.each([
  {
    generation: { mode: 'increment', step: 0.2, anchor: 0.1 },
    expected: ['-0.1', '0.1', '0.3', '0.5'],
  },
  {
    generation: { mode: 'count', count: 5 },
    expected: ['-0.2', '0', '0.2', '0.4'],
  },
  { generation: { mode: 'endpoints' }, expected: ['-0.25', '0.55'] },
] satisfies Array<{ generation: MajorTickGeneration; expected: string[] }>)(
  'renders persisted $generation.mode tick configuration in the normal data pipeline',
  ({ generation, expected }) => {
    const template = configuredTemplate(generation);
    const original = structuredClone(template);
    expect(validateFigureTemplate(template).ok).toBe(true);
    const data = chartData({ x: [-0.25, 0.55], y: [0, 1] });
    const result = renderFigureSvg(template, data);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(labels(axisGroups(result.svg)[0]!)).toEqual(expected);
    expect(result.svg).toContain('data-plot-slot-id="series-1"');
    expect(template).toEqual(original);
    expect(renderFigureSvg(template, data)).toEqual(result);
  },
);

it('keeps omitted and explicit automatic generation SVGs byte-identical through the public renderer', () => {
  const automatic = configuredTemplate({ mode: 'auto' });
  const omitted = structuredClone(automatic);
  delete omitted.panels[0]!.axes[0]!.majorTicks.generation;
  const data = chartData({ x: [-0.25, 0.55], y: [0, 1] });
  expect(validateFigureTemplate(automatic).ok).toBe(true);
  expect(renderFigureSvg(automatic, data)).toEqual(
    renderFigureSvg(omitted, data),
  );
});

it('checks data-derived automatic domains with persisted generation after fixed-only validation defers them', () => {
  const template = configuredTemplate({
    mode: 'increment',
    step: 0.2,
    anchor: 0.1,
  });
  const axis = template.panels[0]!.axes[0]!;
  axis.range = { mode: 'auto' };
  const data = chartData({ x: [-0.25, 0.55], y: [0, 1] });
  const result = renderFigureSvg(template, data);
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  expect(labels(axisGroups(result.svg)[0]!)).toEqual([
    '-0.1',
    '0.1',
    '0.3',
    '0.5',
  ]);
  configure(axis, { mode: 'increment', step: 1e-12 });
  expect(validateFixedAxisTicks(template)).toEqual([]);
  const failure = renderFigureSvg(template, data);
  expect(failure.ok).toBe(false);
  expect(failure.diagnostics).toContainEqual(
    expect.objectContaining({
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/刻度.*10000/),
    }),
  );
});

it('renders independent four-side generation and reverse settings on a fixed empty layer', () => {
  const template = configuredTemplate({
    mode: 'increment',
    step: 0.2,
    anchor: 0.1,
  });
  const panel = template.panels[0]!;
  const bottom = panel.axes[0]!,
    left = panel.axes[1]!;
  configure(left, { mode: 'endpoints' });
  const top = structuredClone(bottom),
    right = structuredClone(left);
  top.axisId = 'axis-top';
  top.position = 'top';
  top.reverse = true;
  top.scale = 'log10';
  top.range = { mode: 'fixed', min: 0.02, max: 2 };
  configure(top, { mode: 'increment', step: 1, anchor: 0.2 });
  right.axisId = 'axis-right';
  right.position = 'right';
  right.reverse = true;
  right.scale = 'ln';
  right.range = { mode: 'fixed', min: 1, max: 10 };
  configure(right, { mode: 'increment', step: 1, anchor: 3 });
  panel.axes.push(top, right);
  panel.plotSlots = [];
  template.dataSlots = [];
  expect(validateFigureTemplate(template).ok).toBe(true);
  const result = renderFigureSvg(template, chartData({}));
  expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
  if (!result.ok) return;
  const groups = axisGroups(result.svg);
  expect(groups).toHaveLength(4);
  expect(labels(groups[0]!)).toEqual(['-0.1', '0.1', '0.3', '0.5']);
  expect(labels(groups[1]!)).toEqual(['0', '1']);
  expect(labels(groups[2]!)).toEqual(['0.02', '0.2', '2']);
  expect(labels(groups[3]!)).toHaveLength(3);
  expect(labels(groups[3]!)[1]).toBe('3');
  for (const [index, dimension, increasing] of [
    [0, 'x', true],
    [1, 'y', false],
    [2, 'x', false],
    [3, 'y', true],
  ] as const) {
    const values = positions(groups[index]!, dimension);
    expect(
      values
        .slice(1)
        .every((value, i) =>
          increasing ? value > values[i]! : value < values[i]!,
        ),
    ).toBe(true);
  }
});

it('returns axis diagnostics for visible over-budget configurations and ignores hidden axis planning', () => {
  const template = configuredTemplate({ mode: 'increment', step: 1e-12 });
  expect(validateFigureTemplate(template).ok).toBe(true);
  const data = chartData({ x: [-0.25, 0.55], y: [0, 1] });
  const result = renderFigureSvg(template, data);
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      severity: 'error',
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/刻度.*10000/),
    }),
  );
  template.panels[0]!.axes[0]!.visible = false;
  expect(renderFigureSvg(template, data).ok).toBe(true);
});

it('rejects unrepresentable minor ticks in an empty fixed graph through the public renderer', () => {
  const template = configuredTemplate({ mode: 'endpoints' });
  const panel = template.panels[0]!;
  panel.plotSlots = [];
  template.dataSlots = [];
  panel.axes[0]!.range = { mode: 'fixed', min: 1, max: 1 + Number.EPSILON };
  panel.axes[0]!.minorTicks = {
    ...panel.axes[0]!.minorTicks,
    visible: true,
    count: 1,
  };
  expect(validateFigureTemplate(template).ok).toBe(true);
  const result = renderFigureSvg(template, chartData({}));
  expect(result.ok).toBe(false);
  expect(result.diagnostics).toContainEqual(
    expect.objectContaining({
      severity: 'error',
      sourcePath: '/panels/panel-main/axes/axis-x',
      message: expect.stringMatching(/次刻度.*浮点精度/),
    }),
  );
});

it.each(['pdf', 'eps'] as const)(
  'preserves exact small-value labels in valid %s export input',
  (format) => {
    const template = configuredTemplate({ mode: 'increment', step: 1e-9 });
    template.panels[0]!.axes[0]!.range = {
      mode: 'fixed',
      min: 1e-9,
      max: 5e-9,
    };
    expect(validateFigureTemplate(template).ok).toBe(true);
    const result = renderFigureSvg(
      template,
      chartData({ x: [1e-9, 5e-9], y: [0, 1] }),
    );
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    expect(labels(axisGroups(result.svg)[0]!)).toEqual([
      '1e-9',
      '2e-9',
      '3e-9',
      '4e-9',
      '5e-9',
    ]);
    const request = {
      svg: result.svg,
      format,
      dpi: 300,
      textToPath: false,
      flattenTransparency: false,
    };
    expect(validateRequest(request)).toEqual(request);
  },
);
