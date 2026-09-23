import { describe, expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import {
  initialPropertyObject,
  listPropertyObjects,
  propertyObjectKey,
  resolvePropertyObject,
} from './property-objects.js';

describe('property object identities', () => {
  it('keeps separator-containing identities distinct', () => {
    expect(
      propertyObjectKey({ kind: 'axis', panelId: 'a:b', axisId: 'c' }),
    ).not.toBe(
      propertyObjectKey({ kind: 'axis', panelId: 'a', axisId: 'b:c' }),
    );
  });

  it('groups each actual plot and axis under its own panel', () => {
    const template = defaultTemplate();
    const second = structuredClone(template.panels[0]!);
    second.panelId = 'second';
    second.plotSlots[0]!.plotSlotId = 'second-plot';
    second.axes.forEach((axis) => {
      axis.axisId += '-second';
    });
    template.panels.push(second);
    const objects = listPropertyObjects(template);
    expect(objects.map((object) => object.label)).toEqual([
      `图页 ${template.metadata.name}`,
      '图层 panel-main',
      '曲线 Series 1',
      '下 X 轴',
      '左 Y 轴',
      '上 X 轴',
      '右 Y 轴',
      '图层 second',
      '曲线 Series 1',
      '下 X 轴',
      '左 Y 轴',
      '上 X 轴',
      '右 Y 轴',
    ]);
    expect(new Set(objects.map((object) => object.key)).size).toBe(
      objects.length,
    );
    expect(
      objects.slice(8).every((object) => object.caption.includes('second')),
    ).toBe(true);
    expect(objects.slice(8).every((object) => object.depth === 2)).toBe(true);
    expect(objects[8]!.ref).toEqual({
      kind: 'plot',
      panelId: 'second',
      plotSlotId: 'second-plot',
    });
  });

  it('only lists existing axes and distinguishes equal positions', () => {
    const template = defaultTemplate();
    const panel = template.panels[0]!;
    panel.axes = panel.axes.filter((axis) => axis.position !== 'top');
    panel.axes.push({
      ...structuredClone(panel.axes[0]!),
      axisId: 'other-bottom',
    });
    const axes = listPropertyObjects(template).filter(
      (object) => object.ref.kind === 'axis',
    );
    expect(axes.some((object) => object.label === '上 X 轴')).toBe(false);
    expect(axes.map((object) => object.label)).toContain('下 X 轴（axis-x）');
    expect(axes.map((object) => object.label)).toContain(
      '下 X 轴（other-bottom）',
    );
  });

  it('selects an active layer without requiring a curve', () => {
    const template = defaultTemplate();
    const empty = structuredClone(template.panels[0]!);
    empty.panelId = 'empty';
    empty.plotSlots = [];
    template.panels.push(empty);
    expect(initialPropertyObject(template, 'empty')).toEqual({
      kind: 'panel',
      panelId: 'empty',
    });
    expect(initialPropertyObject(template, 'missing')).toEqual({
      kind: 'plot',
      panelId: 'panel-main',
      plotSlotId: 'series-1',
    });
    expect(
      listPropertyObjects(template).filter((object) =>
        object.caption.includes('empty'),
      ),
    ).toHaveLength(5);
    template.panels = [];
    expect(initialPropertyObject(template)).toEqual({ kind: 'page' });
  });

  it('keeps identities through reordering and falls back after removal', () => {
    const template = defaultTemplate();
    const ref = {
      kind: 'axis',
      panelId: 'panel-main',
      axisId: 'frame-y',
    } as const;
    template.panels[0]!.axes.reverse();
    template.metadata.name = 'renamed';
    expect(resolvePropertyObject(template, ref)).toEqual(ref);
    template.panels[0]!.axes = template.panels[0]!.axes.filter(
      (axis) => axis.axisId !== 'frame-y',
    );
    expect(resolvePropertyObject(template, ref)).toEqual({
      kind: 'panel',
      panelId: 'panel-main',
    });
    template.panels = [];
    expect(resolvePropertyObject(template, ref)).toEqual({ kind: 'page' });
  });
});
