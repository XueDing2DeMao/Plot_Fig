import { bindWorkspace } from '@plot-fig/data-binding';
import {
  categoricalDimension,
  isPositiveLogAxis,
  type Axis,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';

const logarithmic = isPositiveLogAxis;
const finiteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

// 整图仍可能由其他曲线绘制成功，迁移曲线需独立检查目标轴定义域。
export function validatePlotTargetDomain(
  model: WorkspaceEditor,
  plot: PlotSlot,
  axes: { x: Axis; y: Axis },
) {
  if (!model.workspace.tables.length || ![axes.x, axes.y].some(logarithmic))
    return;
  const data = bindWorkspace(model.template, model.workspace);
  const values = (slotId: string) => {
    const binding = data.bindings.find(
      (entry) => entry.dataSlotId === slotId && entry.status === 'valid',
    );
    return binding
      ? data.columns.find((column) => column.columnId === binding.columnId)
          ?.values
      : undefined;
  };
  if (plot.kind === 'box') {
    const numeric = categoricalDimension(plot) === 'x' ? axes.y : axes.x;
    const groups = plot.bindings.group
      ? values(plot.bindings.group)
      : undefined;
    if (
      logarithmic(numeric) &&
      values(plot.bindings.values)?.some(
        (value, index) =>
          finiteNumber(value) &&
          value <= 0 &&
          (!groups || (groups[index] !== null && groups[index] !== undefined)),
      )
    )
      throw new Error('对数箱线图包含非正样本，请选择线性目标轴');
  }
  if (plot.kind !== 'xy') return;
  const xs = values(plot.bindings.x),
    ys = values(plot.bindings.y);
  if (!xs || !ys) return;
  let hasPair = false;
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i],
      y = ys[i];
    if (!finiteNumber(x) || !finiteNumber(y)) continue;
    hasPair = true;
    if ((!logarithmic(axes.x) || x > 0) && (!logarithmic(axes.y) || y > 0))
      return;
  }
  if (hasPair)
    throw new Error('目标对数轴无法显示此曲线，请选择包含有效数据的轴类型');
}
