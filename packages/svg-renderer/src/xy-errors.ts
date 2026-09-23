import type { DataBindingSet } from '@plot-fig/data-binding';
import type { XyPlot } from '@plot-fig/figure-schema';
import { errorRange } from './error-values.js';
import { renderBarError } from './charts/bar-errors.js';
import { rowLocation, boundColumn } from './charts/prepared.js';
import type { ChartContext } from './charts/chart-point.js';
import type { RenderDiagnostic } from './types.js';
export function renderXyErrors(
  plot: XyPlot,
  data: DataBindingSet,
  options: { context: ChartContext; indices: number[] },
) {
  let svg = '';
  const diagnostics: RenderDiagnostic[] = [];
  if (!plot.errorBarStyle?.visible) return { svg, diagnostics };
  const x = boundColumn(data, plot.bindings.x),
    y = boundColumn(data, plot.bindings.y);
  for (const direction of ['x', 'y'] as const) {
    const binding =
      plot.bindings[direction === 'x' ? 'xError' : 'yError'] ??
      plot.bindings[direction === 'x' ? 'xErrorLower' : 'yErrorLower'];
    if (!binding) continue;
    const scale =
      direction === 'x' ? options.context.xScale : options.context.yScale;
    for (const index of options.indices) {
      const base = (direction === 'x' ? x : y)[index] as number,
        bounds = errorRange(plot, data, { prefix: direction, index, base });
      if (
        !bounds ||
        (!options.context.dataClip &&
          !bounds.every((v) => Number.isFinite(scale.map(v))))
      ) {
        diagnostics.push({
          code: 'RENDER_DATA_INVALID',
          severity: 'warning',
          sourcePath: `/plotSlots/${plot.plotSlotId}/bindings/${direction}Error/rows/${index}`,
          message: `${rowLocation(data, binding, index)}：无效或不适用于对数轴的 ${direction.toUpperCase()} 误差已跳过`,
        });
        continue;
      }
      svg += renderBarError(
        options.context,
        {
          center: (direction === 'x' ? y : x)[index] as number,
          bounds,
          horizontal: direction === 'x',
        },
        plot.errorBarStyle,
      );
    }
  }
  return { svg, diagnostics };
}
