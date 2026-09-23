import type { FigureTemplate } from '../schema/figure-template.js';
import type { ValidationIssue } from './types.js';
import { isPositiveLogAxis } from '../axis-scale.js';

function issue(path: string, message: string): ValidationIssue {
  return { code: 'FIGURE_DOMAIN_INVARIANT_FAILED', path, message };
}

function shareScale(
  template: FigureTemplate,
  panelId: string,
  leftAxisId: string,
  rightAxisId: string,
): boolean {
  return (template.sharedAxisGroups ?? []).some((group) => {
    const members = new Set(
      group.members
        .filter((member) => member.panelId === panelId)
        .map((member) => member.axisId),
    );
    return members.has(leftAxisId) && members.has(rightAxisId);
  });
}

function belongsToSharedGroup(
  template: FigureTemplate,
  panelId: string,
  axisId: string,
): boolean {
  return (template.sharedAxisGroups ?? []).some((group) =>
    group.members.some(
      (member) => member.panelId === panelId && member.axisId === axisId,
    ),
  );
}

export function validateYAxisAlignments(
  template: FigureTemplate,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [panelIndex, panel] of template.panels.entries()) {
    const alignment = panel.yAxisAlignment;
    if (!alignment) continue;
    const path = `/panels/${panelIndex}/yAxisAlignment`;
    const left = panel.axes.find(
      (axis) => axis.axisId === alignment.leftAxisId,
    );
    const right = panel.axes.find(
      (axis) => axis.axisId === alignment.rightAxisId,
    );
    if (!left) issues.push(issue(`${path}/leftAxisId`, '左 Y 轴引用不存在'));
    else if (left.dimension !== 'y' || left.position !== 'left')
      issues.push(issue(`${path}/leftAxisId`, '左 Y 轴必须位于 left'));
    if (!right) issues.push(issue(`${path}/rightAxisId`, '右 Y 轴引用不存在'));
    else if (right.dimension !== 'y' || right.position !== 'right')
      issues.push(issue(`${path}/rightAxisId`, '右 Y 轴必须位于 right'));
    if (left?.scale === 'category' || right?.scale === 'category')
      issues.push(issue(path, '分类坐标轴不支持按数值对齐'));
    else if (
      left &&
      right &&
      (isPositiveLogAxis(left) || isPositiveLogAxis(right)) &&
      alignment.value <= 0
    )
      issues.push(issue(`${path}/value`, '对数坐标轴的对齐值必须大于 0'));
    if (
      shareScale(
        template,
        panel.panelId,
        alignment.leftAxisId,
        alignment.rightAxisId,
      )
    )
      issues.push(issue(path, '左右 Y 轴不能同时共享范围并按值对齐'));
    else if (
      belongsToSharedGroup(template, panel.panelId, alignment.leftAxisId) ||
      belongsToSharedGroup(template, panel.panelId, alignment.rightAxisId)
    )
      issues.push(issue(path, '参与双 Y 对齐的坐标轴不能同时属于共享组'));
  }
  return issues;
}
