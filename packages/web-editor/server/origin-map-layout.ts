import type { FigureTemplate, Panel } from '@plot-fig/figure-schema';
import {
  font,
  color,
  node,
  num,
  plainText,
  positive,
  warn,
  yes,
  type MapContext,
} from './origin-map-common.js';
const mmPerUnit = [25.4, 10, 1, 25.4 / 96, 25.4 / 72];
export function pageSize(format: unknown): FigureTemplate['page']['size'] {
  const d = node(node(format).Dimension),
    unit = num(d.Units, -1),
    width = num(d.Width),
    height = num(d.Height);
  if (!(unit in mmPerUnit) || width <= 0 || height <= 0)
    throw new Error('Origin 页面尺寸或单位无效');
  const units = ['in', 'cm', 'mm', 'px'] as const;
  return unit === 4
    ? {
        width: { value: width / 72, unit: 'in' },
        height: { value: height / 72, unit: 'in' },
      }
    : {
        width: { value: width, unit: units[unit]! },
        height: { value: height, unit: units[unit]! },
      };
}
export function layerFrame(
  c: MapContext,
  format: unknown,
  path: string,
): Panel['frame'] {
  const d = node(node(format).Dimension),
    page = node(c.snapshot.page.Dimension),
    unit = num(d.Units),
    pageUnit = num(page.Units);
  let x = num(d.Left) / 100,
    y = num(d.Top) / 100,
    width = num(d.Width, 80) / 100,
    height = num(d.Height, 80) / 100;
  if (unit !== 0) {
    if (unit >= 1 && unit <= 5) {
      const factor = mmPerUnit[unit - 1]!,
        pageWidth = num(page.Width) * mmPerUnit[pageUnit]!,
        pageHeight = num(page.Height) * mmPerUnit[pageUnit]!;
      x = (num(d.Left) * factor) / pageWidth;
      y = (num(d.Top) * factor) / pageHeight;
      width = (num(d.Width) * factor) / pageWidth;
      height = (num(d.Height) * factor) / pageHeight;
    } else
      throw new Error(
        `${path}/Dimension/Units: 暂不支持相对链接图层的尺寸单位`,
      );
  }
  if (
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1 ||
    y + height > 1
  ) {
    warn(c, `${path}/Dimension`, '超出页面的图层边界已收回页面范围');
    x = Math.max(0, Math.min(0.999, x));
    y = Math.max(0, Math.min(0.999, y));
    width = Math.max(0.001, Math.min(1 - x, width));
    height = Math.max(0.001, Math.min(1 - y, height));
  }
  return { x, y, width, height };
}

export function layerLegend(
  c: MapContext,
  value: unknown,
  panel: Panel,
  annotations: FigureTemplate['annotations'],
  path: string,
) {
  const legend = node(value);
  if (!yes(legend.Show)) return;
  const dimension = node(legend.Dimension),
    textFont = node(legend.Font),
    units = num(dimension.Units, 6);
  let x = 0.8,
    y = 0.95;
  if (units === 6) {
    x = num(dimension.Left, 80) / 100;
    // Origin Top 从上向下计量，panel 注释坐标从下向上计量。
    y = 1 - num(dimension.Top, 5) / 100;
  } else
    warn(c, `${path}/Dimension/Units`, '图例位置单位暂未转换，使用图层右上方');
  if (yes(dimension.EnablePos))
    warn(
      c,
      `${path}/Dimension`,
      '图例锚点已按读取的左上角位置定位，请核对预览',
    );
  const text = plainText(c, legend.Text, `${path}/Text`, '');
  if (
    panel.plotSlots.length === 1 &&
    text.trim() &&
    text.length <= 1024 &&
    !/[\\\r\n\t]/.test(text)
  ) {
    panel.plotSlots[0]!.legendEntry = {
      ...panel.plotSlots[0]!.legendEntry,
      text,
      source: 'manual',
      format: 'plain',
    };
    c.report.mapped.push(`${path}/Text: 单曲线静态图例文字`);
  } else {
    warn(
      c,
      `${path}/Text`,
      '原始图例文字未保留：仅支持单曲线的单行静态文字，当前使用绘图系列名称',
    );
  }
  annotations.push({
    annotationId: `${panel.panelId}-legend`,
    kind: 'legend',
    coordinateSpace: 'panel',
    panelId: panel.panelId,
    visible: true,
    position: { x, y },
    textStyle: {
      fontFamily: font(c, textFont.Face, `${path}/Font/Face`),
      fontSizePt: Math.min(256, positive(textFont.Size, 10)),
      color: color(c, legend.Color, `${path}/Color`),
      bold: yes(textFont.Bold),
      italic: yes(textFont.Italic),
      anchor: 'start',
      rotation: Math.max(-360, Math.min(360, -num(legend.Angle))),
    },
  });
  c.report.mapped.push(`${path}: 图例位置及字体`);
}
