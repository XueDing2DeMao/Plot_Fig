import { panelForPlot } from './publication-utils.js';
import { assertEditableFrame } from './panel-frame-links.js';
import type { FigureTemplate, XyPlot } from '@plot-fig/figure-schema';
import {
  isPositiveLogAxis,
  validateAxisScaleSettings,
} from '@plot-fig/figure-schema';

type Panel = FigureTemplate['panels'][number];
type Axis = Panel['axes'][number];
type Plot = Panel['plotSlots'][number];
const MAX_MINOR_TICKS = 100;
export type AxisDetails = Pick<
  Axis,
  | 'visible'
  | 'scale'
  | 'symLog'
  | 'logTicks'
  | 'scaleOptions'
  | 'advanced'
  | 'reverse'
  | 'line'
  | 'majorTicks'
  | 'minorTicks'
  | 'tickLabels'
  | 'grid'
  | 'placement'
  | 'rescale'
> & {
  titleFont: { family: string; sizePt: number; color: string };
  titleAppearance?: Omit<
    NonNullable<Axis['title']>,
    'text' | 'fontFamily' | 'fontSizePt' | 'color'
  >;
};
export type FigureDetails = {
  page: FigureTemplate['page'];
  frame: Panel['frame'];
  mode: XyPlot['mode'];
  legend: Plot['legendEntry'];
  x: AxisDetails;
  y: AxisDetails;
};

export function axisDetails(axis: Axis): AxisDetails {
  const titleAppearance =
    axis.title &&
    (Object.fromEntries(
      Object.entries(axis.title).filter(
        ([key]) => !['text', 'fontFamily', 'fontSizePt', 'color'].includes(key),
      ),
    ) as AxisDetails['titleAppearance']);
  return structuredClone({
    visible: axis.visible,
    scale: axis.scale,
    ...(axis.scaleOptions === undefined
      ? {}
      : { scaleOptions: axis.scaleOptions }),
    ...(axis.advanced === undefined ? {} : { advanced: axis.advanced }),
    ...(axis.symLog === undefined ? {} : { symLog: axis.symLog }),
    ...(axis.logTicks === undefined ? {} : { logTicks: axis.logTicks }),
    reverse: axis.reverse,
    line: axis.line,
    majorTicks: axis.majorTicks,
    minorTicks: axis.minorTicks,
    tickLabels: axis.tickLabels,
    ...(axis.rescale === undefined ? {} : { rescale: axis.rescale }),
    ...(axis.grid === undefined ? {} : { grid: axis.grid }),
    ...(axis.placement === undefined ? {} : { placement: axis.placement }),
    ...(titleAppearance === undefined ? {} : { titleAppearance }),
    titleFont: {
      family: axis.title?.fontFamily ?? axis.tickLabels.fontFamily,
      sizePt: axis.title?.fontSizePt ?? 12,
      color: axis.title?.color ?? axis.tickLabels.color,
    },
  });
}

function selectedPlot(panel: Panel, plotSlotId: string): Plot {
  const plot = panel.plotSlots.find((item) => item.plotSlotId === plotSlotId);
  if (!plot) throw new Error(`找不到曲线 ${plotSlotId}`);
  return plot;
}

export function readFigureDetails(
  template: FigureTemplate,
  plotSlotId: string,
): FigureDetails {
  const panel = panelForPlot(template, plotSlotId);
  const plot = selectedPlot(panel, plotSlotId);
  const x = panel.axes.find((axis) => axis.axisId === plot.xAxisId)!;
  const y = panel.axes.find((axis) => axis.axisId === plot.yAxisId)!;
  return {
    page: structuredClone(template.page),
    frame: { ...panel.frame },
    mode: plot.kind === 'xy' ? plot.mode : 'line-markers',
    legend: { ...plot.legendEntry },
    x: axisDetails(x),
    y: axisDetails(y),
  };
}

export function applyAxisDetails(axis: Axis, details: AxisDetails): void {
  validateAxisScaleSettings(details);
  const generation = details.majorTicks.generation;
  if (generation && generation.mode !== 'auto') {
    if (details.scale === 'category') throw new Error('分类轴仅支持自动主刻度');
    if (
      generation.mode === 'increment' &&
      (!Number.isFinite(generation.step) || generation.step <= 0)
    )
      throw new Error('主刻度增量必须为有限正数');
    if (
      generation.mode === 'count' &&
      (!Number.isInteger(generation.count) ||
        generation.count < 2 ||
        generation.count > 1000)
    )
      throw new Error('主刻度目标数量必须为 2–1000 的整数');
    if ('anchor' in generation && generation.anchor !== undefined) {
      if (!Number.isFinite(generation.anchor))
        throw new Error('主刻度锚点必须为有限数值，或留空');
      if (isPositiveLogAxis(details) && generation.anchor <= 0)
        throw new Error('对数轴主刻度锚点必须为正数');
    }
  }
  if (
    !Number.isInteger(details.minorTicks.count) ||
    details.minorTicks.count < 0 ||
    (details.minorTicks.count > MAX_MINOR_TICKS &&
      details.minorTicks.count !== axis.minorTicks.count)
  )
    throw new Error(`次刻度数量必须为 0–${MAX_MINOR_TICKS} 的整数`);
  const { titleFont, titleAppearance, ...style } = structuredClone(details);
  delete axis.rescale;
  delete axis.grid;
  delete axis.placement;
  delete axis.symLog;
  delete axis.logTicks;
  delete axis.scaleOptions;
  delete axis.advanced;
  Object.assign(axis, style);
  axis.title = {
    format: axis.title?.format ?? 'auto',
    ...titleAppearance,
    text: axis.title?.text ?? '',
    fontFamily: titleFont.family,
    fontSizePt: titleFont.sizePt,
    color: titleFont.color,
  };
}

export function applyFigureDetails(
  template: FigureTemplate,
  plotSlotId: string,
  details: FigureDetails,
): void {
  const { x, y, width, height } = details.frame;
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1 ||
    y + height > 1
  )
    throw new Error('图层位置和大小必须位于图页范围内');
  const size = details.page.size;
  if (
    ![size.width.value, size.height.value].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    throw new Error('图页宽度和高度必须为正数');
  const panel = panelForPlot(template, plotSlotId);
  const plot = selectedPlot(panel, plotSlotId);
  template.page = structuredClone(details.page);
  assertEditableFrame(panel, details.frame);
  panel.frame = { ...details.frame };
  if (plot.kind === 'xy') plot.mode = details.mode;
  plot.legendEntry = { ...details.legend };
  applyAxisDetails(
    panel.axes.find((axis) => axis.axisId === plot.xAxisId)!,
    details.x,
  );
  applyAxisDetails(
    panel.axes.find((axis) => axis.axisId === plot.yAxisId)!,
    details.y,
  );
}
