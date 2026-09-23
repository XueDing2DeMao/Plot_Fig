import type { Axis, FigureTemplate, Panel } from '@plot-fig/figure-schema';

type CategorySettings = Pick<
  Axis,
  | 'rescale'
  | 'scale'
  | 'symLog'
  | 'logTicks'
  | 'scaleOptions'
  | 'advanced'
  | 'majorTicks'
  | 'minorTicks'
  | 'tickLabels'
  | 'grid'
>;

/** 仅用于明确的图型/方向转换；普通字段输入仍由 schema 拒绝不兼容设置。 */
export function normalizeCategoryAxis(axis: CategorySettings): void {
  if (axis.scale !== 'category') return;
  delete axis.rescale;
  delete axis.symLog;
  delete axis.logTicks;
  delete axis.scaleOptions;
  if (axis.advanced) {
    for (const key of ['calendar', 'ticks', 'rug', 'breaks', 'link'] as const)
      delete axis.advanced[key];
    if (!Object.keys(axis.advanced).length) delete axis.advanced;
  }
  delete axis.majorTicks.generation;
  axis.minorTicks.visible = false;
  axis.minorTicks.count = 0;
  if (axis.tickLabels.notation === 'engineering')
    axis.tickLabels.notation = 'auto';
  if (axis.tickLabels.divisor !== undefined && axis.tickLabels.divisor !== 1)
    delete axis.tickLabels.divisor;
  if (axis.grid?.minor) axis.grid.minor.visible = false;
}

export function resetCategoryCrossings(panel: Panel): void {
  const categoryIds = new Set(
    panel.axes
      .filter((axis) => axis.scale === 'category')
      .map((axis) => axis.axisId),
  );
  for (const axis of panel.axes)
    if (
      axis.placement?.mode === 'cross' &&
      categoryIds.has(axis.placement.axisId)
    )
      delete axis.placement;
}

/** 共享组只同步范围；变成分类轴的成员就地清理不兼容外观，保留其余独立样式。 */
export function normalizeCategoryTransitions(
  before: FigureTemplate,
  after: FigureTemplate,
): void {
  for (const panel of after.panels) {
    const oldPanel = before.panels.find(
      (item) => item.panelId === panel.panelId,
    );
    if (!oldPanel) continue;
    let converted = false;
    for (const axis of panel.axes) {
      const oldAxis = oldPanel.axes.find((item) => item.axisId === axis.axisId);
      if (oldAxis?.scale !== 'category' && axis.scale === 'category') {
        normalizeCategoryAxis(axis);
        converted = true;
      }
    }
    if (converted) resetCategoryCrossings(panel);
  }
}
