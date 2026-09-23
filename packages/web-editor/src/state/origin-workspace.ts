import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { PropertyObjectRef } from './property-objects.js';

export type OriginActiveWindow = 'worksheet' | 'graph';
export type OriginWorkspaceState = {
  activeWindow: OriginActiveWindow;
  /** The exact object selected in the graph. A stale ref is retained until replaced. */
  selection: PropertyObjectRef | null;
};

export type OriginPropertyCommand =
  'format.page' | 'format.layer' | 'format.plot' | 'format.axis';

export type OriginPropertyCommandResult =
  | {
      enabled: true;
      target: PropertyObjectRef;
      dialog: 'page' | 'layer' | 'plot' | 'axis';
    }
  | {
      enabled: false;
      reason:
        | 'worksheet-active'
        | 'no-selection'
        | 'stale-selection'
        | 'wrong-selection';
    };

export function createOriginWorkspaceState(
  initial: Partial<OriginWorkspaceState> = {},
): OriginWorkspaceState {
  return {
    activeWindow: initial.activeWindow ?? 'graph',
    selection: initial.selection ?? null,
  };
}

export function activateOriginWindow(
  state: OriginWorkspaceState,
  activeWindow: OriginActiveWindow,
): OriginWorkspaceState {
  return { ...state, activeWindow };
}

/** Selecting any graph object makes the graph the active Origin window. */
export function selectOriginObject(
  state: OriginWorkspaceState,
  selection: PropertyObjectRef | null,
): OriginWorkspaceState {
  return { activeWindow: 'graph', selection };
}

export function existsInTemplate(
  template: FigureTemplate,
  ref: PropertyObjectRef,
): boolean {
  if (ref.kind === 'page') return true;
  const panel = template.panels.find(
    (candidate) => candidate.panelId === ref.panelId,
  );
  if (!panel) return false;
  if (ref.kind === 'panel') return true;
  if (ref.kind === 'plot') {
    return panel.plotSlots.some((plot) => plot.plotSlotId === ref.plotSlotId);
  }
  return panel.axes.some((axis) => axis.axisId === ref.axisId);
}

/** X/Y 菜单表达的是当前图层的轴方向；已有明确轴选择时保留该轴。 */
export function resolveOriginAxisCommand(
  template: FigureTemplate,
  state: OriginWorkspaceState,
  dimension: 'x' | 'y',
): OriginPropertyCommandResult {
  const layer = resolveOriginPropertyCommand(template, state, 'format.layer');
  if (!layer.enabled || layer.target.kind !== 'panel') return layer;
  const panelId = layer.target.panelId;
  const panel = template.panels.find((item) => item.panelId === panelId)!;
  const selection = state.selection;
  const selectedAxis =
    selection?.kind === 'axis'
      ? panel.axes.find(
          (axis) =>
            axis.axisId === selection.axisId && axis.dimension === dimension,
        )
      : undefined;
  const candidates = panel.axes.filter((axis) => axis.dimension === dimension);
  const primary = candidates.find(
    (axis) => axis.position === (dimension === 'x' ? 'bottom' : 'left'),
  );
  const axis =
    selectedAxis ??
    primary ??
    (candidates.length === 1 ? candidates[0] : undefined);
  return axis
    ? {
        enabled: true,
        dialog: 'axis',
        target: { kind: 'axis', panelId: panel.panelId, axisId: axis.axisId },
      }
    : { enabled: false, reason: 'wrong-selection' };
}

/**
 * Resolve a Format command using the exact selected ids. No implicit first panel,
 * plot, or axis is ever chosen when a selection is missing or stale.
 */
export function resolveOriginPropertyCommand(
  template: FigureTemplate,
  state: OriginWorkspaceState,
  command: OriginPropertyCommand,
): OriginPropertyCommandResult {
  if (state.activeWindow !== 'graph') {
    return { enabled: false, reason: 'worksheet-active' };
  }
  if (command === 'format.page') {
    return { enabled: true, target: { kind: 'page' }, dialog: 'page' };
  }
  const selection = state.selection;
  if (!selection) return { enabled: false, reason: 'no-selection' };
  if (!existsInTemplate(template, selection)) {
    return { enabled: false, reason: 'stale-selection' };
  }

  switch (command) {
    case 'format.layer':
      if (selection.kind === 'panel') {
        return { enabled: true, target: selection, dialog: 'layer' };
      }
      if (selection.kind === 'plot' || selection.kind === 'axis') {
        return {
          enabled: true,
          target: { kind: 'panel', panelId: selection.panelId },
          dialog: 'layer',
        };
      }
      return { enabled: false, reason: 'wrong-selection' };
    case 'format.plot':
      return selection.kind === 'plot'
        ? { enabled: true, target: selection, dialog: 'plot' }
        : { enabled: false, reason: 'wrong-selection' };
    case 'format.axis':
      return selection.kind === 'axis'
        ? { enabled: true, target: selection, dialog: 'axis' }
        : { enabled: false, reason: 'wrong-selection' };
  }
}
