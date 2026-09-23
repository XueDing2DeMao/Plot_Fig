import type {
  PlotKind,
  PlotSlot,
  LineStyle,
  FillStyle,
  ColorScale,
} from '@plot-fig/figure-schema';
export type ChartChoice = PlotKind | 'stacked-bar' | 'scatter';
export const chartChoices: Record<ChartChoice, string> = {
  xy: '折线图',
  scatter: '散点图',
  bar: '柱形图',
  'stacked-bar': '堆叠柱形图',
  histogram: '直方图',
  box: '箱线图',
  area: '面积图',
  heatmap: '热力图',
  contour: '等值线图',
};
export function chartChoice(plot: PlotSlot): ChartChoice {
  if (plot.kind === 'xy' && plot.mode === 'markers') return 'scatter';
  return plot.kind === 'bar' && plot.layout === 'stacked'
    ? 'stacked-bar'
    : plot.kind;
}
type Common = Pick<
  PlotSlot,
  'plotSlotId' | 'xAxisId' | 'yAxisId' | 'legendEntry' | 'extensions'
>;
type Styles = {
  color: string;
  lineStyle: LineStyle;
  fillStyle: FillStyle;
  colorScale: ColorScale;
};
function stylesFor(source: PlotSlot): Styles {
  const color =
    'fillStyle' in source
      ? source.fillStyle.color
      : 'lineStyle' in source && source.lineStyle
        ? source.lineStyle.color
        : '#21918c';
  return {
    color,
    lineStyle: { visible: true, color, widthPt: 1.5, dash: 'solid' },
    fillStyle: { color, opacity: 0.7, borderColor: color, borderWidthPt: 1 },
    colorScale:
      'colorScale' in source
        ? structuredClone(source.colorScale)
        : {
            colors: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
            reverse: false,
            transform: 'linear',
            interpolation: 'continuous',
            range: { mode: 'auto' },
            colorbar: {
              visible: true,
              title: 'Z',
              mode: 'linked',
              orientation: 'vertical',
              side: 'right',
              length: 1,
              widthPt: 10,
              majorTicks: 3,
              minorTicks: 0,
              notation: 'auto',
              precision: 6,
              endpoints: 'flat',
            },
          },
  };
}
function barDefault(common: Common, style: Styles, stacked: boolean): PlotSlot {
  return {
    ...common,
    kind: 'bar',
    layout: stacked ? 'stacked' : 'grouped',
    ...(stacked ? { stackGroup: 'stack-1' } : {}),
    orientation: 'vertical',
    width: 0.8,
    gap: 0.1,
    overlap: 0,
    options: { baseline: 0, percentage: false, missing: 'gap' },
    fillStyle: style.fillStyle,
    bindings: { category: 'category', value: 'value' },
  };
}
const factories: Record<
  ChartChoice,
  (common: Common, style: Styles) => PlotSlot
> = {
  xy: (common, style) => ({
    ...common,
    kind: 'xy',
    mode: 'line',
    bindings: { x: 'x', y: 'y' },
    lineStyle: style.lineStyle,
    markerStyle: {
      visible: true,
      shape: 'circle',
      sizePt: 4,
      fill: style.color,
      stroke: style.color,
      strokeWidthPt: 1,
    },
  }),
  scatter: (common, style) => ({
    ...common,
    kind: 'xy',
    mode: 'markers',
    bindings: { x: 'x', y: 'y' },
    lineStyle: style.lineStyle,
    markerStyle: {
      visible: true,
      shape: 'circle',
      sizePt: 4,
      fill: style.color,
      stroke: style.color,
      strokeWidthPt: 1,
    },
  }),
  bar: (common, style) => barDefault(common, style, false),
  'stacked-bar': (common, style) => barDefault(common, style, true),
  histogram: (common, style) => ({
    ...common,
    kind: 'histogram',
    bindings: { values: 'values' },
    bins: { mode: 'auto' },
    normalization: 'count',
    boundary: 'left',
    gap: 0,
    fillStyle: style.fillStyle,
  }),
  box: (common, style) => ({
    ...common,
    kind: 'box',
    bindings: { values: 'values', group: 'group', split: 'split' },
    orientation: 'vertical',
    width: 0.6,
    quantileMethod: 'type7',
    whiskerFactor: 1.5,
    showOutliers: true,
    showMedian: true,
    showMean: false,
    showNotch: false,
    showExtremes: false,
    rawPoints: 'none',
    fillStyle: style.fillStyle,
    lineStyle: style.lineStyle,
  }),
  area: (common, style) => ({
    ...common,
    kind: 'area',
    bindings: { x: 'x', y: 'y' },
    baseline: 0,
    fillStyle: style.fillStyle,
    lineStyle: style.lineStyle,
  }),
  heatmap: (common, style) => ({
    ...common,
    kind: 'heatmap',
    bindings: { x: 'x', y: 'y', z: 'z' },
    colorScale: style.colorScale,
    heatmap: {
      missingColor: '#eeeeee',
      labels: false,
      interpolation: 'nearest',
      dataRegion: 'matrix',
    },
  }),
  contour: (common, style) => ({
    ...common,
    kind: 'contour',
    bindings: { x: 'x', y: 'y', z: 'z' },
    colorScale: style.colorScale,
    mode: 'lines',
    levels: { mode: 'auto', count: 10 },
    lineStyle: style.lineStyle,
    contour: {
      smoothing: false,
      labels: false,
      outOfRange: 'clamp',
      dataRegion: 'matrix',
    },
  }),
};
export function chartDefaults(choice: ChartChoice, source: PlotSlot): PlotSlot {
  const common: Common = {
    plotSlotId: source.plotSlotId,
    xAxisId: source.xAxisId,
    yAxisId: source.yAxisId,
    legendEntry: { ...source.legendEntry },
    ...(source.extensions
      ? { extensions: structuredClone(source.extensions) }
      : {}),
  };
  return factories[choice](common, stylesFor(source));
}
