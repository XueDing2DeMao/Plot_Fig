import { describe, expect, it } from 'vitest';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
import { chartTemplate } from '../../../../tests/helpers/chart-fixtures.js';
import { defaultTemplate } from './default-template.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import { synchronizeSharedAxis } from './publication-utils.js';

const right = {
  kind: 'axis',
  panelId: 'panel-main',
  axisId: 'frame-y',
} as const;

function axisSettings(template = defaultTemplate(), ref = right) {
  const value = readPropertyObjectSettings(template, ref);
  if (value.kind !== 'axis') throw new Error('expected axis settings');
  return value;
}

describe('independent property settings', () => {
  it('edits page metadata and an empty layer without a plot', () => {
    const template = defaultTemplate();
    template.panels[0]!.plotSlots = [];
    template.page.extensions = { origin: { unknown: 'page' } };
    const original = structuredClone(template);
    const page = readPropertyObjectSettings(template, { kind: 'page' });
    if (page.kind !== 'page') throw new Error('expected page');
    page.metadata.name = 'Renamed';
    page.metadata.description = 'Description';
    page.page.size.width.value = 200;
    const next = updatePropertyObjectSettings(template, { kind: 'page' }, page);
    const ref = { kind: 'panel', panelId: 'panel-main' } as const;
    const panel = readPropertyObjectSettings(next, ref);
    if (panel.kind !== 'panel') throw new Error('expected panel');
    panel.frame.width = 0.6;
    panel.clip = false;
    const updated = updatePropertyObjectSettings(next, ref, panel);
    expect(updated.metadata).toEqual({
      ...original.metadata,
      name: 'Renamed',
      description: 'Description',
    });
    expect(updated.page.size.width.value).toBe(200);
    expect(updated.page.extensions).toEqual(original.page.extensions);
    expect(updated.panels[0]).toMatchObject({
      frame: { width: 0.6 },
      clip: false,
      plotSlots: [],
    });
    expect(updated.panels[0]!.axes).toEqual(original.panels[0]!.axes);
    expect(template).toEqual(original);
    expect(validateFigureTemplate(updated).ok).toBe(true);
  });

  it('reads detached settings and updates exactly the selected right axis', () => {
    const template = defaultTemplate();
    template.panels[0]!.axes[3]!.extensions = { origin: { untouched: [1, 2] } };
    const original = structuredClone(template);
    const value = axisSettings(template);
    value.range = { title: 'Right', min: '-1.25e-1', max: '2.5e-1' };
    value.details.line.color = '#ff0000';
    value.details.titleFont.sizePt = 14;
    expect(template).toEqual(original);
    const updated = updatePropertyObjectSettings(template, right, value);
    expect(updated.panels[0]!.axes[3]).toMatchObject({
      axisId: 'frame-y',
      position: 'right',
      dimension: 'y',
      range: { mode: 'fixed', min: -0.125, max: 0.25 },
      title: { text: 'Right', fontSizePt: 14 },
      line: { color: '#ff0000' },
      extensions: original.panels[0]!.axes[3]!.extensions,
    });
    expect(updated.panels[0]!.axes.slice(0, 3)).toEqual(
      original.panels[0]!.axes.slice(0, 3),
    );
    expect(updated.panels[0]!.plotSlots).toEqual(original.panels[0]!.plotSlots);
    expect(template).toEqual(original);
  });

  it.each(['-', '1e-', 'NaN', 'Infinity', ''])(
    'rejects incomplete or nonfinite range %s',
    (min) => {
      const template = defaultTemplate();
      const value = axisSettings(template);
      value.range.min = min;
      value.range.max = '1';
      expect(() =>
        updatePropertyObjectSettings(template, right, value),
      ).toThrow(/Y 轴/);
    },
  );

  it('validates ordering and log domains, then restores automatic bounds', () => {
    const template = defaultTemplate();
    const value = axisSettings(template);
    value.range.min = '2';
    value.range.max = '1';
    expect(() => updatePropertyObjectSettings(template, right, value)).toThrow(
      /最小值/,
    );
    value.details.scale = 'log10';
    value.range.min = '-1';
    expect(() => updatePropertyObjectSettings(template, right, value)).toThrow(
      /正数/,
    );
    value.range.min = '';
    value.range.max = '';
    expect(
      updatePropertyObjectSettings(template, right, value).panels[0]!.axes[3]!
        .range,
    ).toEqual({ mode: 'auto' });
  });

  it('rejects invalid page sizes and overflowing panel frames', () => {
    const template = defaultTemplate();
    const page = readPropertyObjectSettings(template, { kind: 'page' });
    if (page.kind !== 'page') throw new Error('expected page');
    page.page.size.width.value = 0;
    expect(() =>
      updatePropertyObjectSettings(template, { kind: 'page' }, page),
    ).toThrow();
    const ref = { kind: 'panel', panelId: 'panel-main' } as const;
    const panel = readPropertyObjectSettings(template, ref);
    if (panel.kind !== 'panel') throw new Error('expected panel');
    panel.frame.x = 0.9;
    expect(() => updatePropertyObjectSettings(template, ref, panel)).toThrow();
  });

  it('does not replace new page or axis values with a stale curve snapshot', () => {
    const template = defaultTemplate();
    const ref = {
      kind: 'plot',
      panelId: 'panel-main',
      plotSlotId: 'series-1',
    } as const;
    const plot = readPropertyObjectSettings(template, ref);
    if (plot.kind !== 'plot') throw new Error('expected plot');
    const axis = axisSettings(template);
    axis.range = { title: 'Updated', min: '-0.1', max: '0.1' };
    const changed = updatePropertyObjectSettings(template, right, axis);
    changed.page.size.width.value = 240;
    changed.panels[0]!.extensions = { origin: { panel: true } };
    changed.panels[0]!.plotSlots[0]!.extensions = { origin: { current: true } };
    changed.annotations.push({
      kind: 'text',
      annotationId: 'note',
      coordinateSpace: 'page',
      position: { x: 0, y: 0 },
      text: 'keep',
      format: 'plain',
    });
    plot.settings.line.color = '#ff0000';
    plot.settings.marker.shape = 'diamond';
    plot.settings.details.mode = 'line';
    plot.settings.details.legend.text = 'Curve';
    const updated = updatePropertyObjectSettings(changed, ref, plot);
    expect(updated.page).toEqual(changed.page);
    expect(updated.panels[0]!.axes).toEqual(changed.panels[0]!.axes);
    expect(updated.panels[0]!.extensions).toEqual(
      changed.panels[0]!.extensions,
    );
    expect(updated.panels[0]!.plotSlots[0]).toMatchObject({
      mode: 'line',
      lineStyle: { color: '#ff0000' },
      markerStyle: { shape: 'diamond' },
      legendEntry: { text: 'Curve' },
      extensions: { origin: { current: true } },
    });
    expect(updated.annotations).toEqual(changed.annotations);
    expect(updated.dataSlots).toEqual(changed.dataSlots);
  });

  it.each(['plotSlotId', 'kind', 'bindings'] as const)(
    'rejects changing protected curve %s',
    (field) => {
      const template = defaultTemplate();
      const ref = {
        kind: 'plot',
        panelId: 'panel-main',
        plotSlotId: 'series-1',
      } as const;
      const value = readPropertyObjectSettings(template, ref);
      if (value.kind !== 'plot') throw new Error('expected plot');
      Object.assign(value.settings.plot, {
        [field]:
          field === 'bindings' ? { x: 'slot-y', y: 'slot-x' } : 'changed',
      });
      expect(() =>
        updatePropertyObjectSettings(template, ref, value),
      ).toThrow();
    },
  );

  it('updates curve axis bindings only to valid axes in the same panel', () => {
    const template = defaultTemplate();
    const ref = {
      kind: 'plot',
      panelId: 'panel-main',
      plotSlotId: 'series-1',
    } as const;
    const value = readPropertyObjectSettings(template, ref);
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.plot.xAxisId = 'frame-x';
    value.settings.plot.yAxisId = 'frame-y';

    const updated = updatePropertyObjectSettings(template, ref, value);

    expect(updated.panels[0]!.plotSlots[0]).toMatchObject({
      xAxisId: 'frame-x',
      yAxisId: 'frame-y',
    });
    value.settings.plot.xAxisId = 'axis-y';
    expect(() => updatePropertyObjectSettings(template, ref, value)).toThrow(
      '曲线必须绑定同一图层内正确方向的坐标轴',
    );
  });

  it('reads and updates same-layer opposite-axis relationships', () => {
    const template = defaultTemplate();
    const value = axisSettings(template);

    expect(value.relations).toEqual({
      sharedWithOpposite: false,
      alignmentValue: undefined,
    });

    value.relations.alignmentValue = -0.25;
    const aligned = updatePropertyObjectSettings(template, right, value);
    expect(aligned.panels[0]!.yAxisAlignment).toEqual({
      leftAxisId: 'axis-y',
      rightAxisId: 'frame-y',
      value: -0.25,
    });

    const sharedValue = axisSettings(aligned);
    sharedValue.relations.sharedWithOpposite = true;
    delete sharedValue.relations.alignmentValue;
    const shared = updatePropertyObjectSettings(aligned, right, sharedValue);
    expect(shared.panels[0]!.yAxisAlignment).toBeUndefined();
    expect(shared.sharedAxisGroups).toEqual([
      expect.objectContaining({
        members: expect.arrayContaining([
          { panelId: 'panel-main', axisId: 'axis-y' },
          { panelId: 'panel-main', axisId: 'frame-y' },
        ]),
      }),
    ]);
  });

  it('removes the old alignment before validating a simultaneous log scale change', () => {
    const template = defaultTemplate();
    template.panels[0]!.yAxisAlignment = {
      leftAxisId: 'axis-y',
      rightAxisId: 'frame-y',
      value: 0,
    };
    const value = axisSettings(template);
    value.details.scale = 'log10';
    delete value.relations.alignmentValue;

    const updated = updatePropertyObjectSettings(template, right, value);

    expect(updated.panels[0]!.yAxisAlignment).toBeUndefined();
    expect(
      updated.panels[0]!.axes.find((axis) => axis.axisId === 'frame-y')!.scale,
    ).toBe('log10');
    expect(template.panels[0]!.yAxisAlignment?.value).toBe(0);
  });

  it('allows ordinary right axis edits in a layer with no left axis', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    panel.axes = panel.axes.filter((axis) => axis.position !== 'left');
    panel.plotSlots[0]!.yAxisId = 'frame-y';
    expect(validateFigureTemplate(template).ok).toBe(true);
    const value = axisSettings(template);
    value.details.visible = false;

    const updated = updatePropertyObjectSettings(template, right, value);

    expect(
      updated.panels[0]!.axes.find((axis) => axis.axisId === 'frame-y')!
        .visible,
    ).toBe(false);
  });

  it('applies a palette without filling hollow markers or changing bindings', () => {
    const template = defaultTemplate();
    const ref = {
      kind: 'plot',
      panelId: 'panel-main',
      plotSlotId: 'series-1',
    } as const;
    const value = readPropertyObjectSettings(template, ref);
    if (value.kind !== 'plot') throw new Error('expected plot');
    value.settings.palette = ['#4DBBD5', '#00A087'];
    value.settings.line.color = '#4DBBD5';
    value.settings.marker.stroke = '#4DBBD5';
    value.settings.marker.fill = 'none';
    const updated = updatePropertyObjectSettings(template, ref, value);
    expect(updated.theme.palette).toEqual(value.settings.palette);
    expect(updated.panels[0]!.plotSlots[0]).toMatchObject({
      lineStyle: { color: '#4DBBD5' },
      markerStyle: { stroke: '#4DBBD5', fill: 'none' },
      bindings: template.panels[0]!.plotSlots[0]!.bindings,
    });
    expect(updated.panels[0]!.axes).toEqual(template.panels[0]!.axes);
  });

  it('preserves the existing orientation change and resets affected axes', () => {
    const template = chartTemplate('bar');
    const panel = template.panels[0]!;
    const ref = {
      kind: 'plot',
      panelId: panel.panelId,
      plotSlotId: panel.plotSlots[0]!.plotSlotId,
    } as const;
    panel.axes[1]!.range = { mode: 'fixed', min: -1, max: 1 };
    const value = readPropertyObjectSettings(template, ref);
    if (value.kind !== 'plot' || value.settings.plot.kind !== 'bar')
      throw new Error('expected bar');
    value.settings.plot.orientation = 'horizontal';
    const updated = updatePropertyObjectSettings(template, ref, value);
    expect(updated.panels[0]!.axes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dimension: 'x',
          scale: 'linear',
          range: { mode: 'auto' },
        }),
        expect.objectContaining({
          dimension: 'y',
          scale: 'category',
          range: { mode: 'auto' },
          minorTicks: expect.objectContaining({ count: 0, visible: false }),
        }),
      ]),
    );
  });

  it('rejects a missing object or a mismatched settings kind instead of editing a fallback', () => {
    const template = defaultTemplate();
    expect(() =>
      readPropertyObjectSettings(template, { ...right, axisId: 'missing' }),
    ).toThrow();
    expect(() =>
      readPropertyObjectSettings(template, {
        kind: 'plot',
        panelId: 'missing',
        plotSlotId: 'series-1',
      }),
    ).toThrow();
    expect(() =>
      updatePropertyObjectSettings(
        template,
        { kind: 'page' },
        axisSettings(template),
      ),
    ).toThrow();
  });
});

describe('precise shared axis synchronization', () => {
  it('propagates only the selected group range, scale and reverse', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    const peer = structuredClone(panel);
    peer.panelId = 'peer';
    peer.plotSlots = [];
    peer.axes.forEach((axis) => {
      axis.axisId += '-peer';
    });
    template.panels.push(peer);
    template.sharedAxisGroups = [
      {
        groupId: 'bottoms',
        members: [
          { panelId: panel.panelId, axisId: 'axis-x' },
          { panelId: peer.panelId, axisId: 'axis-x-peer' },
        ],
      },
      {
        groupId: 'tops',
        members: [
          { panelId: panel.panelId, axisId: 'frame-x' },
          { panelId: peer.panelId, axisId: 'frame-x-peer' },
        ],
      },
    ];
    const original = structuredClone(template);
    const ref = {
      kind: 'axis',
      panelId: panel.panelId,
      axisId: 'frame-x',
    } as const;
    const value = readPropertyObjectSettings(template, ref);
    if (value.kind !== 'axis') throw new Error('expected axis');
    value.range = { title: 'Top', min: '1', max: '100' };
    value.details.scale = 'log10';
    value.details.reverse = true;
    value.details.line.color = '#ff0000';
    const updated = updatePropertyObjectSettings(template, ref, value);
    expect(updated.panels[1]!.axes[2]).toEqual({
      ...original.panels[1]!.axes[2],
      range: { mode: 'fixed', min: 1, max: 100 },
      scale: 'log10',
      reverse: true,
    });
    expect(updated.panels[0]!.axes[0]).toEqual(original.panels[0]!.axes[0]);
    expect(updated.panels[1]!.axes[0]).toEqual(original.panels[1]!.axes[0]);
    expect(template).toEqual(original);
    expect(validateFigureTemplate(updated).ok).toBe(true);
  });

  it('uses an exact source when one panel has multiple members in the same group', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    template.sharedAxisGroups = [
      {
        groupId: 'both-x',
        members: [
          { panelId: panel.panelId, axisId: 'axis-x' },
          { panelId: panel.panelId, axisId: 'frame-x' },
        ],
      },
    ];
    panel.axes[2]!.range = { mode: 'fixed', min: -0.2, max: 0.2 };
    synchronizeSharedAxis(template, {
      panelId: panel.panelId,
      axisId: 'frame-x',
    });
    expect(panel.axes[0]!.range).toEqual({
      mode: 'fixed',
      min: -0.2,
      max: 0.2,
    });
    expect(panel.axes[2]!.range).toEqual(panel.axes[0]!.range);
  });
});
