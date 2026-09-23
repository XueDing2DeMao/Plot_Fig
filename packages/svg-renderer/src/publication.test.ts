import { expect, it } from 'vitest';
import {
  defaultShapeStyle,
  defaultTextStyle,
  defaultLegendLayout,
} from '@plot-fig/figure-schema';
import {
  chartTemplate,
  chartData,
} from '../../../tests/helpers/chart-fixtures.js';
import { renderTemplateSvg } from './render.js';
import { preparePlot } from './charts/prepare.js';

it('renders styled arrows and foreground page annotations without Legend placeholders', () => {
  const t = chartTemplate('xy');
  t.panels[0]!.plotSlots[0]!.legendEntry.visible = false;
  t.annotations = [
    {
      annotationId: 'arrow',
      kind: 'arrow',
      coordinateSpace: 'page',
      start: { x: 0.1, y: 0.1 },
      end: { x: 0.4, y: 0.5 },
      shapeStyle: defaultShapeStyle(),
    },
    {
      annotationId: 'text',
      kind: 'text',
      coordinateSpace: 'page',
      position: { x: 0.2, y: 0.9 },
      text: '温度 α',
      format: 'plain',
      textStyle: { ...defaultTextStyle(), rotation: 30 },
    },
    {
      annotationId: 'legend',
      kind: 'legend',
      coordinateSpace: 'page',
      position: { x: 0.9, y: 0.9 },
      visible: true,
      layout: defaultLegendLayout(),
      textStyle: { ...defaultTextStyle(), rotation: 15 },
    },
  ];
  const r = renderTemplateSvg(t, chartData({ x: [0, 1], y: [2, 3] }));
  expect(r.ok).toBe(true);
  if (r.ok) {
    expect(r.svg).toContain('data-role="arrow-head"');
    expect(r.svg).toContain('rotate(30');
    expect(r.svg).toMatch(/dominant-baseline="middle" transform="rotate\(15/);
    expect(r.svg).not.toContain('>Legend</text>');
    expect(r.svg.lastIndexOf('annotation-text')).toBeGreaterThan(
      r.svg.indexOf('data-role="panel"'),
    );
    expect(r.svg.match(/data-role="legend"/g)).toHaveLength(1);
  }
});
it('includes valid XY errors in automatic domains and preserves centers with invalid errors', () => {
  const t = chartTemplate('xy');
  const p: any = t.panels[0]!.plotSlots[0];
  p.bindings.yError = 'slot-yError';
  p.errorBarStyle = {
    visible: true,
    color: '#111111',
    widthPt: 1,
    capWidthPt: 4,
  };
  const prepared = preparePlot(
    p,
    chartData({ x: [0, 1], y: [2, 3], yError: [5, -1] }),
  );
  expect(prepared.yValues).toContain(-3);
  expect(prepared.yValues).toContain(7);
  expect(prepared.yValues).toContain(3);
});
it('draws grouped bar errors', () => {
  const t = chartTemplate('bar');
  const p: any = t.panels[0]!.plotSlots[0];
  t.dataSlots.push({
    dataSlotId: 'slot-valueError',
    name: 'error',
    role: 'valueError',
    valueType: 'number',
    required: false,
  });
  p.bindings.valueError = 'slot-valueError';
  p.errorBarStyle = {
    visible: true,
    color: '#111111',
    widthPt: 1,
    capWidthPt: 4,
  };
  const r = renderTemplateSvg(
    t,
    chartData({ category: ['A', 'B'], value: [2, 3], valueError: [1, 2] }),
  );
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.svg.match(/data-role="error-bar"/g)).toHaveLength(2);
});
it('unifies X domains across panels while retaining their own data bindings', () => {
  const t = chartTemplate('xy');
  const first = t.panels[0]!;
  first.frame = { x: 0.1, y: 0.1, width: 0.35, height: 0.7 };
  const second = structuredClone(first);
  second.panelId = 'second';
  second.frame.x = 0.6;
  second.axes.forEach((a) => (a.axisId += '-2'));
  const p: any = second.plotSlots[0];
  p.plotSlotId += '-2';
  p.xAxisId += '-2';
  p.yAxisId += '-2';
  p.bindings.x = 'slot-x2';
  t.dataSlots.push({
    dataSlotId: 'slot-x2',
    name: 'x2',
    role: 'x',
    valueType: 'number',
    required: true,
  });
  t.panels.push(second);
  t.sharedAxisGroups = [
    {
      groupId: 'share',
      members: [
        { panelId: first.panelId, axisId: first.axes[0]!.axisId },
        { panelId: second.panelId, axisId: second.axes[0]!.axisId },
      ],
    },
  ];
  const r = renderTemplateSvg(
    t,
    chartData({ x: [0, 1], x2: [10, 20], y: [1, 2] }),
  );
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.svg.match(/>20<\/text>/g)).toHaveLength(2);
});
