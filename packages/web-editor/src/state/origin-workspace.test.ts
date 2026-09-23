import { describe, expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import {
  activateOriginWindow,
  createOriginWorkspaceState,
  resolveOriginPropertyCommand,
  resolveOriginAxisCommand,
  selectOriginObject,
} from './origin-workspace.js';

describe('Origin workspace command routing', () => {
  it('axis menu resolves the requested dimension in the selected layer and rejects stale selections', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    const state = selectOriginObject(createOriginWorkspaceState(), {
      kind: 'panel',
      panelId: panel.panelId,
    });
    expect(resolveOriginAxisCommand(template, state, 'y')).toEqual({
      enabled: true,
      dialog: 'axis',
      target: { kind: 'axis', panelId: panel.panelId, axisId: 'axis-y' },
    });
    expect(
      resolveOriginAxisCommand(
        template,
        selectOriginObject(state, {
          kind: 'axis',
          panelId: panel.panelId,
          axisId: 'removed-axis',
        }),
        'y',
      ),
    ).toMatchObject({ enabled: false, reason: 'stale-selection' });
    panel.axes = panel.axes.filter((axis) => axis.dimension !== 'x');
    expect(resolveOriginAxisCommand(template, state, 'x')).toMatchObject({
      enabled: false,
    });
  });
  it('routes an explicitly selected second plot by stable ids', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    panel.plotSlots.push({
      ...structuredClone(panel.plotSlots[0]!),
      plotSlotId: 'series-2',
      legendEntry: { ...panel.plotSlots[0]!.legendEntry, text: 'Series 1' },
    });
    const state = selectOriginObject(createOriginWorkspaceState(), {
      kind: 'plot',
      panelId: panel.panelId,
      plotSlotId: 'series-2',
    });
    expect(
      resolveOriginPropertyCommand(template, state, 'format.plot'),
    ).toEqual({
      enabled: true,
      target: { kind: 'plot', panelId: panel.panelId, plotSlotId: 'series-2' },
      dialog: 'plot',
    });
  });

  it('keeps page available but disables plot when selection is missing', () => {
    const template = defaultTemplate();
    const state = createOriginWorkspaceState();
    expect(
      resolveOriginPropertyCommand(template, state, 'format.page'),
    ).toEqual({ enabled: true, target: { kind: 'page' }, dialog: 'page' });
    expect(
      resolveOriginPropertyCommand(template, state, 'format.plot'),
    ).toMatchObject({ enabled: false, reason: 'no-selection' });
  });

  it('does not fall back after selected plot is removed', () => {
    const template = defaultTemplate();
    const ref = {
      kind: 'plot',
      panelId: template.panels[0]!.panelId,
      plotSlotId: template.panels[0]!.plotSlots[0]!.plotSlotId,
    } as const;
    const state = selectOriginObject(createOriginWorkspaceState(), ref);
    template.panels[0]!.plotSlots = [];
    const result = resolveOriginPropertyCommand(template, state, 'format.plot');
    expect(result).toEqual({ enabled: false, reason: 'stale-selection' });
    expect(result).not.toHaveProperty('target');
  });

  it('uses the selected panel for layer, and exact axis for axis', () => {
    const template = defaultTemplate();
    const panelId = template.panels[0]!.panelId;
    const axisId = template.panels[0]!.axes[0]!.axisId;
    const panelState = selectOriginObject(createOriginWorkspaceState(), {
      kind: 'panel',
      panelId,
    });
    expect(
      resolveOriginPropertyCommand(template, panelState, 'format.layer'),
    ).toEqual({
      enabled: true,
      target: { kind: 'panel', panelId },
      dialog: 'layer',
    });
    const axisState = selectOriginObject(panelState, {
      kind: 'axis',
      panelId,
      axisId,
    });
    expect(
      resolveOriginPropertyCommand(template, axisState, 'format.axis'),
    ).toEqual({
      enabled: true,
      target: { kind: 'axis', panelId, axisId },
      dialog: 'axis',
    });
  });

  it('disables graph property commands in worksheet window', () => {
    const template = defaultTemplate();
    const state = activateOriginWindow(
      createOriginWorkspaceState(),
      'worksheet',
    );
    expect(
      resolveOriginPropertyCommand(template, state, 'format.page'),
    ).toEqual({ enabled: false, reason: 'worksheet-active' });
  });
});
