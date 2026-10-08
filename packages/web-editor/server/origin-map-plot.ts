import {
  type FigureTemplate,
  type FillStyle,
  type LineStyle,
  type MarkerStyle,
  type Panel,
  type PlotSlot,
  type XyPlot,
} from '@plot-fig/figure-schema';
import type { OriginNativeSnapshot } from '../src/templates/origin-native-contract.js';
import {
  color,
  dash,
  leaf,
  node,
  num,
  opacity,
  positive,
  warn,
  yes,
  type MapContext,
} from './origin-map-common.js';

type NativePlot = OriginNativeSnapshot['layers'][number]['plots'][number];
const shapes: Record<number, MarkerStyle['shape']> = {
  1: 'square',
  2: 'circle',
  3: 'triangle',
  4: 'triangle-down',
  5: 'diamond',
  6: 'plus',
  7: 'cross',
  8: 'star',
  9: 'h-line',
  10: 'v-line',
  15: 'triangle-left',
  16: 'triangle-right',
  17: 'hexagon',
  18: 'star',
  19: 'pentagon',
};

function lineStyle(c: MapContext, value: unknown, path: string): LineStyle {
  const line = node(value);
  return {
    visible: num(line.Connect, 1) !== 0,
    color: color(c, line.Color, `${path}/Color`),
    widthPt: Math.max(0, num(line.Width, 1)),
    dash: dash(c, line.Style, `${path}/Style`),
    opacity: opacity(line.Transparency),
  };
}
function markerStyle(c: MapContext, value: unknown, path: string): MarkerStyle {
  const symbol = node(value),
    shape = shapes[num(symbol.Shape, 1)],
    edge = color(c, symbol.EdgeColor, `${path}/EdgeColor`),
    interior = num(symbol.Interior);
  if (!shape || num(symbol.Type) !== 0)
    warn(c, `${path}/Shape`, '自定义或字符符号暂未转换，使用方形符号');
  if (![0, 1, 3].includes(interior))
    warn(c, `${path}/Interior`, '符号内部图案暂未转换，保留基础填充');
  const edgeWidth = num(symbol.EdgeWidth, 255);
  if (edgeWidth === 255)
    warn(c, `${path}/EdgeWidth`, '符号自动边框宽度使用 1 pt');
  if (num(symbol.SizeUnit) !== 0)
    warn(c, `${path}/SizeUnit`, '符号非点单位大小暂未转换，使用 5 pt');
  return {
    visible: num(symbol.Shape, 1) !== 0,
    shape: shape ?? 'square',
    sizePt:
      num(symbol.SizeUnit) === 0
        ? positive(symbol.Size, 5) * positive(symbol.Scale, 1)
        : 5,
    fill:
      interior === 1
        ? 'none'
        : interior === 3
          ? '#ffffff'
          : color(c, symbol.FillColor, `${path}/FillColor`, edge),
    stroke: edge,
    strokeWidthPt: edgeWidth === 255 ? 1 : Math.max(0, edgeWidth),
    opacity: opacity(symbol.Transparency),
  };
}
function fillStyle(c: MapContext, format: unknown, path: string): FillStyle {
  const root = node(format),
    patterns = node(root.Patterns),
    pattern = node(root.Pattern ?? patterns.Above),
    fill = node(pattern.Fill),
    border = node(pattern.Border);
  if (num(node(fill.Pattern).Style) !== 0 || num(fill.ShadingMode) !== 0)
    warn(
      c,
      `${path}/Patterns/Above/Fill`,
      '图案或渐变填充暂未转换，保留基础填充颜色',
    );
  return {
    color: color(
      c,
      fill.FillColor,
      `${path}/Patterns/Above/Fill/FillColor`,
      '#515151',
    ),
    opacity: opacity(pattern.Transparency),
    borderColor: color(c, border.Color, `${path}/Patterns/Above/Border/Color`),
    borderWidthPt: Math.max(0, num(border.Width, 0.5)),
  };
}

export function mapPlot(
  c: MapContext,
  source: NativePlot,
  panel: Panel,
  index: number,
  slots: FigureTemplate['dataSlots'],
  path: string,
): PlotSlot | undefined {
  const kind = source.plotId;
  if (![200, 201, 202, 203, 204, 213, 214, 215, 216].includes(kind)) {
    warn(c, `${path}/plotId`, `绘图类型 ${kind} 暂不支持，已跳过`);
    return;
  }
  if (source.designations !== 'XY')
    warn(
      c,
      `${path}/designations`,
      `数据列标记 ${source.designations} 暂仅映射基础 X/Y，附加列需重新绑定`,
    );
  const id = `${panel.panelId}-plot-${index + 1}`,
    format = node(source.format),
    bar = [203, 213, 215, 216].includes(kind),
    area = kind === 204 || kind === 214;
  const xId = `${id}-x`,
    yId = `${id}-y`,
    horizontal = kind === 215 || kind === 216;
  slots.push(
    {
      dataSlotId: xId,
      name: `${panel.name} X${index + 1}`,
      role: bar ? 'category' : 'x',
      valueType: bar ? 'category' : 'number',
      required: true,
    },
    {
      dataSlotId: yId,
      name: `${panel.name} Y${index + 1}`,
      role: bar ? 'value' : 'y',
      valueType: 'number',
      required: true,
    },
  );
  const common = {
    plotSlotId: id,
    xAxisId: `${panel.panelId}-x`,
    yAxisId: `${panel.panelId}-y`,
    legendEntry: {
      visible: true,
      text: `Y${index + 1}`,
      source: 'auto' as const,
      format: 'plain' as const,
    },
  };
  let plot: PlotSlot;
  if (bar) {
    plot = {
      ...common,
      kind: 'bar',
      orientation: horizontal ? 'horizontal' : 'vertical',
      layout: 'grouped',
      width: 0.8,
      gap: 0.1,
      bindings: { category: xId, value: yId },
      fillStyle: fillStyle(c, format, `${path}/format`),
    };
    warn(c, `${path}/format`, '柱宽和柱间距使用默认值，请在预览中核对');
    for (const axis of panel.axes)
      if (axis.dimension === (horizontal ? 'y' : 'x')) {
        axis.scale = 'category';
        axis.range = { mode: 'auto' };
        axis.minorTicks.visible = false;
        axis.minorTicks.count = 0;
        delete axis.symLog;
        delete axis.rescale;
        delete axis.majorTicks.generation;
      }
  } else if (area) {
    const line = node(format.Line);
    plot = {
      ...common,
      kind: 'area',
      bindings: { x: xId, y: yId },
      baseline: num(line.BaseLineValue),
      lineStyle: lineStyle(c, format.Line, `${path}/format/Line`),
      fillStyle: fillStyle(c, format, `${path}/format`),
    };
    if (
      leaf(line.BaseLineValue) &&
      !Number.isFinite(Number(leaf(line.BaseLineValue)))
    )
      warn(
        c,
        `${path}/format/Line/BaseLineValue`,
        '面积基线表达式未执行，使用 0',
      );
  } else {
    const line = node(format.Line),
      connection = num(line.Connect, 1),
      connections: Record<number, XyPlot['lineConnection']> = {
        0: 'straight',
        1: 'straight',
        11: 'step-h',
        12: 'step-v',
      };
    plot = {
      ...common,
      kind: 'xy',
      mode: kind === 200 ? 'line' : kind === 201 ? 'markers' : 'line-markers',
      bindings: { x: xId, y: yId },
      ...(kind !== 201
        ? {
            lineStyle: lineStyle(c, line, `${path}/format/Line`),
            lineConnection: connections[connection] ?? 'straight',
          }
        : {}),
      ...(kind !== 200
        ? {
            markerStyle: markerStyle(c, format.Symbol, `${path}/format/Symbol`),
          }
        : {}),
    };
    if (kind !== 201 && !connections[connection])
      warn(
        c,
        `${path}/format/Line/Connect`,
        `连线方式 ${connection} 暂未等价转换，使用直线`,
      );
    if (yes(line.LineFillArea))
      warn(c, `${path}/format/Line/LineFillArea`, '曲线下方填充暂未转换');
  }
  if (yes(node(format.Label).Enable))
    warn(c, `${path}/format/Label`, 'Origin 数据标签格式暂未转换');
  if (
    yes(node(format.DropLines).Horizontal) ||
    yes(node(format.DropLines).Vertical)
  )
    warn(c, `${path}/format/DropLines`, 'Origin 垂线暂未转换');
  if (num(node(format.Misc).AttachedAxis) !== 0)
    warn(
      c,
      `${path}/format/Misc/AttachedAxis`,
      '绘图使用特殊坐标轴绑定，暂绑定图层主轴',
    );
  c.report.mapped.push(`${path}: ${plot.kind} 图型、数据槽位及基础样式`);
  return plot;
}
