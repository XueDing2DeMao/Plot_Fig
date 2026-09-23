import {
  type DataRole,
  type PlotSlot,
  type ErrorBarStyle,
} from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';
import {
  newIdentifier,
  assertTemplate,
  pruneSlots,
  panelForPlot,
} from './publication-utils.js';
export type ErrorMode = 'off' | 'symmetric' | 'asymmetric';
export function errorMode(
  plot: PlotSlot,
  direction: 'x' | 'y' | 'value',
): ErrorMode {
  const b = plot.bindings as Record<string, string | undefined>;
  return b[direction + 'Error']
    ? 'symmetric'
    : b[direction + 'ErrorLower']
      ? 'asymmetric'
      : 'off';
}
type ErrorOptions = {
  plotSlotId: string;
  direction: 'x' | 'y' | 'value';
  mode: ErrorMode;
};
export function setErrorMode(
  model: WorkspaceEditor,
  options: ErrorOptions,
): WorkspaceEditor {
  const next = structuredClone(model),
    plot = panelForPlot(next.template, options.plotSlotId).plotSlots.find(
      (p) => p.plotSlotId === options.plotSlotId,
    )!;
  if (plot.kind !== 'xy' && (plot.kind !== 'bar' || plot.layout === 'stacked'))
    throw new Error('当前图表不支持误差棒');
  if ((plot.kind === 'bar') !== (options.direction === 'value'))
    throw new Error('误差方向与图表不兼容');
  const bindings = plot.bindings as Record<string, string | undefined>,
    prefix = options.direction + 'Error',
    removed = new Set<string>();
  for (const suffix of ['', 'Lower', 'Upper']) {
    const key = prefix + suffix;
    if (bindings[key]) removed.add(bindings[key]!);
    delete bindings[key];
  }
  for (const suffix of options.mode === 'off'
    ? []
    : options.mode === 'symmetric'
      ? ['']
      : ['Lower', 'Upper']) {
    const role = (prefix + suffix) as DataRole,
      id = newIdentifier(next.template, plot.plotSlotId + '-' + role);
    bindings[role] = id;
    next.template.dataSlots.push({
      dataSlotId: id,
      name: role,
      role,
      valueType: 'number',
      required: false,
    });
  }
  plot.errorBarStyle ??= {
    visible: true,
    color: '#333333',
    widthPt: 1,
    capWidthPt: 4,
  };
  if (!Object.keys(bindings).some((k) => k.includes('Error')))
    delete plot.errorBarStyle;
  pruneSlots(next, removed);
  assertTemplate(next.template);
  return next;
}
export function updateErrorStyle(
  model: WorkspaceEditor,
  id: string,
  style: ErrorBarStyle,
): WorkspaceEditor {
  const next = structuredClone(model),
    plot = panelForPlot(next.template, id).plotSlots.find(
      (p) => p.plotSlotId === id,
    )!;
  if (plot.kind !== 'xy' && plot.kind !== 'bar')
    throw new Error('当前图表不支持误差棒');
  plot.errorBarStyle = style;
  assertTemplate(next.template);
  return next;
}
