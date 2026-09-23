import type { DataBindingSet } from '@plot-fig/data-binding';
import type { PlotSlot } from '@plot-fig/figure-schema';
import { advancedErrorRange } from './error-details.js';
export function errorRange(
  plot: PlotSlot,
  data: DataBindingSet,
  point: { prefix: 'x' | 'y' | 'value'; index: number; base: number },
): [number, number] | undefined {
  if ((plot.kind === 'xy' || plot.kind === 'bar') && plot.errorDetails)
    return advancedErrorRange(plot, data, point);
  const bindings = plot.bindings as Record<string, string | undefined>;
  const value = (key: string) => {
    const id = bindings[key];
    const binding = data.bindings.find(
      (b) => b.dataSlotId === id && b.status === 'valid',
    );
    const v = data.columns.find((c) => c.columnId === binding?.columnId)
      ?.values[point.index];
    return typeof v === 'number' && Number.isFinite(v) && v >= 0
      ? v
      : undefined;
  };
  const symmetric = value(point.prefix + 'Error');
  const lower = symmetric ?? value(point.prefix + 'ErrorLower');
  const upper = symmetric ?? value(point.prefix + 'ErrorUpper');
  if (lower === undefined || upper === undefined) return undefined;
  const bounds: [number, number] = [point.base - lower, point.base + upper];
  return bounds.every(Number.isFinite) ? bounds : undefined;
}
