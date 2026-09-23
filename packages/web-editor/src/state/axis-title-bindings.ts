import { synchronizeLegendSources } from './legend-bindings.js';
import type { WorkspaceEditor } from './workspace-editor.js';

type Axis = WorkspaceEditor['template']['panels'][number]['axes'][number];
type Role = 'x' | 'y';
type AutoTitleMarker = {
  plotSlotId: string;
  role: Role;
  text: string;
};
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function marker(axis: Axis): AutoTitleMarker | undefined {
  const origin = axis.extensions?.origin;
  if (!isObject(origin)) return undefined;
  const value = origin.plotFigAutoAxisTitle;
  if (
    !isObject(value) ||
    typeof value.plotSlotId !== 'string' ||
    (value.role !== 'x' && value.role !== 'y') ||
    typeof value.text !== 'string'
  )
    return undefined;
  return {
    plotSlotId: value.plotSlotId,
    role: value.role,
    text: value.text,
  };
}

function setMarker(axis: Axis, value: AutoTitleMarker): void {
  const current = axis.extensions?.origin;
  const origin = isObject(current)
    ? structuredClone(current)
    : current === undefined
      ? {}
      : { plotFigPreservedOrigin: structuredClone(current) };
  origin.plotFigAutoAxisTitle = value;
  axis.extensions = { origin };
}

export function markAxisTitleManual(axis: Axis): void {
  const current = axis.extensions?.origin;
  const origin = isObject(current)
    ? structuredClone(current)
    : current === undefined
      ? {}
      : { plotFigPreservedOrigin: structuredClone(current) };
  origin.plotFigManualAxisTitle = true;
  delete origin.plotFigAutoAxisTitle;
  axis.extensions = { ...axis.extensions, origin };
}

function columnName(
  model: WorkspaceEditor,
  slotId: string,
): string | undefined {
  const ref = model.workspace.slotBindings[slotId];
  if (!ref) return undefined;
  const name = model.workspace.tables
    .find((table) => table.tableId === ref.tableId)
    ?.columns.find((column) => column.columnId === ref.columnId)?.name;
  return name?.replaceAll('<', '＜').replaceAll('>', '＞').slice(0, 16_384);
}

function defaultTitles(role: Role): Set<string> {
  return role === 'x'
    ? new Set(['', 'X', 'X 轴', '横轴'])
    : new Set(['', 'Y', 'Y 轴', '纵轴']);
}

function shouldUpdate(
  axis: Axis,
  role: Role,
  previousName: string | undefined,
): boolean {
  if (
    isObject(axis.extensions?.origin) &&
    axis.extensions.origin.plotFigManualAxisTitle === true
  )
    return false;
  const current = axis.title?.text ?? '';
  const automatic = marker(axis);
  if (automatic) return automatic.role === role && current === automatic.text;
  return defaultTitles(role).has(current) || current === previousName;
}

function applyTitle(
  axis: Axis,
  plotSlotId: string,
  role: Role,
  text: string,
): void {
  axis.title = {
    ...axis.title,
    format: axis.title?.format ?? 'auto',
    text,
    fontFamily: axis.title?.fontFamily ?? axis.tickLabels.fontFamily,
    fontSizePt: axis.title?.fontSizePt ?? 12,
    color: axis.title?.color ?? axis.tickLabels.color,
  };
  setMarker(axis, { plotSlotId, role, text });
}

export function synchronizeCurveOneAxisTitles(
  previous: WorkspaceEditor,
  next: WorkspaceEditor,
  plotSlotId?: string,
): WorkspaceEditor {
  const updates: Array<{
    panelId: string;
    axisId: string;
    plotSlotId: string;
    role: Role;
    text: string;
  }> = [];
  for (const panel of next.template.panels) {
    const plot = panel.plotSlots[0];
    if (!plot || (plotSlotId && plot.plotSlotId !== plotSlotId)) continue;
    const bindings = plot.bindings as Record<string, string | undefined>;
    if (!bindings.x || !bindings.y) continue;
    for (const role of ['x', 'y'] as const) {
      const slotId = bindings[role]!;
      const text = columnName(next, slotId);
      if (!text) continue;
      const axisId = role === 'x' ? plot.xAxisId : plot.yAxisId;
      const axis = panel.axes.find((item) => item.axisId === axisId);
      if (axis && shouldUpdate(axis, role, columnName(previous, slotId)))
        updates.push({
          panelId: panel.panelId,
          axisId,
          plotSlotId: plot.plotSlotId,
          role,
          text,
        });
    }
  }
  if (!updates.length) return synchronizeLegendSources(next);
  const result = { ...next, template: structuredClone(next.template) };
  for (const update of updates) {
    const panel = result.template.panels.find(
      (item) => item.panelId === update.panelId,
    )!;
    const axis = panel.axes.find((item) => item.axisId === update.axisId)!;
    applyTitle(axis, update.plotSlotId, update.role, update.text);
  }
  return synchronizeLegendSources(result);
}
