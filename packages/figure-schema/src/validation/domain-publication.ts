import type { FigureTemplate } from '../schema/figure-template.js';
import type { ValidationIssue } from './types.js';
import { sameAxisScale } from '../axis-scale.js';
const issue = (path: string, message: string): ValidationIssue => ({
  code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
  path,
  message,
});
export function validatePublication(
  template: FigureTemplate,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();
  for (const [index, group] of (template.sharedAxisGroups ?? []).entries()) {
    const path = `/sharedAxisGroups/${index}`;
    const axes = group.members.map((ref) =>
      template.panels
        .find((p) => p.panelId === ref.panelId)
        ?.axes.find((a) => a.axisId === ref.axisId),
    );
    const first = axes[0];
    for (const axis of axes) {
      if (!axis) {
        issues.push(issue(path, '共享轴引用不存在'));
        continue;
      }
      if (seen.has(axis.axisId))
        issues.push(issue(path, '每个轴只能出现于一个共享组一次'));
      seen.add(axis.axisId);
      if (
        first &&
        (axis.dimension !== first.dimension ||
          !sameAxisScale(axis, first) ||
          axis.reverse !== first.reverse ||
          JSON.stringify(axis.range) !== JSON.stringify(first.range) ||
          axis.rescale?.mode !== first.rescale?.mode ||
          axis.rescale?.margin?.minPercent !==
            first.rescale?.margin?.minPercent ||
          axis.rescale?.margin?.maxPercent !==
            first.rescale?.margin?.maxPercent)
      )
        issues.push(
          issue(path, '共享轴的方向、类型、反向、范围与重缩放策略必须一致'),
        );
    }
  }
  for (const [index, annotation] of template.annotations.entries()) {
    if (annotation.kind !== 'legend' || !annotation.layout?.plotSlotIds)
      continue;
    const plots = template.panels
      .filter(
        (p) =>
          annotation.coordinateSpace === 'page' ||
          p.panelId === annotation.panelId,
      )
      .flatMap((p) => p.plotSlots);
    if (
      annotation.layout.plotSlotIds.some(
        (id) => !plots.some((p) => p.plotSlotId === id),
      )
    )
      issues.push(
        issue(
          `/annotations/${index}/layout/plotSlotIds`,
          '图例条目必须引用所属范围内的图表',
        ),
      );
  }
  return issues;
}
