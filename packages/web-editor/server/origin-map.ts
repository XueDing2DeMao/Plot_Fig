import {
  CURRENT_SCHEMA_VERSION,
  validateFigureTemplate,
  type FigureTemplate,
  type Panel,
} from '@plot-fig/figure-schema';
import type { OriginNativeResult } from '../src/templates/origin-native-contract.js';
import {
  checkedSnapshot,
  color,
  leaf,
  node,
  num,
  opacity,
  reportScripts,
  warn,
  yes,
  type MapContext,
} from './origin-map-common.js';
import { mapAxes } from './origin-map-axis.js';
import { mapPlot } from './origin-map-plot.js';
import { mapStack } from './origin-map-stack.js';
import { layerFrame, layerLegend, pageSize } from './origin-map-layout.js';

export function mapOriginNative(
  input: unknown,
  filename: string,
  sourceHash: string,
): OriginNativeResult {
  const snapshot = checkedSnapshot(input),
    c: MapContext = {
      snapshot,
      report: {
        originVersion: snapshot.originVersion,
        mapped: [],
        warnings: [],
      },
    };
  for (const item of snapshot.warnings)
    if (
      item &&
      typeof item.path === 'string' &&
      typeof item.message === 'string'
    )
      warn(c, item.path, item.message);
  reportScripts(c, snapshot.page, '/page');
  const background = node(snapshot.page.Background),
    backgroundColor = color(
      c,
      background.BaseColor,
      '/page/Background/BaseColor',
      '#ffffff',
    );
  const template: FigureTemplate = {
    kind: 'figure-template',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId: `origin-${sourceHash.replace(/[^A-Za-z0-9]/g, '').slice(0, 80) || 'template'}`,
    metadata: {
      name:
        filename
          .split(/[\\/]/)
          .at(-1)!
          .replace(/\.(?:otp|otpu)$/i, '') || 'Origin 模板',
      tags: ['origin-import'],
    },
    page: {
      size: pageSize(snapshot.page),
      background:
        backgroundColor === 'none' && yes(background.Auto, true)
          ? '#ffffff'
          : backgroundColor,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    panels: [],
    dataSlots: [],
    annotations: [],
    theme: {
      font: { family: 'Arial', sizePt: 10, color: '#000000' },
      line: { color: '#000000', widthPt: 1 },
      marker: {
        shape: 'square',
        sizePt: 5,
        fill: '#000000',
        stroke: '#000000',
      },
      palette: ['#000000'],
      background: '#ffffff',
    },
    provenance: {
      sourceKind: 'origin-native',
      sourceHash,
      importerVersion: '0.1.0',
    },
  };
  c.report.mapped.push('/page: 页面尺寸与背景');
  if (leaf(background.GradientColor, '-4') !== leaf(background.BaseColor, '-4'))
    warn(c, '/page/Background', '页面渐变背景暂未转换，保留基础颜色');
  for (const [index, layer] of snapshot.layers.entries()) {
    const path = `/layers/${index}`,
      format = layer.format,
      display = node(format.Display),
      layerBackground = node(format.Background);
    reportScripts(c, format, `${path}/format`);
    const panel: Panel = {
      panelId: `origin-layer-${index + 1}`,
      name: layer.name.slice(0, 128) || `Layer ${index + 1}`,
      frame: layerFrame(c, format, `${path}/format`),
      coordinateSystem: 'cartesian-2d',
      clip: yes(display.ClipToFrame, true),
      axes: [],
      plotSlots: [],
    };
    panel.axes = mapAxes(c, format, panel.panelId, `${path}/format`);
    if (
      yes(display.ExchangeXY) &&
      layer.plots.length &&
      layer.plots.every((plot) => [215, 216].includes(plot.plotId))
    ) {
      panel.axes = panel.axes.map((axis) => {
        const dimension = axis.dimension === 'x' ? 'y' : 'x';
        const opposite = axis.position === 'top' || axis.position === 'right';
        return {
          ...axis,
          axisId: `${panel.panelId}-${dimension}${opposite ? '-opposite' : ''}`,
          dimension,
          position:
            dimension === 'x'
              ? opposite
                ? 'top'
                : 'bottom'
              : opposite
                ? 'right'
                : 'left',
          ...(axis.title
            ? {
                title: { ...axis.title, rotation: dimension === 'x' ? 0 : -90 },
              }
            : {}),
        } as Panel['axes'][number];
      });
    }
    panel.appearance = {
      background: {
        color: color(
          c,
          layerBackground.Color,
          `${path}/format/Background/Color`,
          'none',
        ),
        opacity: opacity(layerBackground.LayerBkColor1Trans),
      },
      dataOnTopOfAxes: yes(display.DataOnTopAxes),
    };
    for (const [plotIndex, plot] of layer.plots.entries()) {
      reportScripts(c, plot.format, `${path}/plots/${plotIndex}/format`);
      const mapped = mapPlot(
        c,
        plot,
        panel,
        plotIndex,
        template.dataSlots,
        `${path}/plots/${plotIndex}`,
      );
      if (mapped) {
        mapped.visible = yes(display.ShowData, true);
        panel.plotSlots.push(mapped);
      }
    }
    for (const id of layer.unsupportedPlotIds)
      warn(c, `${path}/unsupportedPlotIds`, `绘图类型 ${id} 暂不支持，已跳过`);
    if (panel.plotSlots.length) mapStack(c, layer, panel, `${path}/format`);
    layerLegend(
      c,
      format.Legend,
      panel,
      template.annotations,
      `${path}/format/Legend`,
    );
    if (yes(node(format.LinkAxis).Scales) || yes(node(format.LinkAxis).Styles))
      warn(
        c,
        `${path}/format/LinkAxis`,
        '图层链接暂未转换，保留各层当前坐标范围',
      );
    if (
      num(display.ExchangeXY) &&
      !panel.plotSlots.every(
        (plot) => plot.kind === 'bar' && plot.orientation === 'horizontal',
      )
    )
      warn(
        c,
        `${path}/format/Display/ExchangeXY`,
        '交换 X/Y 的图层显示暂未转换',
      );
    if (Object.keys(node(format.Annotations)).length)
      warn(c, `${path}/format/Annotations`, '附加绘图对象暂未转换');
    template.panels.push(panel);
    c.report.mapped.push(`${path}: 图层位置、大小与裁剪`);
  }
  if (!template.panels.some((panel) => panel.plotSlots.length))
    throw new Error('Origin 模板中没有当前支持的绘图类型');
  const firstAxis = template.panels[0]!.axes[0]!;
  template.theme.font = {
    family: firstAxis.tickLabels.fontFamily,
    sizePt: firstAxis.tickLabels.fontSizePt,
    color: firstAxis.tickLabels.color,
  };
  const palette = template.panels.flatMap((panel) =>
    panel.plotSlots.flatMap((plot) =>
      'lineStyle' in plot && plot.lineStyle
        ? [plot.lineStyle.color]
        : 'markerStyle' in plot && plot.markerStyle
          ? [plot.markerStyle.stroke]
          : 'fillStyle' in plot
            ? [plot.fillStyle.color]
            : [],
    ),
  );
  template.theme.palette = [...new Set(palette)].filter(
    (value) => value !== 'none',
  );
  if (!template.theme.palette.length) template.theme.palette = ['#000000'];
  template.theme.background = template.page.background;
  warn(
    c,
    '/compatibility',
    '附加绘图对象、复杂分组、数据驱动样式及特殊坐标效果尚未完整转换，请检查预览',
  );
  const validated = validateFigureTemplate(template);
  if (!validated.ok)
    throw new Error(
      `Origin 模板转换后校验失败：${validated.issues
        .slice(0, 5)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('；')}`,
    );
  return { template: validated.value, report: c.report };
}
