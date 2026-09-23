import { expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import { applyBatchProperties, batchGroups } from './batch-properties.js';
import { synchronizeSharedAxis, pruneSlots } from './publication-utils.js';
import { duplicatePanel } from './panel-operations.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import { validateFigureTemplate } from '@plot-fig/figure-schema';
const ref = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-y' } as const;
it('跨层批量复制 Rug 和统计参考线对应目标轴的曲线', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!,
    x = p.axes[0]!;
  x.advanced = {
    rug: {
      plotSlotIds: [p.plotSlots[0]!.plotSlotId],
      source: 'raw',
      arrangement: 'overlap',
      side: 'inside',
      followStyle: true,
    },
    references: {
      items: [
        {
          id: 'mean',
          kind: 'statistic',
          statistic: 'mean',
          plotSlotId: p.plotSlots[0]!.plotSlotId,
        },
      ],
    },
  };
  const copy = duplicatePanel(
      { template: t, workspace: emptyWorkspace() },
      p.panelId,
    ).template,
    q = copy.panels[1]!;
  const next = applyBatchProperties(copy, {
    source: { kind: 'axis', panelId: p.panelId, axisId: x.axisId },
    targets: [{ kind: 'axis', panelId: q.panelId, axisId: q.axes[0]!.axisId }],
    groups: ['axis-advanced-rug', 'axis-advanced-references'],
  });
  expect(next.panels[1]!.axes[0]!.advanced!.rug!.plotSlotIds).toEqual([
    q.plotSlots[0]!.plotSlotId,
  ]);
  expect(
    next.panels[1]!.axes[0]!.advanced!.references!.items[0]!.plotSlotId,
  ).toBe(q.plotSlots[0]!.plotSlotId);
});
it('批量复制完整自定义尺度与 F5 各组，清除来源缺省配置', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!,
    source = p.axes[1]!,
    target = p.axes[3]!;
  source.scale = 'custom';
  source.scaleOptions = {
    formula: { forward: 'x*2+1', inverse: '(x-1)/2', min: 0, max: 100 },
  };
  source.advanced = {
    arrow: 'both',
    specialTicks: [{ at: 'max', label: '终点' }],
  };
  target.advanced = {
    references: { items: [{ id: 'a', kind: 'constant', value: 3 }] },
  };
  const next = applyBatchProperties(t, {
    source: ref,
    targets: [{ ...ref, axisId: target.axisId }],
    groups: batchGroups(t, ref).map((g) => g.id),
  });
  expect(next.panels[0]!.axes[3]).toMatchObject({
    scale: 'custom',
    scaleOptions: source.scaleOptions,
    advanced: source.advanced,
  });
  expect(next.panels[0]!.axes[3]!.advanced).not.toHaveProperty('references');
});
it('共享范围同步断轴并保留成员独立标签，取消时无配置残留', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!,
    s = p.axes[1]!,
    target = p.axes[3]!;
  s.range = { mode: 'fixed', min: 0, max: 100 };
  s.advanced = { breaks: { intervals: [{ from: 20, to: 80 }] } };
  target.advanced = { labels: { source: 'index' } };
  t.sharedAxisGroups = [
    {
      groupId: 'g',
      members: [
        { panelId: p.panelId, axisId: s.axisId },
        { panelId: p.panelId, axisId: target.axisId },
      ],
    },
  ];
  synchronizeSharedAxis(t, ref);
  expect(target.advanced).toEqual({
    breaks: s.advanced.breaks,
    labels: { source: 'index' },
  });
  expect(validateFigureTemplate(t).ok).toBe(true);
  delete s.advanced.breaks;
  synchronizeSharedAxis(t, ref);
  expect(target.advanced).toEqual({ labels: { source: 'index' } });
});
it('复制图层重映射标签槽、Rug和层内链接，槽清理保留轴引用', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!,
    x = p.axes[0]!,
    top = p.axes[2]!;
  x.advanced = {
    labels: { source: 'column', dataSlotId: 'slot-y' },
    rug: {
      plotSlotIds: [p.plotSlots[0]!.plotSlotId],
      source: 'raw',
      arrangement: 'overlap',
      side: 'outside',
      followStyle: true,
    },
  };
  top.scale = 'linear';
  top.advanced = {
    link: {
      panelId: p.panelId,
      axisId: x.axisId,
      formula: { forward: 'x+1', inverse: 'x-1', min: 0, max: 100 },
    },
  };
  const m = { template: t, workspace: emptyWorkspace() },
    next = duplicatePanel(m, p.panelId),
    copy = next.template.panels[1]!;
  expect(copy.axes[2]!.advanced!.link).toMatchObject({
    panelId: copy.panelId,
    axisId: copy.axes[0]!.axisId,
  });
  expect(copy.axes[0]!.advanced!.rug!.plotSlotIds).toEqual([
    copy.plotSlots[0]!.plotSlotId,
  ]);
  expect(copy.axes[0]!.advanced!.labels!.dataSlotId).not.toBe('slot-y');
  p.plotSlots = [];
  pruneSlots(m, new Set(['slot-y']));
  expect(t.dataSlots.some((s) => s.dataSlotId === 'slot-y')).toBe(true);
});
