import { validateMarkerVertices } from '../marker-geometry.js';
import { f4ParameterIssues } from './domain-f4.js';
import {
  validateMarkerMapping,
  validateMarkerOverrides,
} from '../marker-mapping-validation.js';
import type { Panel } from '../schema/figure-template.js';
import type { PlotSlot } from '../schema/plot-slot.js';
import type { ValidationIssue } from './types.js';
import { categoricalDimension } from '../plot-contract.js';
import { isPositiveLogAxis } from '../axis-scale.js';

function axisIssues(panel: Panel, plot: PlotSlot): Array<[string, string]> {
  const category = categoricalDimension(plot),
    issues: Array<[string, string]> = [];
  for (const dimension of ['x', 'y'] as const) {
    const field = dimension === 'x' ? 'xAxisId' : 'yAxisId';
    const axis = panel.axes.find((a) => a.axisId === plot[field]);
    if (!axis) continue;
    if (plot.kind === 'xy' && isPositiveLogAxis(axis)) {
      const direction = dimension === 'x' ? 'horizontal' : 'vertical';
      const target = plot.dropLines?.[direction]?.target;
      if (target?.mode === 'value' && target.value <= 0)
        issues.push([
          `dropLines/${direction}/target/value`,
          '对数轴垂线指定值必须大于零',
        ]);
    }
    if ((axis.scale === 'category') !== (dimension === category))
      issues.push([field, '图表与分类轴不兼容']);
    if (needsLinear(plot, dimension) && axis.scale !== 'linear')
      issues.push([
        field,
        plot.kind === 'xy'
          ? '自然三次样条仅支持线性 X/Y 轴'
          : '此图表需要线性数值轴',
      ]);
  }
  return issues;
}
function needsLinear(plot: PlotSlot, dimension: 'x' | 'y') {
  if (plot.kind === 'xy') return plot.lineConnection === 'spline';
  return plot.kind !== 'box' && dimension !== categoricalDimension(plot);
}
import { validateMarkerDetails } from '../marker-detail-validation.js';
function parameterIssues(plot: PlotSlot): Array<[string, string]> {
  switch (plot.kind) {
    case 'xy':
      try {
        if (plot.markerDetails) {
          validateMarkerDetails(plot.markerDetails);
          if (Object.keys(plot.markerDetails).length && !plot.markerStyle)
            throw new Error('符号细节需要基础符号样式');
        }
      } catch (error) {
        return [['markerDetails', (error as Error).message]];
      }
      try {
        if (plot.markerMapping) {
          validateMarkerMapping(plot.markerMapping);
          if (!plot.markerStyle) throw new Error('映射需要基础符号样式');
        }
        if (plot.markerOverrides) {
          validateMarkerOverrides(plot.markerOverrides);
          if (!plot.markerStyle) throw new Error('单点覆盖需要基础符号样式');
        }
      } catch (error) {
        return [['markerMapping', (error as Error).message]];
      }
      if (
        plot.dataView?.rowRange &&
        plot.dataView.rowRange.from > plot.dataView.rowRange.to
      )
        return [['dataView/rowRange', '起始数据行不能大于结束数据行']];
      if (plot.markerStyle?.shape === 'custom') {
        try {
          validateMarkerVertices(plot.markerStyle.customVertices);
        } catch (error) {
          return [['markerStyle/customVertices', (error as Error).message]];
        }
      }
      return [];

    case 'bar':
      return plot.layout === 'stacked' && !plot.stackGroup
        ? [['stackGroup', '堆叠柱需要堆叠组']]
        : [];
    case 'histogram':
      if (plot.bins.mode === 'edges' && !increasing(plot.bins.edges))
        return [['bins/edges', '分箱边界必须严格递增']];
      if (
        plot.bins.mode === 'width' &&
        plot.bins.start !== undefined &&
        plot.bins.end !== undefined &&
        plot.bins.start >= plot.bins.end
      )
        return [['bins', '分箱起点必须小于终点']];
      if (
        plot.bins.scale &&
        plot.bins.scale !== 'linear' &&
        ((plot.bins.mode === 'width' &&
          ((plot.bins.start !== undefined && plot.bins.start <= 0) ||
            (plot.bins.end !== undefined && plot.bins.end <= 0))) ||
          (plot.bins.mode === 'edges' && plot.bins.edges.some((v) => v <= 0)))
      )
        return [['bins', '对数分箱边界必须大于零']];
      return distributionIssues(plot.distribution);
    case 'box':
      if (
        plot.percentileLow !== undefined &&
        plot.percentileHigh !== undefined &&
        plot.percentileLow >= plot.percentileHigh
      )
        return [['percentileLow', '百分位下限必须小于上限']];
      if (
        plot.confidence?.visible &&
        plot.confidence.method === 'notch' &&
        (plot.confidence.target !== 'median' ||
          Math.abs(plot.confidence.level - 0.95) > 1e-12)
      )
        return [
          [
            'confidence',
            '缺口近似仅支持中位数的95%置信区间；其他组合请选择正态近似',
          ],
        ];
      if (
        plot.distribution?.visible &&
        plot.distribution.side === 'split' &&
        !plot.bindings.split
      )
        return [
          ['bindings/split', '分裂分布需要绑定一个恰含两个层级的分裂分组列'],
        ];
      return distributionIssues(plot.distribution);
    case 'contour':
      if (plot.levels.mode === 'values' && !increasing(plot.levels.values))
        return [['levels/values', '等值层必须严格递增']];
      if (
        plot.levels.mode === 'interval' &&
        plot.levels.start >= plot.levels.end
      )
        return [['levels', '等值层起点必须小于终点']];
      if (
        plot.levels.mode === 'interval' &&
        Math.floor((plot.levels.end - plot.levels.start) / plot.levels.step) +
          1 >
          50
      )
        return [['levels/step', '等值层数量不能超过50']];
      return [];
    default:
      return [];
  }
}
function distributionIssues(
  distribution:
    | Extract<PlotSlot, { kind: 'histogram' | 'box' }>['distribution']
    | undefined,
): Array<[string, string]> {
  if (!distribution?.visible) return [];
  const requiredParameters: Partial<
    Record<typeof distribution.kind, string[]>
  > = {
    normal: ['mu', 'sigma'],
    lognormal: ['mu', 'sigma'],
    weibull: ['shape', 'scale'],
    exponential: ['scale'],
    gamma: ['shape', 'scale'],
    laplace: ['mu', 'scale'],
    lorentz: ['mu', 'scale'],
    poisson: ['lambda'],
    binomial: ['trials', 'p'],
  };
  for (const key of requiredParameters[distribution.kind] ?? [])
    if (!Number.isFinite(distribution.parameters[key]))
      return [
        [`distribution/parameters/${key}`, `分布参数 ${key} 必须显式填写`],
      ];
  const positiveKeys = ['sigma', 'scale', 'shape', 'lambda'];
  for (const key of positiveKeys) {
    const value = distribution.parameters[key];
    if (value !== undefined && (!(value > 0) || !Number.isFinite(value)))
      return [
        [`distribution/parameters/${key}`, '分布尺度与形状参数必须为有限正数'],
      ];
  }
  const trials = distribution.parameters.trials;
  if (
    trials !== undefined &&
    (!Number.isInteger(trials) || trials < 1 || trials > 10_000)
  )
    return [
      ['distribution/parameters/trials', '二项试验次数必须是1–10000的整数'],
    ];
  const probability = distribution.parameters.p;
  if (
    probability !== undefined &&
    (!(probability >= 0 && probability <= 1) || !Number.isFinite(probability))
  )
    return [['distribution/parameters/p', '二项概率必须在0–1之间']];
  if (
    distribution.kind === 'kde' &&
    distribution.bandwidth?.method === 'custom' &&
    !(distribution.bandwidth.value && distribution.bandwidth.value > 0)
  )
    return [['distribution/bandwidth/value', '自定义KDE带宽必须为有限正数']];
  return [];
}
function colorIssues(plot: PlotSlot): Array<[string, string]> {
  if (plot.kind !== 'heatmap' && plot.kind !== 'contour') return [];
  const range = plot.colorScale.range;
  if (range.mode === 'fixed' && range.min >= range.max)
    return [['colorScale/range', '颜色范围需要 min < max']];
  if (
    plot.colorScale.transform === 'log10' &&
    range.mode === 'fixed' &&
    range.min <= 0
  )
    return [['colorScale/range/min', '对数颜色范围必须大于零']];
  const bar = plot.colorScale.colorbar;
  if (
    bar.mode === 'independent' &&
    (!bar.range || bar.range.min >= bar.range.max)
  )
    return [['colorScale/colorbar/range', '独立色标范围需要 min < max']];
  if (
    bar.mode === 'independent' &&
    plot.colorScale.transform === 'log10' &&
    (bar.range?.min ?? 0) <= 0
  )
    return [['colorScale/colorbar/range/min', '对数独立色标范围必须大于零']];
  if (
    bar.orientation &&
    bar.side &&
    ((bar.orientation === 'vertical' && ['top', 'bottom'].includes(bar.side)) ||
      (bar.orientation === 'horizontal' &&
        ['left', 'right'].includes(bar.side)))
  )
    return [['colorScale/colorbar/side', '色标方向与停靠边不一致']];
  return [];
}
export function validateChartDomain(
  panel: Panel,
  plot: PlotSlot,
  path: string,
): ValidationIssue[] {
  return [
    ...axisIssues(panel, plot),
    ...parameterIssues(plot),
    ...f4ParameterIssues(plot),
    ...colorIssues(plot),
  ].map(([field, message]) => ({
    code: 'FIGURE_DOMAIN_INVARIANT_FAILED',
    path: path + '/' + field,
    message,
  }));
}
function increasing(values: number[]): boolean {
  return values.every(
    (value, index) =>
      Number.isFinite(value) && (index === 0 || value > values[index - 1]!),
  );
}
