import type { DataBindingSet } from '@plot-fig/data-binding';
import { rescaleFigureRanges, figureCoordinates } from '@plot-fig/svg-renderer';
import {
  categoricalDimension,
  resolvePanelFrames,
  type Axis,
  type FigureTemplate,
  type Panel,
  type PlotSlot,
} from '@plot-fig/figure-schema';
import {
  readAxis,
  readFigureSettings,
  updateAxis,
  type AxisSettings,
  type FigureSettings,
} from './figure-settings.js';
import {
  applyAxisDetails,
  axisDetails,
  type AxisDetails,
} from './figure-details.js';
import type { PropertyObjectRef } from './property-objects.js';
import { alignChartAxes } from './chart-operations.js';
import { assertTemplate, synchronizeSharedAxis } from './publication-utils.js';
import {
  validateFixedAxisTicks,
  validateXyLineConnections,
  lineAppearanceAttributes,
} from '@plot-fig/svg-renderer';
import { normalizeCategoryTransitions } from './axis-category-settings.js';
import { assertEditableFrame, frameComponents } from './panel-frame-links.js';
import {
  setOppositeAxisSharing,
  setYAxisAlignment,
} from './axis-operations.js';

export type PropertyObjectSettings =
  | {
      kind: 'page';
      page: FigureTemplate['page'];
      metadata: FigureTemplate['metadata'];
      annotations?: FigureTemplate['annotations'];
    }
  | ({ kind: 'panel' } & Pick<
      Panel,
      | 'frame'
      | 'frameLink'
      | 'clip'
      | 'name'
      | 'visible'
      | 'appearance'
      | 'clipMargins'
      | 'axisLengthRatio'
      | 'groups'
      | 'stack'
    >)
  | {
      kind: 'axis';
      dimension: Axis['dimension'];
      range: AxisSettings;
      details: AxisDetails;
      axisLengthRatio?: Panel['axisLengthRatio'];
      relations: {
        sharedWithOpposite: boolean;
        alignmentValue?: number | undefined;
        legacyPanelRange?: boolean;
      };
    }
  | { kind: 'plot'; settings: FigureSettings };

function findPanel(template: FigureTemplate, panelId: string): Panel {
  const panel = template.panels.find((item) => item.panelId === panelId);
  if (!panel) throw new Error(`找不到图层 ${panelId}`);
  return panel;
}

function findAxis(panel: Panel, axisId: string): Axis {
  const axis = panel.axes.find((item) => item.axisId === axisId);
  if (!axis) throw new Error(`找不到坐标轴 ${panel.panelId}/${axisId}`);
  return axis;
}

function findPlot(panel: Panel, plotSlotId: string): PlotSlot {
  const plot = panel.plotSlots.find((item) => item.plotSlotId === plotSlotId);
  if (!plot) throw new Error(`找不到曲线 ${panel.panelId}/${plotSlotId}`);
  return plot;
}

function oppositeAxis(panel: Panel, axis: Axis): Axis | undefined {
  const position =
    axis.position === 'top'
      ? 'bottom'
      : axis.position === 'bottom'
        ? 'top'
        : axis.position === 'right'
          ? 'left'
          : 'right';
  return panel.axes.find(
    (candidate) =>
      candidate.position === position && candidate.dimension === axis.dimension,
  );
}

function axesShareGroup(
  template: FigureTemplate,
  panelId: string,
  firstAxisId: string,
  secondAxisId: string | undefined,
): boolean {
  if (!secondAxisId) return false;
  return (template.sharedAxisGroups ?? []).some((group) => {
    const ids = group.members
      .filter((member) => member.panelId === panelId)
      .map((member) => member.axisId);
    return ids.includes(firstAxisId) && ids.includes(secondAxisId);
  });
}

export function readPropertyObjectSettings(
  template: FigureTemplate,
  ref: PropertyObjectRef,
): PropertyObjectSettings {
  if (ref.kind === 'page')
    return {
      kind: 'page',
      page: structuredClone(template.page),
      metadata: structuredClone(template.metadata),
      annotations: structuredClone(template.annotations),
    };
  const panel = findPanel(template, ref.panelId);
  if (ref.kind === 'panel')
    return {
      kind: 'panel',
      frame: { ...panel.frame },
      ...(panel.axisLengthRatio
        ? { axisLengthRatio: { ...panel.axisLengthRatio } }
        : {}),
      ...(panel.frameLink === undefined
        ? {}
        : { frameLink: { ...panel.frameLink } }),
      clip: panel.clip,
      ...(panel.groups ? { groups: structuredClone(panel.groups) } : {}),
      ...(panel.stack ? { stack: structuredClone(panel.stack) } : {}),
      ...(panel.name === undefined ? {} : { name: panel.name }),
      ...(panel.visible === undefined ? {} : { visible: panel.visible }),
      ...(panel.appearance === undefined
        ? {}
        : { appearance: structuredClone(panel.appearance) }),
      ...(panel.clipMargins === undefined
        ? {}
        : { clipMargins: { ...panel.clipMargins } }),
    };
  if (ref.kind === 'axis') {
    const axis = findAxis(panel, ref.axisId);
    const opposite = oppositeAxis(panel, axis);
    return {
      kind: 'axis',
      dimension: axis.dimension,
      range: readAxis(axis),
      details: axisDetails(axis),
      ...(panel.axisLengthRatio
        ? { axisLengthRatio: { ...panel.axisLengthRatio } }
        : {}),
      relations: {
        ...(axis.compatibility?.unboundRange === 'panel-v1.7'
          ? { legacyPanelRange: true }
          : {}),
        sharedWithOpposite: axesShareGroup(
          template,
          panel.panelId,
          axis.axisId,
          opposite?.axisId,
        ),
        alignmentValue:
          axis.position === 'right' &&
          panel.yAxisAlignment?.rightAxisId === axis.axisId
            ? panel.yAxisAlignment.value
            : undefined,
      },
    };
  }
  findPlot(panel, ref.plotSlotId);
  return {
    kind: 'plot',
    settings: readFigureSettings(template, ref.plotSlotId),
  };
}

function sameBindings(
  left: PlotSlot['bindings'],
  right: PlotSlot['bindings'],
): boolean {
  const entries = Object.entries(left);
  const other = new Map(Object.entries(right));
  return (
    entries.length === other.size &&
    entries.every(([key, value]) => other.get(key) === value)
  );
}

function applyPlotSettings(
  template: FigureTemplate,
  panel: Panel,
  plot: PlotSlot,
  settings: FigureSettings,
) {
  if (
    plot.plotSlotId !== settings.plot.plotSlotId ||
    plot.kind !== settings.plot.kind ||
    !sameBindings(plot.bindings, settings.plot.bindings)
  )
    throw new Error('属性编辑不能修改曲线身份、类型或数据绑定');
  const xAxis = panel.axes.find(
    (axis) => axis.axisId === settings.plot.xAxisId,
  );
  const yAxis = panel.axes.find(
    (axis) => axis.axisId === settings.plot.yAxisId,
  );
  if (xAxis?.dimension !== 'x' || yAxis?.dimension !== 'y')
    throw new Error('曲线必须绑定同一图层内正确方向的坐标轴');
  const orientationChanged =
    categoricalDimension(plot) !== categoricalDimension(settings.plot);
  // 只接纳曲线自身可编辑字段，扩展信息始终保留当前模板中的值。
  for (const [key, value] of Object.entries(settings.plot))
    if (
      ![
        'plotSlotId',
        'kind',
        'xAxisId',
        'yAxisId',
        'bindings',
        'extensions',
      ].includes(key)
    )
      Object.assign(plot, { [key]: structuredClone(value) });
  if (plot.xAxisId !== xAxis.axisId) delete xAxis.compatibility;
  if (plot.yAxisId !== yAxis.axisId) delete yAxis.compatibility;
  plot.xAxisId = xAxis.axisId;
  plot.yAxisId = yAxis.axisId;
  if (
    plot.kind !== 'bar' &&
    plot.kind !== 'histogram' &&
    plot.kind !== 'heatmap'
  ) {
    lineAppearanceAttributes(settings.line);
    plot.lineStyle = structuredClone(settings.line);
  }
  if (plot.kind === 'xy') {
    if (settings.plot.kind === 'xy')
      for (const key of [
        'closeLine',
        'symbolGapPct',
        'lineArrows',
        'dropLines',
        'dataView',
        'markerMapping',
        'markerDetails',
        'markerOverrides',
        'lineMapping',
        'lineInFront',
        'dataLabels',
        'labelOverrides',
        'errorDetails',
        'subset',
        'transform',
      ] as const) {
        if (settings.plot[key] === undefined) delete plot[key];
        else
          Object.assign(plot, { [key]: structuredClone(settings.plot[key]) });
      }
    plot.markerStyle = structuredClone(settings.marker);
    plot.mode = settings.details.mode;
  }
  if (plot.kind === 'bar' || plot.kind === 'area') {
    for (const key of [
      'dataLabels',
      'labelOverrides',
      ...(plot.kind === 'bar' ? ['errorDetails'] : ['transform']),
    ]) {
      const source = settings.plot as unknown as Record<string, unknown>;
      if (source[key] === undefined)
        delete (plot as unknown as Record<string, unknown>)[key];
    }
  }
  plot.legendEntry = structuredClone(settings.details.legend);
  template.theme.palette = [...settings.palette];
  if (orientationChanged) {
    alignChartAxes(template, plot);
    if (panel.plotSlots.length === 1)
      for (const axis of panel.axes)
        synchronizeSharedAxis(template, {
          panelId: panel.panelId,
          axisId: axis.axisId,
        });
  }
}

export function updatePropertyObjectSettings(
  template: FigureTemplate,
  ref: PropertyObjectRef,
  value: PropertyObjectSettings,
  data?: DataBindingSet,
): FigureTemplate {
  if (ref.kind !== value.kind) throw new Error('属性类型与所选对象不匹配');
  let next = structuredClone(template);
  if (ref.kind === 'page' && value.kind === 'page') {
    if (
      ![value.page.size.width.value, value.page.size.height.value].every(
        (size) => Number.isFinite(size) && size > 0,
      )
    )
      throw new Error('图页宽度和高度必须为正数');
    next.page.size = structuredClone(value.page.size);
    next.page.background = value.page.background;
    if (value.page.backgroundPaint)
      next.page.backgroundPaint = structuredClone(value.page.backgroundPaint);
    else delete next.page.backgroundPaint;
    if (value.annotations)
      next.annotations = structuredClone(value.annotations);
    next.page.margins = structuredClone(value.page.margins);
    next.metadata = structuredClone(value.metadata);
  } else if (ref.kind !== 'page') {
    const panel = findPanel(next, ref.panelId);
    if (value.kind === 'panel' || value.kind === 'axis') {
      if (value.axisLengthRatio === undefined) delete panel.axisLengthRatio;
      else panel.axisLengthRatio = structuredClone(value.axisLengthRatio);
    }
    if (ref.kind === 'panel' && value.kind === 'panel') {
      if (
        panel.frameLink &&
        panel.frameLink.parentPanelId === value.frameLink?.parentPanelId &&
        frameComponents.every(
          (key) => panel.frameLink?.[key] === value.frameLink?.[key],
        )
      )
        assertEditableFrame(panel, value.frame);
      panel.frame = structuredClone(value.frame);
      panel.clip = value.clip;
      for (const key of [
        'frameLink',
        'name',
        'visible',
        'appearance',
        'clipMargins',
        'groups',
        'stack',
      ] as const) {
        if (value[key] === undefined) delete panel[key];
        else Object.assign(panel, { [key]: structuredClone(value[key]) });
      }
    } else if (ref.kind === 'axis' && value.kind === 'axis') {
      const axis = findAxis(panel, ref.axisId);
      if (axis.dimension !== value.dimension)
        throw new Error('属性编辑不能修改坐标轴方向');
      applyAxisDetails(axis, value.details);
      if (value.relations.legacyPanelRange === false) delete axis.compatibility;
      const oldAxis = findAxis(findPanel(template, ref.panelId), ref.axisId);
      const capturesWindow =
        data &&
        axis.rescale?.mode !== oldAxis.rescale?.mode &&
        axis.rescale?.mode.startsWith('fixed') &&
        !value.range.min &&
        !value.range.max;
      if (!capturesWindow) updateAxis(axis, value.range);
      synchronizeSharedAxis(next, ref);
      if (axis.position === 'top' || axis.position === 'right') {
        // 关系与尺度属于同次编辑，先移除旧约束，避免中间态阻止纠错。
        if (axis.position === 'right') delete panel.yAxisAlignment;
        next = setOppositeAxisSharing(
          next,
          ref.panelId,
          ref.axisId,
          value.relations.sharedWithOpposite,
        );
        if (axis.position === 'right' && !value.relations.sharedWithOpposite)
          next = setYAxisAlignment(
            next,
            ref.panelId,
            value.relations.alignmentValue,
          );
      }
    } else if (ref.kind === 'plot' && value.kind === 'plot') {
      applyPlotSettings(
        next,
        panel,
        findPlot(panel, ref.plotSlotId),
        value.settings,
      );
      normalizeCategoryTransitions(template, next);
    }
  }
  next = resolvePanelFrames(next);
  if (data) {
    const resolved = rescaleFigureRanges({
      before: template,
      candidate: next,
      beforeData: data,
      data,
      reason: 'change',
    });
    const errors = resolved.diagnostics.filter((d) => d.severity === 'error');
    if (errors.length) throw new Error(errors.map((d) => d.message).join('；'));
    next = resolved.template;
  }
  assertTemplate(next);
  if (next.panels.some((panel) => panel.axisLengthRatio))
    figureCoordinates(next, data);
  const tickErrors = [
    ...validateFixedAxisTicks(next),
    ...validateXyLineConnections(next, data),
  ];
  if (tickErrors.length)
    throw new Error(
      tickErrors
        .map((issue) => `${issue.sourcePath}: ${issue.message}`)
        .join('；'),
    );
  return next;
}
