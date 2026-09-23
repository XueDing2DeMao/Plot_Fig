import type { Axis, AxisLabelSource } from '@plot-fig/figure-schema';
import type { DataBindingSet, DataColumn } from '@plot-fig/data-binding';
import type { PlotScale } from './scales.js';
export function axisSourceColumn(
  data: DataBindingSet | undefined,
  id: string | undefined,
): DataColumn | undefined {
  if (!data) return undefined;
  const binding = data.bindings.find(
    (b) => b.dataSlotId === id && b.status === 'valid',
  );
  const column =
    binding && data.columns.find((c) => c.columnId === binding.columnId);
  if (!column) throw new Error(`坐标轴数据槽 ${id ?? ''} 尚未绑定`);
  return column;
}
export function formatAxisDate(
  value: number,
  format = 'yyyy-MM-dd',
  timeZone = 'UTC',
): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error('日期刻度超出日期表示范围');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((v) => [v.type, v.value]));
  const tokens: Record<string, string> = {
    yyyy: p.year!,
    MM: p.month!,
    dd: p.day!,
    HH: p.hour!,
    mm: p.minute!,
    ss: p.second!,
  };
  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (key) => tokens[key]!);
}
export function advancedAxisLabel(
  axis: Axis,
  scale: PlotScale,
  value: number,
  index: number,
  source: AxisLabelSource | undefined = axis.advanced?.labels,
): string | undefined {
  if (!source || source.source === 'value') return undefined;
  if (source.source === 'date')
    return formatAxisDate(value, source.format, source.timeZone);
  if (source.source === 'index') return String(index + 1);
  const column = axisSourceColumn(scale.data, source.dataSlotId);
  if (!column) return undefined;
  if (source.source === 'metadata')
    return source.metadata === 'unit'
      ? (column.unit ?? '')
      : source.metadata === 'table'
        ? (column.source?.tableName ?? scale.data?.source.name ?? '')
        : column.name;
  const positions =
    source.match === 'value'
      ? axisSourceColumn(scale.data, source.positionSlotId)?.values
      : undefined;
  const row = positions ? positions.findIndex((v) => v === value) : index;
  const text = column.values[row];
  return text === null || text === undefined ? '' : String(text);
}
