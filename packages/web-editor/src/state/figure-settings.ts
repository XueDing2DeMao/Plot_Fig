import { panelForPlot, synchronizeSharedAxes } from './publication-utils.js';
import { alignChartAxes } from './chart-operations.js';
import {
  normalizeCategoryAxis,
  normalizeCategoryTransitions,
} from './axis-category-settings.js';
import { categoricalDimension } from '@plot-fig/figure-schema';
import {
  validateFigureTemplate,
  resolvePanelFrames,
  type FigureTemplate,
  type PlotSlot,
  type XyPlot,
} from '@plot-fig/figure-schema';
import {
  applyFigureDetails,
  readFigureDetails,
  type FigureDetails,
} from './figure-details.js';

type Panel = FigureTemplate['panels'][number];
type Axis = Panel['axes'][number];
type Plot = Panel['plotSlots'][number];
export type AxisSettings = { title: string; min: string; max: string };
export type FigureSettings = {
  palette: string[];
  details: FigureDetails;
  x: AxisSettings;
  y: AxisSettings;
  plot: PlotSlot;
  line: NonNullable<XyPlot['lineStyle']>;
  marker: NonNullable<XyPlot['markerStyle']>;
};

function editableParts(template: FigureTemplate, plotSlotId: string) {
  const panel = panelForPlot(template, plotSlotId);
  const plot = panel?.plotSlots.find((item) => item.plotSlotId === plotSlotId);
  const x = panel?.axes.find((axis) => axis.axisId === plot?.xAxisId);
  const y = panel?.axes.find((axis) => axis.axisId === plot?.yAxisId);
  if (!plot || !x || !y) throw new Error('当前模板没有可编辑的 XY 曲线');
  return { plot, x, y };
}

export function readAxis(axis: Axis): AxisSettings {
  return {
    title: axis.title?.text ?? '',
    min: 'min' in axis.range ? String(axis.range.min) : '',
    max: 'max' in axis.range ? String(axis.range.max) : '',
  };
}

export function readFigureSettings(
  template: FigureTemplate,
  plotSlotId: string,
): FigureSettings {
  const { plot, x, y } = editableParts(template, plotSlotId);
  const { theme } = template;
  return {
    plot: structuredClone(plot),
    palette: [...theme.palette],
    details: readFigureDetails(template, plotSlotId),
    x: readAxis(x),
    y: readAxis(y),
    line: {
      visible: true,
      color: theme.line.color,
      widthPt: theme.line.widthPt,
      dash: 'solid',
      ...('lineStyle' in plot ? plot.lineStyle : {}),
    },
    marker: {
      visible: true,
      ...theme.marker,
      strokeWidthPt: 1,
      ...(plot.kind === 'xy' ? plot.markerStyle : {}),
    },
  };
}

function fixedAxisRange(axis: Axis, settings: AxisSettings): Axis['range'] {
  const low = settings.min.trim(),
    high = settings.max.trim();
  const min = Number(low),
    max = Number(high),
    label = `${axis.dimension.toUpperCase()} 轴`;
  if (!low || !high || !Number.isFinite(min) || !Number.isFinite(max))
    throw new Error(`${label}范围需同时填写两个有限数值，或同时留空`);
  if (min >= max) throw new Error(`${label}最小值必须小于最大值`);
  if (isPositiveLogAxis(axis) && min <= 0)
    throw new Error(`${label}对数范围必须为正数`);
  return { mode: 'fixed', min, max };
}
function axisRange(axis: Axis, settings: AxisSettings): Axis['range'] {
  const low = settings.min.trim(),
    high = settings.max.trim();
  const mode = axis.rescale?.mode;
  if (mode?.startsWith('fixed-min-') && !high) {
    if (!low || !Number.isFinite(Number(low)))
      throw new Error('请填写固定最小值');
    return { mode: 'min-only', min: Number(low) };
  }
  if (mode?.startsWith('fixed-max-') && !low) {
    if (!high || !Number.isFinite(Number(high)))
      throw new Error('请填写固定最大值');
    return { mode: 'max-only', max: Number(high) };
  }
  if (!low && !high) return { mode: 'auto' };
  if (axis.scale === 'category') throw new Error('分类轴使用自动类别范围');
  return fixedAxisRange(axis, settings);
}
export function updateAxis(axis: Axis, settings: AxisSettings): void {
  axis.range = axisRange(axis, settings);
  const hasAppearance =
    axis.title &&
    ['bold', 'italic', 'position', 'rotation', 'offsetPt'].some((key) =>
      Object.hasOwn(axis.title!, key),
    );
  if (!settings.title.trim() && !hasAppearance) delete axis.title;
  else if (settings.title !== axis.title?.text) {
    axis.title = {
      ...axis.title,
      format: axis.title?.format ?? 'auto',
      text: settings.title,
      fontFamily: axis.title?.fontFamily ?? axis.tickLabels.fontFamily,
      fontSizePt: axis.title?.fontSizePt ?? 12,
      color: axis.title?.color ?? axis.tickLabels.color,
    };
  }
}

function orientationSettings(
  panel: Panel,
  settings: FigureSettings,
): FigureSettings {
  const dimension = categoricalDimension(settings.plot);
  if (panel.plotSlots.length !== 1 || !dimension) return settings;
  const next = structuredClone(settings);
  for (const dim of ['x', 'y'] as const) {
    next[dim] = { ...next[dim], min: '', max: '' };
    next.details[dim] = {
      ...next.details[dim],
      scale: dim === dimension ? 'category' : 'linear',
      minorTicks: { ...next.details[dim].minorTicks, visible: false, count: 0 },
    };
    delete next.details[dim].rescale;
    normalizeCategoryAxis(next.details[dim]);
    const placement = next.details[dim].placement;
    if (
      placement?.mode === 'cross' &&
      panel.axes.some(
        (axis) => axis.axisId === placement.axisId && axis.scale === 'category',
      )
    )
      delete next.details[dim].placement;
  }
  return next;
}

function applyPlotStyles(plot: PlotSlot, settings: FigureSettings) {
  if (
    plot.kind !== 'bar' &&
    plot.kind !== 'histogram' &&
    plot.kind !== 'heatmap'
  )
    plot.lineStyle = { ...settings.line };
  if (plot.kind === 'xy') plot.markerStyle = structuredClone(settings.marker);
}
export function updateFigureSettings(
  template: FigureTemplate,
  plotSlotId: string,
  settings: FigureSettings,
): FigureTemplate {
  let next = structuredClone(template);
  next.theme.palette = [...settings.palette];
  const panel = panelForPlot(next, plotSlotId);
  const index = panel.plotSlots.findIndex((p) => p.plotSlotId === plotSlotId);
  if (index < 0) throw new Error('找不到图表');
  const oldPlot = panel.plotSlots[index]!;
  if (
    settings.plot.plotSlotId !== plotSlotId ||
    settings.plot.kind !== oldPlot.kind
  )
    throw new Error('请通过图表类型入口切换类型');
  panel.plotSlots[index] = structuredClone(settings.plot);
  const orientationChanged =
    categoricalDimension(oldPlot) !== categoricalDimension(settings.plot);
  if (orientationChanged) alignChartAxes(next, panel.plotSlots[index]!);
  if (orientationChanged) settings = orientationSettings(panel, settings);
  applyFigureDetails(next, plotSlotId, settings.details);
  const { plot, x, y } = editableParts(next, plotSlotId);
  updateAxis(x, settings.x);
  updateAxis(y, settings.y);
  applyPlotStyles(plot, settings);
  const sizes = [
    settings.line.widthPt,
    settings.marker.sizePt,
    settings.marker.strokeWidthPt,
  ];
  if (sizes.some((size) => !Number.isFinite(size) || size < 0))
    throw new Error('线宽和标记尺寸必须为非负有限数值');
  synchronizeSharedAxes(next, panel.panelId);
  if (orientationChanged) normalizeCategoryTransitions(template, next);
  next = resolvePanelFrames(next);
  const validation = validateFigureTemplate(next);
  if (!validation.ok) {
    const details = validation.issues.filter(
      (i) => i.code === 'FIGURE_DOMAIN_INVARIANT_FAILED',
    );
    throw new Error(
      details.length
        ? details.map((i) => i.message).join('；')
        : '图形设置无效，请检查参数范围、颜色和样式',
    );
  }
  return next;
}
import { isPositiveLogAxis } from '@plot-fig/figure-schema';
