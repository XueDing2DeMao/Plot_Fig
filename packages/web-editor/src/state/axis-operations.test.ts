import { describe, expect, it } from 'vitest';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { defaultTemplate } from './default-template.js';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { shareAxes } from './panel-operations.js';
import {
  addOppositeAxis,
  bindPlotAxes,
  ensurePlotAxis,
  setOppositeAxisSharing,
  setYAxisAlignment,
} from './axis-operations.js';

function twoSeriesWithoutRightAxis(): FigureTemplate {
  const template = defaultTemplate();
  const panel = template.panels[0]!;
  panel.axes = panel.axes.filter((axis) => axis.position !== 'right');
  panel.plotSlots.push({
    ...structuredClone(panel.plotSlots[0]!),
    plotSlotId: 'series-2',
  });
  return template;
}

describe('axis operations', () => {
  it('clears legacy range rules through the cross-layer sharing entry point', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes.forEach((axis) => {
      axis.compatibility = { unboundRange: 'panel-v1.7' };
    });
    const peer = structuredClone(template.panels[0]!);
    peer.panelId = 'peer';
    peer.axes.forEach((axis) => {
      axis.axisId += '-peer';
    });
    peer.plotSlots = [];
    template.panels.push(peer);
    const shared = shareAxes(template, {
      dimension: 'y',
      panelIds: ['panel-main', 'peer'],
      enabled: true,
    });
    expect(
      shared.panels.map(
        (panel) =>
          panel.axes.find((axis) => axis.position === 'left')!.compatibility,
      ),
    ).toEqual([undefined, undefined]);
  });
  it('creates a visible automatic right Y axis and binds only the selected curve', () => {
    const template = twoSeriesWithoutRightAxis();

    const next = ensurePlotAxis(template, 'panel-main', 'series-2', 'right');

    const right = next.panels[0]!.axes.find(
      (axis) => axis.position === 'right',
    )!;
    expect(right).toMatchObject({
      dimension: 'y',
      visible: true,
      range: { mode: 'auto' },
      rescale: { mode: 'auto' },
    });
    expect(next.panels[0]!.plotSlots[0]!.yAxisId).toBe('axis-y');
    expect(next.panels[0]!.plotSlots[1]!.yAxisId).toBe(right.axisId);
    expect(template.panels[0]!.axes).toHaveLength(3);
  });

  it('reuses an existing opposite axis without resetting its range', () => {
    const template = defaultTemplate();
    const right = template.panels[0]!.axes.find(
      (axis) => axis.position === 'right',
    )!;
    right.range = { mode: 'fixed', min: -2, max: 2 };
    right.visible = false;

    const next = ensurePlotAxis(template, 'panel-main', 'series-1', 'right');

    expect(next.panels[0]!.axes).toHaveLength(template.panels[0]!.axes.length);
    expect(
      next.panels[0]!.axes.find((axis) => axis.axisId === right.axisId),
    ).toMatchObject({
      visible: true,
      range: { mode: 'fixed', min: -2, max: 2 },
    });
    expect(next.panels[0]!.plotSlots[0]!.yAxisId).toBe(right.axisId);
  });

  it('adds a missing top axis once without changing curve bindings', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    panel.axes = panel.axes.filter((axis) => axis.position !== 'top');
    const originalAxisId = panel.plotSlots[0]!.xAxisId;

    const added = addOppositeAxis(template, 'panel-main', 'top');
    const repeated = addOppositeAxis(added, 'panel-main', 'top');

    expect(
      repeated.panels[0]!.axes.filter((axis) => axis.position === 'top'),
    ).toHaveLength(1);
    expect(repeated.panels[0]!.plotSlots[0]!.xAxisId).toBe(originalAxisId);
    expect(repeated.sharedAxisGroups).toEqual([
      expect.objectContaining({
        members: expect.arrayContaining([
          { panelId: 'panel-main', axisId: originalAxisId },
          {
            panelId: 'panel-main',
            axisId: repeated.panels[0]!.axes.find(
              (axis) => axis.position === 'top',
            )!.axisId,
          },
        ]),
      }),
    ]);
  });

  it('rejects curve bindings to the wrong dimension', () => {
    const template = defaultTemplate();

    expect(() =>
      bindPlotAxes(template, 'panel-main', 'series-1', {
        xAxisId: 'axis-y',
        yAxisId: 'axis-y',
      }),
    ).toThrow('曲线必须绑定同一图层内正确方向的坐标轴');
  });

  it('switches the opposite Y pair between sharing and value alignment', () => {
    const template = defaultTemplate();
    const right = template.panels[0]!.axes.find(
      (axis) => axis.position === 'right',
    )!;
    right.visible = true;

    const aligned = setYAxisAlignment(template, 'panel-main', 0);
    expect(aligned.panels[0]!.yAxisAlignment).toEqual({
      leftAxisId: 'axis-y',
      rightAxisId: right.axisId,
      value: 0,
    });

    const shared = setOppositeAxisSharing(
      aligned,
      'panel-main',
      right.axisId,
      true,
    );
    expect(shared.panels[0]!.yAxisAlignment).toBeUndefined();
    expect(shared.sharedAxisGroups).toEqual([
      expect.objectContaining({
        members: [
          { panelId: 'panel-main', axisId: right.axisId },
          { panelId: 'panel-main', axisId: 'axis-y' },
        ],
      }),
    ]);

    const realigned = setYAxisAlignment(shared, 'panel-main', -0.25);
    expect(realigned.sharedAxisGroups ?? []).toHaveLength(0);
    expect(realigned.panels[0]!.yAxisAlignment?.value).toBe(-0.25);
  });

  it('synchronizes every member when an opposite axis joins an existing group', () => {
    const template = defaultTemplate();
    const first = template.panels[0]!;
    const peer = structuredClone(first);
    peer.panelId = 'peer';
    peer.axes.forEach((axis) => (axis.axisId += '-peer'));
    peer.plotSlots = [];
    template.panels.push(peer);
    template.sharedAxisGroups = [
      {
        groupId: 'left-y-group',
        members: [
          { panelId: first.panelId, axisId: 'axis-y' },
          { panelId: peer.panelId, axisId: 'axis-y-peer' },
        ],
      },
    ];
    first.axes.find((axis) => axis.axisId === 'frame-y')!.range = {
      mode: 'fixed',
      min: -10,
      max: 10,
    };

    const shared = setOppositeAxisSharing(
      template,
      first.panelId,
      'frame-y',
      true,
    );

    const ranges = shared.sharedAxisGroups![0]!.members.map(
      (member) =>
        shared.panels
          .find((panel) => panel.panelId === member.panelId)!
          .axes.find((axis) => axis.axisId === member.axisId)!.range,
    );
    expect(ranges).toEqual([
      { mode: 'fixed', min: -10, max: 10 },
      { mode: 'fixed', min: -10, max: 10 },
      { mode: 'fixed', min: -10, max: 10 },
    ]);
  });

  it('creates a categorical right axis for a horizontal bar chart', () => {
    const template = chartTemplate('bar');
    const panel = template.panels[0]!;
    const plot = panel.plotSlots[0]!;
    if (plot.kind !== 'bar') throw new Error('expected bar');
    plot.orientation = 'horizontal';
    panel.axes.forEach((axis) => {
      axis.scale = axis.dimension === 'y' ? 'category' : 'linear';
    });

    const next = ensurePlotAxis(
      template,
      panel.panelId,
      plot.plotSlotId,
      'right',
    );
    const right = next.panels[0]!.axes.find(
      (axis) => axis.position === 'right',
    )!;
    expect(right).toMatchObject({ scale: 'category', range: { mode: 'auto' } });
    expect(right.rescale).toBeUndefined();
    expect(next.panels[0]!.plotSlots[0]!.yAxisId).toBe(right.axisId);
  });

  it('does not inherit legacy fallback when creating or rebinding a curve axis', () => {
    const template = twoSeriesWithoutRightAxis();
    template.panels[0]!.axes.forEach((axis) => {
      axis.compatibility = { unboundRange: 'panel-v1.7' };
    });
    const created = ensurePlotAxis(template, 'panel-main', 'series-2', 'right');
    expect(
      created.panels[0]!.axes.find((axis) => axis.position === 'right')!
        .compatibility,
    ).toBeUndefined();
    const rebound = bindPlotAxes(created, 'panel-main', 'series-2', {
      xAxisId: 'frame-x',
      yAxisId: 'axis-y',
    });
    expect(
      rebound.panels[0]!.axes.find((axis) => axis.axisId === 'axis-y')!
        .compatibility,
    ).toBeUndefined();
    expect(
      rebound.panels[0]!.axes.find((axis) => axis.axisId === 'frame-x')!
        .compatibility,
    ).toBeUndefined();
    expect(
      rebound.panels[0]!.axes.find((axis) => axis.axisId === 'axis-x')!
        .compatibility,
    ).toBeDefined();
  });
});
