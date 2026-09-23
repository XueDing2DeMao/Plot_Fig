import type { Axis, FigureTemplate, Panel } from '@plot-fig/figure-schema';
import {
  assertTemplate,
  newIdentifier,
  synchronizeSharedAxis,
} from './publication-utils.js';

type OppositePosition = 'top' | 'right';

function panelById(template: FigureTemplate, panelId: string): Panel {
  const panel = template.panels.find((item) => item.panelId === panelId);
  if (!panel) throw new Error(`找不到图层 ${panelId}`);
  return panel;
}

function sourcePosition(position: OppositePosition): 'bottom' | 'left' {
  return position === 'top' ? 'bottom' : 'left';
}

function removeMemberFromSharedGroups(
  template: FigureTemplate,
  panelId: string,
  axisId: string,
): void {
  template.sharedAxisGroups = (template.sharedAxisGroups ?? [])
    .map((group) => ({
      ...group,
      members: group.members.filter(
        (member) => member.panelId !== panelId || member.axisId !== axisId,
      ),
    }))
    .filter((group) => group.members.length > 1);
  if (!template.sharedAxisGroups.length) delete template.sharedAxisGroups;
}

function copyAxisForPosition(
  template: FigureTemplate,
  source: Axis,
  position: OppositePosition,
): Axis {
  const axis = structuredClone(source);
  axis.axisId = newIdentifier(
    template,
    position === 'top' ? 'axis-x-top' : 'axis-y-right',
  );
  axis.position = position;
  axis.visible = true;
  axis.tickLabels.visible = false;
  delete axis.title;
  delete axis.compatibility;
  if (axis.advanced) {
    delete axis.advanced.rug;
    delete axis.advanced.references;
    delete axis.advanced.link;
    if (position === 'right') delete axis.advanced.breaks;
    if (!Object.keys(axis.advanced).length) delete axis.advanced;
  }
  if (position === 'right') {
    axis.range = { mode: 'auto' };
    if (axis.scale !== 'category') axis.rescale = { mode: 'auto' };
  }
  return axis;
}

export function addOppositeAxis(
  template: FigureTemplate,
  panelId: string,
  position: OppositePosition,
): FigureTemplate {
  const next = structuredClone(template);
  const panel = panelById(next, panelId);
  let axis = panel.axes.find((item) => item.position === position);
  if (!axis) {
    const source = panel.axes.find(
      (item) => item.position === sourcePosition(position),
    );
    if (!source)
      throw new Error(`缺少${position === 'top' ? '下 X' : '左 Y'}轴`);
    axis = copyAxisForPosition(next, source, position);
    panel.axes.push(axis);
  } else {
    axis.visible = true;
  }
  if (position === 'top')
    return setOppositeAxisSharing(next, panelId, axis.axisId, true);
  return assertTemplate(next);
}

export function bindPlotAxes(
  template: FigureTemplate,
  panelId: string,
  plotSlotId: string,
  axes: { xAxisId: string; yAxisId: string },
): FigureTemplate {
  const next = structuredClone(template);
  const panel = panelById(next, panelId);
  const plot = panel.plotSlots.find((item) => item.plotSlotId === plotSlotId);
  const xAxis = panel.axes.find((axis) => axis.axisId === axes.xAxisId);
  const yAxis = panel.axes.find((axis) => axis.axisId === axes.yAxisId);
  if (!plot) throw new Error(`找不到曲线 ${plotSlotId}`);
  if (xAxis?.dimension !== 'x' || yAxis?.dimension !== 'y')
    throw new Error('曲线必须绑定同一图层内正确方向的坐标轴');
  if (plot.xAxisId !== xAxis.axisId) delete xAxis.compatibility;
  if (plot.yAxisId !== yAxis.axisId) delete yAxis.compatibility;
  plot.xAxisId = xAxis.axisId;
  plot.yAxisId = yAxis.axisId;
  return assertTemplate(next);
}

export function ensurePlotAxis(
  template: FigureTemplate,
  panelId: string,
  plotSlotId: string,
  position: OppositePosition,
): FigureTemplate {
  const withAxis = addOppositeAxis(template, panelId, position);
  const panel = panelById(withAxis, panelId);
  const target = panel.axes.find((axis) => axis.position === position)!;
  const plot = panel.plotSlots.find((item) => item.plotSlotId === plotSlotId);
  if (!plot) throw new Error(`找不到曲线 ${plotSlotId}`);
  return bindPlotAxes(withAxis, panelId, plotSlotId, {
    xAxisId: position === 'top' ? target.axisId : plot.xAxisId,
    yAxisId: position === 'right' ? target.axisId : plot.yAxisId,
  });
}

function groupContaining(
  template: FigureTemplate,
  panelId: string,
  axisId: string,
) {
  return (template.sharedAxisGroups ?? []).find((group) =>
    group.members.some(
      (member) => member.panelId === panelId && member.axisId === axisId,
    ),
  );
}

export function setOppositeAxisSharing(
  template: FigureTemplate,
  panelId: string,
  axisId: string,
  enabled: boolean,
): FigureTemplate {
  const next = structuredClone(template);
  const panel = panelById(next, panelId);
  const axis = panel.axes.find((item) => item.axisId === axisId);
  if (!axis) throw new Error(`找不到坐标轴 ${axisId}`);
  const oppositePosition =
    axis.position === 'top'
      ? 'bottom'
      : axis.position === 'bottom'
        ? 'top'
        : axis.position === 'right'
          ? 'left'
          : 'right';
  const opposite = panel.axes.find(
    (item) => item.position === oppositePosition,
  );
  if (!opposite || opposite.dimension !== axis.dimension) {
    if (!enabled) return assertTemplate(next);
    throw new Error('找不到同层对边坐标轴');
  }
  const axisGroup = groupContaining(next, panelId, axis.axisId);
  const oppositeGroup = groupContaining(next, panelId, opposite.axisId);
  if (!enabled) {
    if (axisGroup && axisGroup === oppositeGroup) {
      removeMemberFromSharedGroups(next, panelId, axis.axisId);
      delete axis.compatibility;
    }
    return assertTemplate(next);
  }
  if (axisGroup && oppositeGroup && axisGroup !== oppositeGroup)
    throw new Error('两个坐标轴分别属于不同共享组，请先解除原共享关系');
  delete axis.compatibility;
  delete opposite.compatibility;
  const group = axisGroup ?? oppositeGroup;
  if (group) {
    if (
      !group.members.some(
        (member) => member.panelId === panelId && member.axisId === axis.axisId,
      )
    )
      group.members.push({ panelId, axisId: axis.axisId });
    if (
      !group.members.some(
        (member) =>
          member.panelId === panelId && member.axisId === opposite.axisId,
      )
    )
      group.members.push({ panelId, axisId: opposite.axisId });
  } else {
    next.sharedAxisGroups = next.sharedAxisGroups ?? [];
    next.sharedAxisGroups.push({
      groupId: newIdentifier(next, `shared-${axis.dimension}-opposite`),
      members: [
        { panelId, axisId: axis.axisId },
        { panelId, axisId: opposite.axisId },
      ],
    });
  }
  synchronizeSharedAxis(next, {
    panelId,
    axisId: axis.axisId,
  });
  if (axis.dimension === 'y') delete panel.yAxisAlignment;
  return assertTemplate(next);
}

export function setYAxisAlignment(
  template: FigureTemplate,
  panelId: string,
  value: number | undefined,
): FigureTemplate {
  const next = structuredClone(template);
  const panel = panelById(next, panelId);
  if (value === undefined) {
    delete panel.yAxisAlignment;
    return assertTemplate(next);
  }
  if (!Number.isFinite(value)) throw new Error('Y 轴对齐值必须是有限数');
  const left = panel.axes.find(
    (axis) => axis.dimension === 'y' && axis.position === 'left',
  );
  const right = panel.axes.find(
    (axis) => axis.dimension === 'y' && axis.position === 'right',
  );
  if (!left || !right) throw new Error('对齐需要同层左、右 Y 轴');
  delete left.compatibility;
  delete right.compatibility;
  const leftGroup = groupContaining(next, panelId, left.axisId);
  const rightGroup = groupContaining(next, panelId, right.axisId);
  if (leftGroup && leftGroup === rightGroup)
    removeMemberFromSharedGroups(next, panelId, right.axisId);
  panel.yAxisAlignment = {
    leftAxisId: left.axisId,
    rightAxisId: right.axisId,
    value,
  };
  return assertTemplate(next);
}
