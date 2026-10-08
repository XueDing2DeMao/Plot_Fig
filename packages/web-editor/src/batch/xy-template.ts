import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { DataWorkspace } from '@plot-fig/data-binding';
import { removeSeries } from '../state/series-operations.js';
import {
  inspectBatchColumns,
  type BatchColumnMapping,
} from './column-mapping.js';

function hasDataReference(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    Object.entries(value).some(
      ([key, child]) =>
        ['dataSlotId', 'positionSlotId', 'plotSlotId', 'plotSlotIds'].includes(
          key,
        ) || hasDataReference(child),
    )
  );
}

/** 单图层多 XY 曲线换到两列表时，只保留首条曲线及其样式。 */
export function batchXYTemplate(
  template: FigureTemplate,
  workspace: DataWorkspace,
  names: Record<string, string> = {},
  overrides: BatchColumnMapping = {},
  autoXY = false,
): FigureTemplate {
  const panel = template.panels[0],
    first = panel?.plotSlots[0];
  if (
    !autoXY ||
    workspace.tables.length !== 1 ||
    workspace.tables[0]!.columns.length !== 2 ||
    template.panels.length !== 1 ||
    !first ||
    panel!.plotSlots.length < 2 ||
    panel!.plotSlots.some(
      (p) =>
        p.kind !== 'xy' ||
        p.xAxisId !== first.xAxisId ||
        p.yAxisId !== first.yAxisId,
    ) ||
    panel!.axes.some((axis) => hasDataReference(axis.advanced)) ||
    template.dataSlots.some(
      (s) =>
        s.role !== 'x' &&
        s.role !== 'y' &&
        (s.required || names[s.dataSlotId] !== undefined),
    )
  )
    return template;
  const rows = inspectBatchColumns(
    template,
    workspace,
    names,
    overrides,
    false,
  );
  if (rows.every((r) => !r.error)) return template;
  const removed = panel!.plotSlots.slice(1);
  // 用户已经配置的曲线不会因自动识别而被移除。
  if (
    removed.some((p) =>
      Object.values(p.bindings).some(
        (id) => id && Object.hasOwn(overrides, id),
      ),
    )
  )
    return template;
  let next = template;
  for (const plot of removed) {
    const result = removeSeries(next, {}, plot.plotSlotId);
    if (!result.ok) return template;
    next = result.value.template;
  }
  return next;
}
