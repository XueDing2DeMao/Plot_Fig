import type { Panel } from './figure-template.js';
import type { PlotSlot } from './plot-slot.js';
import {
  validateCurveGroupsStructure,
  type CurveGroups,
} from './curve-groups.js';
import {
  validateCurveTransform,
  validatePanelStack,
  type CurveTransform,
  type PanelStack,
} from './curve-transforms.js';
type GroupPanel = Panel & { groups?: CurveGroups };
type TransformPanel = Panel & { stack?: PanelStack };
type TransformPlot = PlotSlot & { transform?: CurveTransform };
function supported(plot: PlotSlot) {
  return plot.kind === 'xy' || plot.kind === 'area';
}
function compatible(a: PlotSlot, b: PlotSlot) {
  return a.xAxisId === b.xAxisId && a.yAxisId === b.yAxisId;
}
export function validateCurveGroups(panel: GroupPanel) {
  if (!panel.groups) return;
  validateCurveGroupsStructure(panel.groups);
  const byId = new Map(panel.groups.map((g) => [g.groupId, g]));
  if (byId.size !== panel.groups.length) throw new Error('曲线组标识不能重复');
  const plots = new Map(panel.plotSlots.map((p) => [p.plotSlotId, p])),
    owner = new Set<string>();
  for (const group of panel.groups) {
    for (const id of group.members) {
      const plot = plots.get(id);
      if (!plot || !['xy', 'area'].includes(plot.kind))
        throw new Error('曲线组成员须为同层 XY 或面积曲线');
      if (owner.has(id)) throw new Error('同一曲线不能重复归属多个曲线组');
      owner.add(id);
    }
    const chain = new Set([group.groupId]);
    let parentId = group.parentId;
    while (parentId) {
      if (chain.has(parentId)) throw new Error('曲线组不能形成循环嵌套');
      chain.add(parentId);
      const parent = byId.get(parentId);
      if (!parent) throw new Error('曲线组的父组不存在');
      parentId = parent.parentId;
    }
    const descendants = descendantMembers(panel.groups, group.groupId);
    const first = plots.get(descendants[0]!)!;
    if (
      descendants.some((id) => {
        const p = plots.get(id)!;
        return p.xAxisId !== first.xAxisId || p.yAxisId !== first.yAxisId;
      })
    )
      throw new Error('嵌套曲线组成员须使用相同的 X/Y 坐标轴');
  }
}
function descendantMembers(groups: CurveGroups, id: string): string[] {
  const group = groups.find((g) => g.groupId === id)!;
  return [
    ...group.members,
    ...groups
      .filter((g) => g.parentId === id)
      .flatMap((g) => descendantMembers(groups, g.groupId)),
  ];
}
export function validateCurveTransforms(panel: TransformPanel) {
  const plots = new Map(panel.plotSlots.map((p) => [p.plotSlotId, p]));
  const fillTargets = new Map<string, string>();
  for (const p of panel.plotSlots as TransformPlot[]) {
    if (!p.transform) continue;
    if (!supported(p)) throw new Error('曲线偏移和填充仅支持 XY 或面积曲线');
    validateCurveTransform(p.transform);
    if (p.transform.fill?.target === 'next') {
      const target = p.transform.fill.targetPlotId
        ? plots.get(p.transform.fill.targetPlotId)
        : panel.plotSlots
            .slice(panel.plotSlots.indexOf(p) + 1)
            .find(
              (q) => q.visible !== false && supported(q) && compatible(p, q),
            );
      if (
        !target ||
        target.plotSlotId === p.plotSlotId ||
        !supported(target) ||
        !compatible(p, target)
      )
        throw new Error('填充目标须为同层、同坐标轴的另一条 XY 或面积曲线');
      fillTargets.set(p.plotSlotId, target.plotSlotId);
    }
  }
  for (const id of fillTargets.keys()) {
    const seen = new Set([id]);
    let next = fillTargets.get(id);
    while (next) {
      if (seen.has(next)) throw new Error('曲线填充目标不能形成循环');
      seen.add(next);
      next = fillTargets.get(next);
    }
  }
  if (panel.stack) {
    validatePanelStack(panel.stack);
    let first: PlotSlot | undefined;
    for (const id of panel.stack.members) {
      const p = plots.get(id);
      if (!p || !supported(p))
        throw new Error('堆叠成员须为同层 XY 或面积曲线');
      if (first && !compatible(first, p))
        throw new Error('堆叠成员必须使用相同的 X/Y 坐标轴，不能混合双轴');
      first ??= p;
      const y = panel.axes.find((a) => a.axisId === p.yAxisId);
      if (y && y.scale !== 'linear')
        throw new Error('正负独立堆叠需要线性 Y 轴');
    }
  }
}
export function validateDropRelations(panel: Panel) {
  const edges = new Map<string, string[]>();
  for (const [index, plot] of panel.plotSlots.entries()) {
    if (plot.kind !== 'xy') continue;
    for (const drop of Object.values(plot.dropLines ?? {})) {
      if (drop.target.mode !== 'next-curve') continue;
      const id = drop.target.plotSlotId;
      const target: PlotSlot | undefined = id
        ? panel.plotSlots.find((p) => p.plotSlotId === id)
        : panel.plotSlots
            .slice(index + 1)
            .find(
              (p) => p.visible !== false && supported(p) && compatible(plot, p),
            );
      if (
        !target ||
        target === plot ||
        !supported(target) ||
        !compatible(plot, target)
      )
        throw new Error('垂线目标须为同层、同坐标轴的另一条曲线');
      edges.set(plot.plotSlotId, [
        ...(edges.get(plot.plotSlotId) ?? []),
        target.plotSlotId,
      ]);
    }
  }
  const done = new Set<string>(),
    visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('曲线垂线目标不能形成循环');
    if (done.has(id)) return;
    visiting.add(id);
    for (const target of edges.get(id) ?? []) visit(target);
    visiting.delete(id);
    done.add(id);
  };
  for (const id of edges.keys()) visit(id);
}
export function validateF4PanelRelations(panel: Panel) {
  validateCurveGroups(panel);
  validateCurveTransforms(panel);
  validateDropRelations(panel);
}
