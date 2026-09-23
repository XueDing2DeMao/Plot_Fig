import type { FigureTemplate, XyPlot } from '@plot-fig/figure-schema';
import type { DataBindingSet } from '@plot-fig/data-binding';
import { rowLocation } from './charts/prepared.js';
import { prepareXyData } from './xy-data-view.js';
import type { RenderDiagnostic } from './types.js';

/** 检查处理后每段的数据顺序；轴反向不改变数据顺序要求。 */
export function validateXyLineData(
  plot: XyPlot,
  data: DataBindingSet,
  rows = prepareXyData(plot, data),
) {
  if (
    plot.mode === 'markers' ||
    !plot.lineStyle?.visible ||
    plot.lineConnection !== 'spline'
  )
    return;
  for (const segment of rows.segments) {
    let previous: number | undefined;
    for (const row of segment) {
      const xv = row.x;
      if (
        plot.lineConnection === 'spline' &&
        previous !== undefined &&
        xv <= previous
      )
        throw new Error(
          `自然三次样条要求每段 X 值严格递增（${rowLocation(data, plot.bindings.x, row.sourceIndex)}）；请修改排序/重复规则或选择直线/阶梯线`,
        );
      previous = xv;
    }
  }
}

/** 无数据时允许配置；已有数据的活动曲线错误必须阻止预览、批量应用及导出。 */
export function validateXyLineConnections(
  template: FigureTemplate,
  data?: DataBindingSet,
): RenderDiagnostic[] {
  if (!data) return [];
  const diagnostics: RenderDiagnostic[] = [];
  for (const panel of template.panels) {
    if (panel.visible === false) continue;
    for (const plot of panel.plotSlots) {
      if (plot.visible === false || plot.kind !== 'xy') continue;
      // 未绑定数据沿用已有绘图诊断，避免阻止导入前的属性编辑。
      if (
        ![plot.bindings.x, plot.bindings.y].every((id) =>
          data.bindings.some(
            (b) =>
              b.dataSlotId === id &&
              b.status === 'valid' &&
              data.columns.some((c) => c.columnId === b.columnId),
          ),
        )
      )
        continue;
      try {
        const rows = prepareXyData(plot, data, panel.axes);
        validateXyLineData(plot, data, rows);
      } catch (cause) {
        diagnostics.push({
          code: 'RENDER_DATA_INVALID',
          severity: 'error',
          sourcePath: `/panels/${panel.panelId}/plotSlots/${plot.plotSlotId}/${String(cause).includes('样条') ? 'lineConnection' : 'dataView'}`,
          message: `${plot.legendEntry.text || plot.plotSlotId}：${cause instanceof Error ? cause.message : String(cause)}`,
        });
      }
    }
  }
  return diagnostics;
}
