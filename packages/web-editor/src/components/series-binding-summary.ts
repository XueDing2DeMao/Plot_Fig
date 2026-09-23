import type { DataBindingSet, DataWorkspace } from '@plot-fig/data-binding';
import {
  plotBindingEntries,
  type FigureTemplate,
} from '@plot-fig/figure-schema';

export function seriesBindingSummary(
  plot: FigureTemplate['panels'][number]['plotSlots'][number],
  template: FigureTemplate,
  workspace: DataWorkspace,
  data: DataBindingSet | undefined,
) {
  const entries = plotBindingEntries(plot);
  const columns = entries.map(({ slotId }) => {
    const slot = template.dataSlots.find((item) => item.dataSlotId === slotId);
    const ref = workspace.slotBindings[slotId];
    const table = workspace.tables.find(
      (item) => item.tableId === ref?.tableId,
    );
    const column = table?.columns.find(
      (item) => item.columnId === ref?.columnId,
    );
    const binding = data?.bindings.find((item) => item.dataSlotId === slotId);
    return {
      table,
      column,
      role: slot?.role ?? '',
      invalid: Boolean(slot?.required || ref) && binding?.status !== 'valid',
      required: slot?.required,
    };
  });
  const tables = [
    ...new Set(
      columns.flatMap((item) => (item.table ? [item.table.name] : [])),
    ),
  ];
  const x = columns.find((item) => item.role === 'x');
  const y = columns.find((item) => item.role === 'y');
  const details =
    x && y
      ? `${x.column?.name ?? '未绑定 X'} → ${y.column?.name ?? '未绑定 Y'}`
      : columns
          .filter((item) => item.required || item.column)
          .map((item) => item.column?.name ?? '未绑定')
          .join(' · ');
  return {
    invalid: columns.some((item) => item.invalid),
    text: tables.length
      ? `${tables.join(' / ')} · ${details}`
      : '尚未选择数据表',
    name: plot.legendEntry.text,
    color:
      plot.kind === 'xy'
        ? (plot.lineStyle?.color ?? plot.markerStyle?.stroke)
        : undefined,
  };
}
