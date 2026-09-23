import type { Axis, FigureTemplate, Panel } from '@plot-fig/figure-schema';
import { changeAllChartTypes } from './chart-operations.js';
import { assertTemplate, newIdentifier } from './publication-utils.js';
import type { WorkspaceEditor } from './workspace-editor.js';

export const multiAxisChoices = {
  'double-y': '双纵轴图',
  'triple-y': '三纵轴图',
  'quad-y': '四纵轴图',
  'stacked-shared-x': '上下共享横轴图',
} as const;

export type MultiAxisPreset = keyof typeof multiAxisChoices;
export type PlotSetupChoice =
  import('./chart-defaults.js').ChartChoice | MultiAxisPreset;

const requirements: Record<MultiAxisPreset, number> = {
  'double-y': 2,
  'triple-y': 3,
  'quad-y': 4,
  'stacked-shared-x': 2,
};

type PresetMarker = {
  preset: MultiAxisPreset;
  panelIds: string[];
  sourceFrame?: Panel['frame'];
};
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPreset(value: unknown): value is MultiAxisPreset {
  return typeof value === 'string' && value in multiAxisChoices;
}

function marker(template: FigureTemplate): PresetMarker | undefined {
  const origin = template.extensions?.origin;
  if (!isObject(origin)) return undefined;
  const value = origin.plotFigMultiAxis;
  if (
    !isObject(value) ||
    !isPreset(value.preset) ||
    !Array.isArray(value.panelIds)
  )
    return undefined;
  const panelIds = value.panelIds.filter(
    (panelId): panelId is string => typeof panelId === 'string',
  );
  if (panelIds.length !== value.panelIds.length) return undefined;
  const frame = value.sourceFrame;
  const sourceFrame =
    isObject(frame) &&
    ['x', 'y', 'width', 'height'].every(
      (key) => typeof frame[key] === 'number' && Number.isFinite(frame[key]),
    )
      ? {
          x: frame.x as number,
          y: frame.y as number,
          width: frame.width as number,
          height: frame.height as number,
        }
      : undefined;
  return {
    preset: value.preset,
    panelIds,
    ...(sourceFrame ? { sourceFrame } : {}),
  };
}

export function multiAxisPreset(
  template: FigureTemplate,
): MultiAxisPreset | undefined {
  const value = marker(template);
  return value &&
    value.panelIds.length === template.panels.length &&
    value.panelIds.every((id) =>
      template.panels.some((panel) => panel.panelId === id),
    )
    ? value.preset
    : undefined;
}

function setMarker(
  template: FigureTemplate,
  preset: MultiAxisPreset,
  sourceFrame: Panel['frame'],
): void {
  const current = template.extensions?.origin;
  const origin = isObject(current)
    ? structuredClone(current)
    : current === undefined
      ? {}
      : { plotFigPreservedOrigin: structuredClone(current) };
  origin.plotFigMultiAxis = {
    preset,
    panelIds: template.panels.map((panel) => panel.panelId),
    sourceFrame: structuredClone(sourceFrame),
  };
  template.extensions = { origin };
}

function clearMarker(template: FigureTemplate): void {
  const current = template.extensions?.origin;
  if (!isObject(current) || !('plotFigMultiAxis' in current)) return;
  const origin = structuredClone(current);
  delete origin.plotFigMultiAxis;
  const preserved = origin.plotFigPreservedOrigin;
  delete origin.plotFigPreservedOrigin;
  if (preserved !== undefined && !Object.keys(origin).length) {
    template.extensions = { origin: preserved };
  } else if (Object.keys(origin).length) {
    template.extensions = { origin };
  } else {
    delete template.extensions;
  }
}

function allocate(ids: Set<string>, base: string): string {
  let id = base;
  let suffix = 1;
  while (ids.has(id)) id = `${base}-${suffix++}`;
  ids.add(id);
  return id;
}

function physicalAxis(
  source: Panel,
  dimension: 'x' | 'y',
  position: Axis['position'],
): Axis {
  const exact = source.axes.find(
    (axis) => axis.dimension === dimension && axis.position === position,
  );
  const fallback = source.axes.find((axis) => axis.dimension === dimension);
  if (!exact && !fallback)
    throw new Error(`源图层缺少 ${dimension.toUpperCase()} 轴`);
  const axis = structuredClone(exact ?? fallback!);
  axis.dimension = dimension;
  axis.position = position as never;
  delete axis.compatibility;
  return axis;
}

function fourAxes(source: Panel, ids: Set<string>, keepIds: boolean): Axis[] {
  return (
    [
      ['x', 'bottom'],
      ['x', 'top'],
      ['y', 'left'],
      ['y', 'right'],
    ] as const
  ).map(([dimension, position]) => {
    const hasExact = source.axes.some(
      (axis) => axis.dimension === dimension && axis.position === position,
    );
    const axis = physicalAxis(source, dimension, position);
    if (!keepIds || !hasExact)
      axis.axisId = allocate(ids, `${source.panelId}-${position}-${dimension}`);
    else ids.add(axis.axisId);
    return axis;
  });
}

function axisAt(panel: Panel, position: Axis['position']): Axis {
  const axis = panel.axes.find((item) => item.position === position);
  if (!axis) throw new Error(`图层缺少 ${position} 轴`);
  return axis;
}

function configureXAxis(panel: Panel, showLabels: boolean): Axis {
  const bottom = axisAt(panel, 'bottom');
  const top = axisAt(panel, 'top');
  bottom.visible = true;
  bottom.tickLabels.visible = showLabels;
  if (!showLabels) delete bottom.title;
  top.visible = false;
  top.tickLabels.visible = false;
  delete top.title;
  delete bottom.placement;
  delete top.placement;
  return bottom;
}

function configureYAxis(
  panel: Panel,
  position: 'left' | 'right',
  offsetPt = 0,
): Axis {
  const selected = axisAt(panel, position);
  const hidden = axisAt(panel, position === 'left' ? 'right' : 'left');
  selected.visible = true;
  selected.tickLabels.visible = true;
  selected.range = { mode: 'auto' };
  if (selected.scale !== 'category') selected.rescale = { mode: 'auto' };
  if (!selected.title) {
    const sourceTitle = hidden.title;
    if (sourceTitle) selected.title = structuredClone(sourceTitle);
  }
  selected.placement = { mode: 'frame', ...(offsetPt ? { offsetPt } : {}) };
  hidden.visible = false;
  hidden.tickLabels.visible = false;
  delete hidden.title;
  delete hidden.placement;
  return selected;
}

function cleanGeneratedStructure(template: FigureTemplate): void {
  delete template.sharedAxisGroups;
}

function sourceModel(model: WorkspaceEditor): WorkspaceEditor {
  const existing = multiAxisPreset(model.template);
  if (model.template.panels.length !== 1 && !existing)
    throw new Error('多轴预设只能从单图层图形创建');
  return changeAllChartTypes(model, 'xy');
}

function buildPanels(
  model: WorkspaceEditor,
  count: number,
  placements: Array<{ position: 'left' | 'right'; offsetPt?: number }>,
): Panel[] {
  const base = model.template.panels[0]!;
  const plots = model.template.panels.flatMap((panel) => panel.plotSlots);
  const ids = new Set(
    model.template.panels.flatMap((panel) => [
      panel.panelId,
      ...panel.axes.map((axis) => axis.axisId),
    ]),
  );
  const panels = Array.from({ length: count }, (_, index) => {
    const panel = structuredClone(base);
    if (index > 0) panel.panelId = allocate(ids, `panel-multi-${index + 1}`);
    const placement = placements[index]!;
    panel.name = `${placement.offsetPt ? '外' : ''}${
      placement.position === 'left' ? '左' : '右'
    } Y`;
    panel.axes = fourAxes(base, ids, index === 0);
    panel.plotSlots = [];
    delete panel.yAxisAlignment;
    delete panel.axisLengthRatio;
    delete panel.frameLink;
    const x = configureXAxis(panel, index === 0);
    const y = configureYAxis(panel, placement.position, placement.offsetPt);
    for (const plot of plots.filter(
      (_, plotIndex) => plotIndex % count === index,
    )) {
      const copy = structuredClone(plot);
      copy.xAxisId = x.axisId;
      copy.yAxisId = y.axisId;
      panel.plotSlots.push(copy);
    }
    if (index > 0) {
      panel.frameLink = {
        parentPanelId: base.panelId,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
      };
      panel.appearance = {
        ...panel.appearance,
        background: { color: '#ffffff', opacity: 0 },
        border: {
          visible: false,
          color: '#000000',
          widthPt: 0,
          dash: 'solid',
        },
      };
    }
    return panel;
  });
  return panels;
}

function sharedX(template: FigureTemplate): void {
  const members = template.panels.map((panel) => ({
    panelId: panel.panelId,
    axisId: axisAt(panel, 'bottom').axisId,
  }));
  if (members.length > 1)
    template.sharedAxisGroups = [
      { groupId: newIdentifier(template, 'shared-x-multi-axis'), members },
    ];
}

function doubleY(model: WorkspaceEditor): WorkspaceEditor {
  const next = structuredClone(model);
  const plots = next.template.panels.flatMap((item) => item.plotSlots);
  const panel = next.template.panels[0]!;
  const bottom = configureXAxis(panel, true);
  const left = configureYAxis(panel, 'left');
  const right = axisAt(panel, 'right');
  right.visible = true;
  right.tickLabels.visible = true;
  right.range = { mode: 'auto' };
  if (right.scale !== 'category') right.rescale = { mode: 'auto' };
  right.placement = { mode: 'frame' };
  if (!right.title && left.title)
    right.title = { ...structuredClone(left.title), text: 'Y2' };
  panel.name = '双 Y 轴';
  panel.plotSlots = plots;
  panel.plotSlots.forEach((plot, index) => {
    plot.xAxisId = bottom.axisId;
    plot.yAxisId = index % 2 ? right.axisId : left.axisId;
  });
  next.template.panels = [panel];
  next.template.annotations = next.template.annotations.filter(
    (annotation) =>
      annotation.coordinateSpace === 'page' ||
      annotation.panelId === panel.panelId,
  );
  cleanGeneratedStructure(next.template);
  return next;
}

function overlayY(
  model: WorkspaceEditor,
  placements: Array<{ position: 'left' | 'right'; offsetPt?: number }>,
): WorkspaceEditor {
  const next = structuredClone(model);
  next.template.panels = buildPanels(next, placements.length, placements);
  cleanGeneratedStructure(next.template);
  sharedX(next.template);
  next.activePanelId = next.template.panels[0]!.panelId;
  next.template.annotations = next.template.annotations.filter(
    (annotation) =>
      annotation.coordinateSpace === 'page' ||
      annotation.panelId === next.template.panels[0]!.panelId,
  );
  return next;
}

function stackedSharedX(model: WorkspaceEditor): WorkspaceEditor {
  const next = structuredClone(model);
  const plots = next.template.panels.flatMap((panel) => panel.plotSlots);
  if (plots.length > 16) throw new Error('上下共享 X 轴最多支持 16 个数据组');
  const panels = buildPanels(
    next,
    plots.length,
    plots.map(() => ({ position: 'left' as const })),
  );
  const sourceFrame = next.template.panels[0]!.frame;
  const gap = Math.min(0.02, sourceFrame.height / (plots.length * 5));
  const height = (sourceFrame.height - gap * (plots.length - 1)) / plots.length;
  panels.forEach((panel, index) => {
    delete panel.frameLink;
    panel.name = `共享 X ${index + 1}`;
    panel.frame = {
      x: sourceFrame.x,
      y: sourceFrame.y + index * (height + gap),
      width: sourceFrame.width,
      height,
    };
    configureXAxis(panel, index === panels.length - 1);
    if (next.template.panels[0]!.appearance)
      panel.appearance = structuredClone(next.template.panels[0]!.appearance);
    else delete panel.appearance;
  });
  next.template.panels = panels;
  cleanGeneratedStructure(next.template);
  sharedX(next.template);
  next.activePanelId = panels[0]!.panelId;
  next.template.annotations = next.template.annotations.filter(
    (annotation) =>
      annotation.coordinateSpace === 'page' ||
      annotation.panelId === panels[0]!.panelId,
  );
  return next;
}

export function applyMultiAxisPreset(
  model: WorkspaceEditor,
  preset: MultiAxisPreset,
): WorkspaceEditor {
  const sourceFrame = structuredClone(
    marker(model.template)?.sourceFrame ?? model.template.panels[0]!.frame,
  );
  const source = sourceModel(model);
  source.template.panels[0]!.frame = structuredClone(sourceFrame);
  delete source.template.panels[0]!.frameLink;
  const count = source.template.panels.reduce(
    (sum, panel) => sum + panel.plotSlots.length,
    0,
  );
  const required = requirements[preset];
  if (count < required)
    throw new Error(`${preset} 至少需要 ${required} 个数据组`);
  const next =
    preset === 'double-y'
      ? doubleY(source)
      : preset === 'triple-y'
        ? overlayY(source, [
            { position: 'left' },
            { position: 'right' },
            { position: 'right', offsetPt: 36 },
          ])
        : preset === 'quad-y'
          ? overlayY(source, [
              { position: 'left' },
              { position: 'right' },
              { position: 'left', offsetPt: 36 },
              { position: 'right', offsetPt: 36 },
            ])
          : stackedSharedX(source);
  setMarker(next.template, preset, sourceFrame);
  assertTemplate(next.template);
  return next;
}

export function collapseMultiAxisPreset(
  model: WorkspaceEditor,
): WorkspaceEditor {
  const presetMarker = marker(model.template);
  if (!multiAxisPreset(model.template) || !presetMarker) return model;
  const next = structuredClone(model);
  const base = next.template.panels[0]!;
  const plots = next.template.panels.flatMap((panel) => panel.plotSlots);
  const x = axisAt(base, 'bottom');
  const y = axisAt(base, 'left');
  base.plotSlots = plots.map((plot) => ({
    ...structuredClone(plot),
    xAxisId: x.axisId,
    yAxisId: y.axisId,
  }));
  base.name = '主图层';
  base.frame = structuredClone(
    presetMarker.sourceFrame ?? model.template.panels[0]!.frame,
  );
  delete base.frameLink;
  configureXAxis(base, true);
  configureYAxis(base, 'left');
  const removed = new Set(
    next.template.panels.slice(1).map((panel) => panel.panelId),
  );
  next.template.panels = [base];
  next.template.annotations = next.template.annotations.filter(
    (annotation) =>
      annotation.coordinateSpace === 'page' || !removed.has(annotation.panelId),
  );
  cleanGeneratedStructure(next.template);
  clearMarker(next.template);
  next.activePanelId = base.panelId;
  assertTemplate(next.template);
  return next;
}
