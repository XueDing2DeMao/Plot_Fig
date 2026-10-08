import { expect, it } from 'vitest';
import type { CurveGroup, Panel, XyPlot } from '@plot-fig/figure-schema';
import { validTemplate } from '../../figure-schema/src/schema/fixtures.js';
import {
  resolveCurveGroups,
  unlinkCurveGroup,
  validateCurveGroups,
} from './curve-groups.js';
import { renderFigureSvg } from './index.js';
import {
  chartData,
  chartTemplate,
} from '../../../tests/helpers/chart-fixtures.js';

function fixture(mapping?: Record<string, unknown>): Panel {
  const panel = structuredClone(validTemplate.panels[0]!);
  panel.plotSlots = ['a', 'b', 'c', 'd'].map((id) => ({
    ...structuredClone(panel.plotSlots[0]!),
    plotSlotId: id,
  }));
  panel.groups = [
    {
      groupId: 'g',
      name: '温度',
      members: ['a', 'b', 'c', 'd'],
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colors: ['#000000', '#ffffff'],
      ...mapping,
    } as CurveGroup,
  ];
  return panel;
}
const colors = (panel: Panel) =>
  resolveCurveGroups(panel).plotSlots.map(
    (p) => (p as XyPlot).lineStyle?.color,
  );

it('distinguishes cycling, stretched list sampling and bin-center sampling', () => {
  expect(colors(fixture())).toEqual([
    '#000000',
    '#ffffff',
    '#000000',
    '#ffffff',
  ]);
  expect(colors(fixture({ colorIncrement: 'stretch' }))).toEqual([
    '#000000',
    '#000000',
    '#ffffff',
    '#ffffff',
  ]);
  expect(
    colors(
      fixture({
        colorIncrement: 'binned',
        colors: [
          '#000000',
          '#111111',
          '#222222',
          '#333333',
          '#444444',
          '#555555',
          '#666666',
          '#777777',
        ],
      }),
    ),
  ).toEqual(['#111111', '#333333', '#555555', '#777777']);
});

it('maps nonuniform numeric values rather than member indices and survives reorder', () => {
  const panel = fixture({
    colorMapping: {
      source: 'values',
      colors: ['#000000', '#ffffff'],
      values: [
        { plotSlotId: 'a', value: 500 },
        { plotSlotId: 'b', value: 550 },
        { plotSlotId: 'c', value: 800 },
        { plotSlotId: 'd', value: 1000 },
      ],
    },
  });
  expect(colors(panel)).toEqual(['#000000', '#1a1a1a', '#999999', '#ffffff']);
  panel.groups![0]!.members.reverse();
  expect(colors(panel)).toEqual(['#000000', '#1a1a1a', '#999999', '#ffffff']);
  expect(colors(unlinkCurveGroup(panel, 'g'))).toEqual(colors(panel));
});

it('supports plot-index mapping, fixed range, reversed colors and clamping', () => {
  expect(
    colors(
      fixture({
        colorMapping: { source: 'index', colors: ['#000000', '#ffffff'] },
      }),
    ),
  ).toEqual(['#000000', '#555555', '#aaaaaa', '#ffffff']);
  expect(
    colors(
      fixture({
        colorMapping: {
          source: 'index',
          colors: ['#000000', '#ffffff'],
          domain: { min: 2, max: 3 },
          reverse: true,
        },
      }),
    ),
  ).toEqual(['#ffffff', '#ffffff', '#000000', '#000000']);
});

it('uses midpoint for equal values and preserves base color for missing parameters', () => {
  const panel = fixture({
    colorMapping: {
      source: 'values',
      colors: ['#000000', '#ffffff'],
      values: [
        { plotSlotId: 'a', value: 600 },
        { plotSlotId: 'b', value: 600 },
      ],
    },
  });
  expect(colors(panel)).toEqual([
    '#808080',
    '#808080',
    (panel.plotSlots[2] as XyPlot).lineStyle!.color,
    (panel.plotSlots[3] as XyPlot).lineStyle!.color,
  ]);
});

it('rejects invalid ranges, duplicated parameters, nonfinite numbers and short palettes', () => {
  for (const mapping of [
    {
      source: 'index',
      colors: ['#000000', '#ffffff'],
      domain: { min: 3, max: 2 },
    },
    {
      source: 'values',
      colors: ['#000000', '#ffffff'],
      values: [
        { plotSlotId: 'a', value: 1 },
        { plotSlotId: 'a', value: 2 },
      ],
    },
    {
      source: 'values',
      colors: ['#000000', '#ffffff'],
      values: [{ plotSlotId: 'a', value: Infinity }],
    },
    { source: 'index', colors: ['#000000'] },
  ])
    expect(() =>
      validateCurveGroups(fixture({ colorMapping: mapping })),
    ).toThrow();
});

it('keeps independent children out of automatic numeric domains', () => {
  const panel = fixture({
    members: ['a', 'b', 'c'],
    colorMapping: {
      source: 'values',
      colors: ['#000000', '#ffffff'],
      values: [
        { plotSlotId: 'a', value: 0 },
        { plotSlotId: 'b', value: 1 },
        { plotSlotId: 'c', value: 2 },
        { plotSlotId: 'd', value: 100 },
      ],
    },
  });
  panel.groups!.push({
    groupId: 'child',
    name: '子组',
    parentId: 'g',
    members: ['d'],
    mode: 'independent',
    increment: 'synchronized',
    step: 1,
  });
  expect(colors(panel).slice(0, 3)).toEqual(['#000000', '#808080', '#ffffff']);
});

it.each(['display', 'export'] as const)(
  'uses mapped whole-curve colors in %s SVG and legend samples',
  (purpose) => {
    const template = chartTemplate('xy');
    template.panels[0] = fixture({
      colorMapping: { source: 'index', colors: ['#000000', '#ffffff'] },
    });
    const result = renderFigureSvg(
      template,
      chartData({ x: [0, 1, 2], y: [1, 3, 2] }),
      { purpose },
    );
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    const lines = [
      ...result.svg.matchAll(/<line\b[^>]*data-role="legend-line"[^>]*>/g),
    ].map((match) => match[0].match(/stroke="([^"]+)"/)?.[1]);
    expect(lines).toEqual(['#000000', '#555555', '#aaaaaa', '#ffffff']);
    for (const color of ['#555555', '#aaaaaa'])
      expect(result.svg).toMatch(new RegExp(`<path[^>]+stroke="${color}"`));
  },
);
