import type { FigureTemplate } from '../schema/figure-template.js';
import type { ValidationIssue } from './types.js';

export function validateAxisLengthRatios(
  template: FigureTemplate,
): ValidationIssue[] {
  return template.panels.flatMap((panel, index) => {
    const value = panel.axisLengthRatio;
    if (!value) return [];
    const messages: string[] = [];
    if (!Number.isFinite(value.ratio) || value.ratio <= 0)
      messages.push('X:Y 数据比例必须为正的有限数');
    const x = panel.axes.find((axis) => axis.axisId === value.xAxisId);
    const y = panel.axes.find((axis) => axis.axisId === value.yAxisId);
    if (
      x?.dimension !== 'x' ||
      y?.dimension !== 'y' ||
      x.scale !== 'linear' ||
      y.scale !== 'linear'
    )
      messages.push('数据比例仅支持同层线性 X/Y 轴，请先关闭比例或更换所选轴');
    if (
      panel.frameLink ||
      template.panels.some(
        (other) => other.frameLink?.parentPanelId === panel.panelId,
      )
    )
      messages.push('请先解除相关图层的位置／尺寸链接，再启用数据比例');
    return messages.map((message) => ({
      code: 'FIGURE_DOMAIN_INVARIANT_FAILED' as const,
      path: `/panels/${index}/axisLengthRatio`,
      message,
    }));
  });
}
