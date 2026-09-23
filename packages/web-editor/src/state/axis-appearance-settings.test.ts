import { describe, expect, it } from 'vitest';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from './default-template.js';
import { axisDetails, applyAxisDetails } from './figure-details.js';
import {
  readAxis,
  readFigureSettings,
  updateAxis,
  updateFigureSettings,
} from './figure-settings.js';
import { alignChartAxes } from './chart-operations.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';

const appearance = {
  bold: true,
  italic: true,
  position: 0.25,
  rotation: -25,
  offsetPt: { x: -2, y: 3 },
} as const;
const grid = {
  major: { visible: true, color: '#123456', widthPt: 0.5, dash: 'dotted' },
  minor: { visible: true, color: '#654321', widthPt: 0.25, dash: 'solid' },
  layer: 'front',
} as const;
const xRef = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-x' } as const;

describe('axis appearance state', () => {
  it('reads a detached appearance snapshot and preserves it through title font edits', () => {
    const axis = defaultTemplate().panels[0]!.axes[0]!;
    Object.assign(axis, {
      grid,
      placement: { mode: 'percent', percent: 25, offsetPt: -2 },
    });
    Object.assign(axis.title!, appearance);
    const original = structuredClone(axis);
    const details = axisDetails(axis);
    expect(details).toMatchObject({
      grid,
      placement: { mode: 'percent', percent: 25, offsetPt: -2 },
      titleAppearance: { format: 'auto', ...appearance },
    });
    details.titleFont.sizePt = 16;
    applyAxisDetails(axis, details);
    expect(axis.title).toEqual({ ...original.title, fontSizePt: 16 });
    expect(axis.grid).toEqual(grid);
    expect(axis.placement).toEqual(original.placement);
    expect(original.title!.fontSizePt).not.toBe(16);
  });

  it('keeps title appearance when changing its text, clearing it, and restoring it', () => {
    const axis = defaultTemplate().panels[0]!.axes[0]!;
    Object.assign(axis.title!, appearance);
    const original = structuredClone(axis.title);
    updateAxis(axis, { ...readAxis(axis), title: 'Changed' });
    expect(axis.title).toEqual({ ...original, text: 'Changed' });
    updateAxis(axis, { ...readAxis(axis), title: '' });
    expect(axis.title).toEqual({ ...original, text: '' });
    updateAxis(axis, { ...readAxis(axis), title: 'Restored' });
    expect(axis.title).toEqual({ ...original, text: 'Restored' });
  });

  it('removes optional appearance settings when explicitly deleted from the snapshot', () => {
    const axis = defaultTemplate().panels[0]!.axes[0]!;
    Object.assign(axis, { grid, placement: { mode: 'percent', percent: 25 } });
    Object.assign(axis.title!, appearance);
    const details = axisDetails(axis);
    delete details.grid;
    delete details.placement;
    delete details.titleAppearance;
    applyAxisDetails(axis, details);
    expect(axis).not.toHaveProperty('grid');
    expect(axis).not.toHaveProperty('placement');
    expect(axis.title).not.toHaveProperty('position');
    expect(axis.title).not.toHaveProperty('bold');
  });

  it('normalizes category-only incompatibilities and invalidated crossings without losing styles', () => {
    const template = chartTemplate('bar');
    const panel = template.panels[0]!;
    const x = panel.axes.find((axis) => axis.axisId === 'axis-x')!;
    const y = panel.axes.find((axis) => axis.axisId === 'axis-y')!;
    Object.assign(x, {
      placement: { mode: 'cross', axisId: 'axis-y', value: 2, offsetPt: -1 },
    });
    Object.assign(y.tickLabels, {
      notation: 'engineering',
      divisor: 1000,
      prefix: '(',
      suffix: ')',
      rotation: 20,
      bold: true,
    });
    Object.assign(y, {
      grid: structuredClone(grid),
      placement: { mode: 'percent', percent: 40 },
    });
    y.title = {
      ...defaultTemplate().panels[0]!.axes[0]!.title!,
      ...appearance,
    };
    const plot = panel.plotSlots[0]!;
    if (plot.kind !== 'bar') throw new Error('expected bar');
    plot.orientation = 'horizontal';
    alignChartAxes(template, plot);
    expect(x).not.toHaveProperty('placement');
    expect(y.tickLabels).toMatchObject({
      notation: 'auto',
      prefix: '(',
      suffix: ')',
      rotation: 20,
      bold: true,
    });
    expect(y.tickLabels).not.toHaveProperty('divisor');
    expect(y.grid).toEqual({
      ...grid,
      minor: { ...grid.minor, visible: false },
    });
    expect(y.placement).toEqual({ mode: 'percent', percent: 40 });
    expect(y.title).toMatchObject(appearance);
  });

  it('updates a shared range without sharing grid, placement, labels or title appearance', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    const x = panel.axes[0]!;
    const peer = panel.axes[2]!;
    Object.assign(x, { grid, placement: { mode: 'percent', percent: 25 } });
    Object.assign(x.title!, appearance);
    Object.assign(peer, { placement: { mode: 'frame', offsetPt: 5 } });
    template.sharedAxisGroups = [
      {
        groupId: 'x-group',
        members: [
          { panelId: panel.panelId, axisId: x.axisId },
          { panelId: panel.panelId, axisId: peer.axisId },
        ],
      },
    ];
    const oldPeer = structuredClone(peer);
    const value = readPropertyObjectSettings(template, xRef);
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.range = { title: 'Edited', min: '-2', max: '3' };
    const next = updatePropertyObjectSettings(template, xRef, value);
    expect(next.panels[0]!.axes[0]).toMatchObject({
      grid,
      title: { ...appearance, text: 'Edited' },
    });
    expect(next.panels[0]!.axes[2]).toEqual({
      ...oldPeer,
      range: { mode: 'fixed', min: -2, max: 3 },
    });
    const workspace = { tables: [], activeTableId: null, slotBindings: {} };
    next.panels[0]!.axes[0]!.extensions = {
      origin: { future: { keep: ['custom', 1] } },
    };
    expect(
      parseWorkspaceProject(serializeWorkspaceProject(next, workspace)),
    ).toEqual({ ok: true, template: next, workspace });
  });

  it('legacy figure updates preserve new appearance and normalize orientation snapshots', () => {
    const template = chartTemplate('bar');
    const panel = template.panels[0]!;
    Object.assign(panel.axes[0]!, {
      placement: { mode: 'cross', axisId: 'axis-y', value: 1 },
    });
    Object.assign(panel.axes[1]!, { grid });
    panel.axes[1]!.title = {
      ...defaultTemplate().panels[0]!.axes[0]!.title!,
      ...appearance,
    };
    Object.assign(panel.axes[1]!.tickLabels, {
      notation: 'engineering',
      divisor: 1000,
      prefix: '€',
    });
    const settings = readFigureSettings(template, 'series-1');
    if (settings.plot.kind !== 'bar') throw new Error('expected bar');
    settings.plot.orientation = 'horizontal';
    settings.y.title = 'Categories';
    const next = updateFigureSettings(template, 'series-1', settings);
    const y = next.panels[0]!.axes[1]!;
    expect(next.panels[0]!.axes[0]).not.toHaveProperty('placement');
    expect(y.title).toMatchObject({ ...appearance, text: 'Categories' });
    expect(y.tickLabels).toMatchObject({ notation: 'auto', prefix: '€' });
    expect(y.tickLabels).not.toHaveProperty('divisor');
    expect(y.grid!.minor).toEqual({ ...grid.minor, visible: false });
  });
});
