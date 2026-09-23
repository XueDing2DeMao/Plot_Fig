import { expect, it } from 'vitest';
import { defaultTemplate } from './default-template.js';
import {
  readPropertyObjectSettings,
  updatePropertyObjectSettings,
} from './property-object-settings.js';
import { applyBatchProperties, batchGroups } from './batch-properties.js';
import { synchronizeSharedAxis } from './publication-utils.js';
import { emptyWorkspace } from '@plot-fig/data-binding';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from './workspace-project.js';
const ref = { kind: 'axis', panelId: 'panel-main', axisId: 'axis-y' } as const;
it.each(['axis-symlog.threshold', 'axis-scale.symLog.threshold'])(
  '主动编辑%s时补齐默认线性段长度',
  (field) => {
    const t = defaultTemplate();
    t.panels[0]!.axes[1]!.scale = 'log2';
    const next = applyBatchProperties(t, {
      source: ref,
      targets: [ref],
      edits: { [field]: 0.25 },
    });
    expect(next.panels[0]!.axes[1]!.symLog).toEqual({
      threshold: 0.25,
      linearLength: 1,
    });
  },
);
it.each(['linear', 'log10', 'ln', 'log2'] as const)(
  '批量复制%s全部轴属性不会凭空开启SymLog，且清除目标的旧配置',
  (scale) => {
    const t = defaultTemplate(),
      p = t.panels[0]!,
      source = p.axes[1]!,
      target = p.axes[3]!;
    source.scale = scale;
    Object.assign(target, {
      scale: 'log2',
      symLog: { threshold: 0.25, linearLength: 2 },
    });
    const next = applyBatchProperties(t, {
      source: ref,
      targets: [{ ...ref, axisId: target.axisId }],
      groups: batchGroups(t, ref).map((g) => g.id),
    });
    expect(next.panels[0]!.axes[3]!.scale).toBe(scale);
    expect(next.panels[0]!.axes[3]!).not.toHaveProperty('symLog');
  },
);
it('正式属性保存跨零范围、SymLog参数并可关闭，旧对象不变', () => {
  const t = defaultTemplate(),
    value = readPropertyObjectSettings(t, ref);
  if (value.kind !== 'axis') throw new Error('axis');
  Object.assign(value.details, {
    scale: 'log10',
    symLog: { threshold: 0.1, linearLength: 2 },
  });
  value.range = { ...value.range, min: '-10', max: '10' };
  const next = updatePropertyObjectSettings(t, ref, value),
    read = readPropertyObjectSettings(next, ref);
  const project = serializeWorkspaceProject(next, emptyWorkspace());
  expect(JSON.parse(project).version).toBe('2.0.0');
  expect(parseWorkspaceProject(project)).toMatchObject({
    ok: true,
    template: next,
  });
  expect(read).toMatchObject({
    details: { symLog: { threshold: 0.1, linearLength: 2 } },
  });
  expect(t.panels[0]!.axes[1]!).not.toHaveProperty('symLog');
  if (read.kind !== 'axis') throw new Error('axis');
  read.details.scale = 'linear';
  delete read.details.symLog;
  const cleared = updatePropertyObjectSettings(next, ref, read);
  expect(cleared.panels[0]!.axes[1]!).not.toHaveProperty('symLog');
});
it('批量编辑共享轴同步尺度，清除SymLog整组后没有空对象残留', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!,
    source = p.axes[1]!,
    target = p.axes[3]!;
  Object.assign(source, {
    scale: 'log2',
    symLog: { threshold: 1, linearLength: 2 },
  });
  t.sharedAxisGroups = [
    {
      groupId: 'y-shared',
      members: [
        { panelId: p.panelId, axisId: source.axisId },
        { panelId: p.panelId, axisId: target.axisId },
      ],
    },
  ];
  synchronizeSharedAxis(t, ref);
  const edited = applyBatchProperties(t, {
    source: ref,
    targets: [ref],
    edits: { 'axis-symlog.threshold': 0.25 },
  });
  expect(edited.panels[0]!.axes[3]!.symLog?.threshold).toBe(0.25);
  delete t.sharedAxisGroups;
  source.scale = 'linear';
  delete source.symLog;
  const cleared = applyBatchProperties(t, {
    source: ref,
    targets: [{ ...ref, axisId: target.axisId }],
    groups: ['axis-scale'],
  });
  expect(cleared.panels[0]!.axes[3]).not.toHaveProperty('symLog');
  expect(cleared.panels[0]!.axes[3]).not.toHaveProperty('logTicks');
});
it('共享轴同步完整尺度参数，批量整组和单项可写入', () => {
  const t = defaultTemplate(),
    p = t.panels[0]!,
    source = p.axes[1]!,
    target = p.axes[3]!;
  Object.assign(source, {
    scale: 'log2',
    symLog: { threshold: 1, linearLength: 2 },
  });
  t.sharedAxisGroups = [
    {
      groupId: 'y-shared',
      members: [ref, { panelId: p.panelId, axisId: target.axisId }],
    },
  ];
  // shared member仅保留正式引用字段。
  t.sharedAxisGroups[0]!.members[0] = {
    panelId: p.panelId,
    axisId: source.axisId,
  };
  synchronizeSharedAxis(t, ref);
  expect(target.symLog).toEqual(source.symLog);
  delete t.sharedAxisGroups;
  const targetRef = { ...ref, axisId: target.axisId };
  const batch = applyBatchProperties(t, {
    source: ref,
    targets: [targetRef],
    groups: ['axis-scale'],
  });
  expect(batch.panels[0]!.axes[3]).toMatchObject({
    scale: 'log2',
    symLog: { threshold: 1, linearLength: 2 },
  });
  const edited = applyBatchProperties(batch, {
    source: ref,
    targets: [targetRef],
    edits: { 'axis-symlog.threshold': 0.25 },
  });
  expect(edited.panels[0]!.axes[3]!.symLog?.threshold).toBe(0.25);
});
