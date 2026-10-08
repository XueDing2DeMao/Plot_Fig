import {
  validateCurveGroups,
  validateCurveSubset,
  type CurveGroup,
  type CurveGroups,
  type CurveSubset,
  type LineStyle,
  type MarkerStyle,
  type Panel,
  type PlotSlot,
  type XyPlot,
} from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import type { SeriesRow, prepareSeriesRows } from './series-rows.js';
import { boundColumn } from './charts/prepared.js';
import { colorFraction, interpolateColor } from './continuous-color.js';

type GroupPanel = Panel & { groups?: CurveGroups };
type Lists = Pick<CurveGroup, 'colors' | 'lineDashes' | 'markerShapes'>;
export type CurveStylePatch = {
  line?: Partial<LineStyle>;
  marker?: Partial<MarkerStyle>;
};
function descendantMembers(groups: CurveGroups, id: string): string[] {
  const group = groups.find((g) => g.groupId === id)!;
  return [
    ...group.members,
    ...groups
      .filter((g) => g.parentId === id)
      .flatMap((g) => descendantMembers(groups, g.groupId)),
  ];
}
/** 曲线赋色与组色标共用；显隐筛选仍在赋色之后进行。 */
export function resolveGroupMapping(panel: GroupPanel, group: CurveGroup) {
  const groups = panel.groups ?? [];
  const members = descendantMembers(groups, group.groupId);
  const owners = new Map(
    groups.flatMap((g) => g.members.map((id) => [id, g] as const)),
  );
  const byId = new Map(groups.map((g) => [g.groupId, g]));
  const activeMembers = members.filter((id) => {
    let owner = owners.get(id);
    while (owner && owner.groupId !== group.groupId) {
      if (owner.mode === 'independent') return false;
      owner = owner.parentId ? byId.get(owner.parentId) : undefined;
    }
    return true;
  });
  const mapping = group.colorMapping;
  const values = new Map(
    mapping?.source === 'values'
      ? mapping.values.map((entry) => [entry.plotSlotId, entry.value] as const)
      : activeMembers.map((id, index) => [id, index + 1] as const),
  );
  const numbers = activeMembers.flatMap((id) => {
    const value = values.get(id);
    return value !== undefined && Number.isFinite(value) ? [value] : [];
  });
  const domain = mapping?.domain ?? {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
  return {
    members,
    activeMembers,
    values,
    ...domain,
    color: (value: number) => {
      if (!mapping) throw new Error('曲线组没有连续颜色映射');
      const t = colorFraction(value, domain);
      return interpolateColor(mapping.colors, mapping.reverse ? 1 - t : t);
    },
  };
}
export function curveStyleAt(
  lists: Lists,
  index: number,
  increment: 'synchronized' | 'nested' = 'synchronized',
  step = 1,
): CurveStylePatch {
  let cursor = index * step;
  const value = <T>(items: T[] | undefined) => {
    if (!items) return undefined;
    const item = items[cursor % items.length];
    if (increment === 'nested') cursor = Math.floor(cursor / items.length);
    return item;
  };
  const color = value(lists.colors),
    dash = value(lists.lineDashes),
    shape = value(lists.markerShapes);
  return {
    ...(color !== undefined || dash !== undefined
      ? {
          line: {
            ...(color !== undefined ? { color } : {}),
            ...(dash !== undefined ? { dash } : {}),
          },
        }
      : {}),
    ...(color !== undefined || shape !== undefined
      ? {
          marker: {
            ...(color !== undefined ? { fill: color, stroke: color } : {}),
            ...(shape !== undefined ? { shape } : {}),
          },
        }
      : {}),
  };
}
function applyStyle(plot: PlotSlot, style: CurveStylePatch) {
  if ('lineStyle' in plot && plot.lineStyle && style.line) {
    plot.lineStyle = { ...plot.lineStyle, ...style.line };
    if (style.line.dash) delete plot.lineStyle.customDash;
  }
  if (plot.kind === 'xy' && plot.markerStyle && style.marker) {
    plot.markerStyle = { ...plot.markerStyle, ...style.marker };
    if (style.marker.shape) delete plot.markerStyle.customVertices;
  }
  if (plot.kind === 'area' && style.line?.color)
    plot.fillStyle = { ...plot.fillStyle, color: style.line.color };
}
export function resolveCurveGroups<T extends GroupPanel>(panel: T): T {
  validateCurveGroups(panel);
  if (!panel.groups?.length) return panel;
  const result = structuredClone(panel);
  const byId = new Map(result.plotSlots.map((p) => [p.plotSlotId, p]));
  const visit = (group: CurveGroup) => {
    const resolved = resolveGroupMapping(result, group);
    const { members, activeMembers, values } = resolved;
    const mapping = group.colorMapping;
    if (group.mode === 'dependent')
      members.forEach((id, index) => {
        if (!activeMembers.includes(id)) return;
        const lists = { ...group };
        // 连续映射不消耗嵌套递增的色列游标；其他样式仍独立递增。
        if (mapping) delete lists.colors;
        const style = curveStyleAt(lists, index, group.increment, group.step);
        let color: string | undefined;
        if (mapping) {
          const value = values.get(id);
          if (value !== undefined) {
            color = resolved.color(value);
          }
        } else if (
          group.colors &&
          group.colorIncrement &&
          group.colorIncrement !== 'cycle'
        ) {
          const count = group.colors.length;
          const at =
            group.colorIncrement === 'stretch'
              ? Math.round(
                  (members.length === 1 ? 0 : index / (members.length - 1)) *
                    (count - 1),
                )
              : Math.min(
                  count - 1,
                  Math.floor(((index + 0.5) * count) / members.length),
                );
          color = group.colors[at];
        }
        if (color !== undefined) {
          style.line = { ...style.line, color };
          style.marker = { ...style.marker, fill: color, stroke: color };
        }
        applyStyle(byId.get(id)!, style);
      });
    result.groups!.filter((g) => g.parentId === group.groupId).forEach(visit);
  };
  result.groups!.filter((g) => !g.parentId).forEach(visit);
  return result;
}
export function unlinkCurveGroup<T extends GroupPanel>(
  panel: T,
  groupId: string,
): T {
  const result = resolveCurveGroups(panel);
  const copy = structuredClone(result),
    group = copy.groups?.find((g) => g.groupId === groupId);
  if (!group) throw new Error('要解除依赖的曲线组不存在');
  group.mode = 'independent';
  return copy;
}
export function prepareCurveSubset(
  plot: XyPlot & { subset?: CurveSubset },
  data: DataBindingSet,
  rows: ReturnType<typeof prepareSeriesRows>,
) {
  const subset = plot.subset;
  if (subset) validateCurveSubset(subset);
  const indices = new Map<number, number>();
  if (subset?.mode === 'group') {
    if (!plot.bindings.group)
      throw new Error('按分组列划分子集需要绑定分组数据列');
    const values = boundColumn(data, plot.bindings.group),
      keys = new Map<string, number>();
    for (const row of [...rows.rawRows].sort(
      (a, b) => a.sourceIndex - b.sourceIndex,
    )) {
      const v = values[row.sourceIndex];
      if (
        v === null ||
        v === undefined ||
        (typeof v === 'number' && !Number.isFinite(v))
      )
        throw new Error(
          `子集原始第 ${row.sourceIndex + 1} 行的分组值缺失或无效`,
        );
      const key = JSON.stringify([typeof v, v]);
      if (!keys.has(key)) keys.set(key, keys.size);
      indices.set(row.sourceIndex, keys.get(key)!);
    }
  }
  const index = (row: SeriesRow) =>
    subset?.mode === 'length'
      ? Math.floor(row.sourceIndex / subset.length)
      : (indices.get(row.sourceIndex) ?? 0);
  return {
    index,
    style: (row: SeriesRow): CurveStylePatch =>
      subset ? curveStyleAt(subset, index(row)) : {},
    segments: (segments: SeriesRow[][]) => {
      if (!subset?.breakConnection) return segments;
      const split: SeriesRow[][] = [];
      for (const segment of segments) {
        let current: SeriesRow[] = [];
        for (const row of segment) {
          if (current.length && index(current.at(-1)!) !== index(row)) {
            split.push(current);
            current = [];
          }
          current.push(row);
        }
        if (current.length) split.push(current);
      }
      return split;
    },
  };
}

export { validateCurveGroups };
