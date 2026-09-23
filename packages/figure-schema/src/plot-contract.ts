import type { PlotSlot } from './schema/plot-slot.js';
import type { DataRole } from './schema/data-slot.js';

export type PlotKind = PlotSlot['kind'];
export type PlotRole = { role: DataRole; label: string; required: boolean };
const labels: Record<DataRole, string> = {
  valueError: '值误差',
  valueErrorLower: '值下误差',
  valueErrorUpper: '值上误差',
  x: 'X',
  y: 'Y',
  z: 'Z',
  category: '类别',
  value: '值',
  values: '样本',
  group: '分组',
  split: '分裂分组',
  label: '标签',
  color: '颜色',
  lineColor: '线条颜色',
  size: '大小',
  shape: '形状',
  xError: 'X 误差',
  yError: 'Y 误差',
  xErrorLower: 'X 下误差',
  xErrorUpper: 'X 上误差',
  yErrorLower: 'Y 下误差',
  yErrorUpper: 'Y 上误差',
};
const inputs: Record<PlotKind, readonly DataRole[]> = {
  xy: ['x', 'y'],
  area: ['x', 'y'],
  bar: ['category', 'value'],
  histogram: ['values'],
  box: ['values', 'group', 'split'],
  heatmap: ['x', 'y', 'z'],
  contour: ['x', 'y', 'z'],
};
export function plotRoles(kind: PlotKind): PlotRole[] {
  return inputs[kind].map((role) => ({
    role,
    label: labels[role],
    required: role !== 'group' && role !== 'split',
  }));
}
export function plotBindingEntries(plot: PlotSlot) {
  return Object.entries(plot.bindings).flatMap(([role, slotId]) =>
    slotId
      ? [{ role: role as DataRole, slotId, label: labels[role as DataRole] }]
      : [],
  );
}
export function roleAcceptsType(role: string, type: string): boolean {
  if (
    [
      'category',
      'color',
      'lineColor',
      'shape',
      'group',
      'split',
      'label',
    ].includes(role)
  )
    return ['number', 'category', 'string'].includes(type);
  return type === 'number';
}
export function categoricalDimension(plot: PlotSlot): 'x' | 'y' | undefined {
  if (plot.kind !== 'bar' && plot.kind !== 'box') return undefined;
  return plot.orientation === 'vertical' ? 'x' : 'y';
}
