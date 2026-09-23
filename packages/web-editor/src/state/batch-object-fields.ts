import { lineConnectionOptions } from './line-connection-options.js';
import {
  missingOptions,
  sortOptions,
  duplicateOptions,
  calculationOptions,
} from './xy-data-view-options.js';
import type { FigureTemplate, PlotSlot } from '@plot-fig/figure-schema';
import {
  boolField as b,
  numberField as n,
  textField as t,
  selectField as s,
  lineFields,
  dashOptions,
  type BatchGroup,
} from './batch-property-fields.js';

export function panelBatchGroups(): BatchGroup[] {
  return [
    f4Group('panel-curve-groups', '多曲线组', 'groups'),
    f4Group('panel-stack', '曲线堆叠', 'stack'),
    {
      id: 'panel-background',
      label: '图层背景',
      root: 'appearance.background',
      defaults: { color: 'none', opacity: 1 },
      fields: [t('color', '背景颜色'), n('opacity', '背景不透明度 (0–1)')],
    },
    {
      id: 'panel-border',
      label: '图层边框',
      root: 'appearance.border',
      defaults: { visible: false, color: '#000000', widthPt: 1, dash: 'solid' },
      fields: [
        b('visible', '显示边框'),
        t('color', '边框颜色'),
        n('widthPt', '边框宽度 (pt)'),
        s('dash', '边框线型', dashOptions),
      ],
    },
    {
      id: 'panel-shadow',
      label: '图层阴影',
      root: 'appearance.shadow',
      defaults: {
        visible: false,
        color: '#000000',
        opacity: 0.3,
        offsetXPt: 3,
        offsetYPt: 3,
      },
      fields: [
        b('visible', '显示阴影'),
        t('color', '阴影颜色'),
        n('opacity', '阴影不透明度 (0–1)'),
        n('offsetXPt', '阴影水平偏移 (pt)'),
        n('offsetYPt', '阴影垂直偏移 (pt)'),
      ],
    },
    {
      id: 'panel-display',
      label: '图层显示',
      root: '',
      defaults: { visible: true },
      fields: [b('visible', '显示图层'), b('clip', '裁剪图层数据')],
    },
    {
      id: 'panel-clip',
      label: '裁剪余量',
      root: 'clipMargins',
      defaults: { horizontalPct: 0, verticalPct: 0 },
      fields: [
        n('horizontalPct', '水平裁剪余量 (%)'),
        n('verticalPct', '垂直裁剪余量 (%)'),
      ],
    },
  ];
}
export function plotBatchGroups(
  template: FigureTemplate,
  plot: PlotSlot,
): BatchGroup[] {
  return [
    ...(['xy', 'bar', 'area'].includes(plot.kind)
      ? [
          f4Group('plot-data-labels', '数据标签', 'dataLabels'),
          f4Group(
            'plot-label-overrides',
            '标签单点覆盖（同源数据）',
            'labelOverrides',
          ),
        ]
      : []),
    ...(['xy', 'bar'].includes(plot.kind)
      ? [f4Group('plot-error-details', '高级误差', 'errorDetails')]
      : []),
    ...(['xy', 'area'].includes(plot.kind)
      ? [f4Group('plot-transform', '曲线偏移与填充', 'transform')]
      : []),
    ...(plot.kind === 'xy'
      ? [
          f4Group('plot-line-mapping', '线条颜色映射', 'lineMapping'),
          f4Group('plot-subset', '曲线内部子集', 'subset'),
        ]
      : []),
    ...(['xy', 'area', 'box', 'contour'].includes(plot.kind)
      ? [
          {
            id: 'plot-line',
            label: '曲线线条',
            root: 'lineStyle',
            defaults: {
              visible: 'lineStyle' in plot && !!plot.lineStyle?.visible,
              color: template.theme.line.color,
              widthPt: template.theme.line.widthPt,
              dash: 'solid',
            },
            fields: lineFields(),
          },
          {
            id: 'plot-line-appearance',
            label: '高级线条样式',
            root: 'lineStyle',
            defaults: {
              visible: 'lineStyle' in plot && !!plot.lineStyle?.visible,
              color: template.theme.line.color,
              widthPt: template.theme.line.widthPt,
              dash: 'solid',
            },
            fields: [
              s(
                'cap',
                '线端形状',
                { butt: '平端', round: '圆端', square: '方端' },
                true,
              ),
              s(
                'join',
                '拐角形状',
                { miter: '尖角', round: '圆角', bevel: '斜角' },
                true,
              ),
              n('miterLimit', '尖角限制', true),
              {
                key: 'opacity',
                label: '线条透明度 (%)',
                type: 'opacity' as const,
                optional: true,
              },
              {
                key: 'customDash',
                label: '自定义虚线',
                type: 'custom-dash' as const,
                optional: true,
              },
            ],
          },
        ]
      : []),
    ...(plot.kind === 'xy'
      ? [
          {
            id: 'plot-data-view',
            label: '曲线数据处理',
            root: 'dataView',
            defaults: {},
            fields: [
              {
                key: 'rowRange',
                label: '数据行范围',
                type: 'row-range' as const,
                optional: true,
              },
              s('missing', '无效点连接方式', missingOptions, true),
              s('sort', 'X 值排序', sortOptions, true),
              s('duplicates', '重复 X 值', duplicateOptions, true),
              s(
                'calculationSource',
                '计算与自动范围的数据来源',
                calculationOptions,
                true,
              ),
              {
                key: 'sampling',
                label: '显示抽样',
                type: 'series-sampling' as const,
                optional: true,
              },
              { ...b('sampleExport', '导出也使用抽样数据'), optional: true },
            ],
          },
          {
            id: 'plot-connection',
            label: '曲线连接方式',
            root: '',
            defaults: { lineConnection: 'straight' },
            fields: [s('lineConnection', '连接方式', lineConnectionOptions)],
          },
          {
            id: 'plot-line-extras',
            label: '连线与符号间隙',
            root: '',
            defaults: {},
            fields: [
              { ...b('closeLine', '首尾直线连接'), optional: true },
              n('symbolGapPct', '符号间隙 (%)', true),
              { ...b('lineInFront', '线条绘制在符号前方'), optional: true },
            ],
          },
          {
            id: 'plot-arrows',
            label: '曲线箭头',
            root: '',
            defaults: {},
            fields: [
              {
                key: 'lineArrows',
                label: '曲线箭头',
                type: 'curve-arrows' as const,
                optional: true,
              },
            ],
          },
          {
            id: 'plot-drop-lines',
            label: '曲线垂线',
            root: 'dropLines',
            defaults: {},
            fields: [
              {
                key: 'horizontal',
                label: '水平垂线',
                type: 'drop-line' as const,
                optional: true,
              },
              {
                key: 'vertical',
                label: '垂直垂线',
                type: 'drop-line' as const,
                optional: true,
              },
            ],
          },
          {
            id: 'plot-symbol',
            label: '曲线符号',
            root: 'markerStyle',
            defaults: {
              visible: !!plot.markerStyle?.visible,
              ...template.theme.marker,
              strokeWidthPt: 1,
            },
            fields: [
              b('visible', '显示符号'),
              {
                key: 'shape',
                label: '符号形状',
                type: 'marker-shape' as const,
              },
              n('sizePt', '符号大小 (pt)'),
              t('fill', '符号填充'),
              t('stroke', '符号边框颜色'),
              n('strokeWidthPt', '符号边框宽度 (pt)'),
            ],
          },
          {
            id: 'plot-symbol-appearance',
            label: '符号旋转与透明度',
            root: 'markerStyle',
            defaults: {
              visible: !!plot.markerStyle?.visible,
              ...template.theme.marker,
              strokeWidthPt: 1,
            },
            fields: [
              n('rotationDeg', '符号旋转 (°)', true),
              {
                key: 'opacity',
                label: '符号透明度 (%)',
                type: 'opacity' as const,
                optional: true,
              },
              { ...b('followLineOpacity', '跟随线条透明度'), optional: true },
            ],
          },
          {
            id: 'plot-marker-mapping',
            label: '符号数据映射',
            root: 'markerMapping',
            defaults: {},
            fields: (['color', 'size', 'shape'] as const).map((key) => ({
              key,
              label: { color: '颜色映射', size: '大小映射', shape: '形状映射' }[
                key
              ],
              type: 'marker-mapping' as const,
              optional: true,
            })),
          },
          {
            id: 'plot-marker-details',
            label: '符号细节',
            root: 'markerDetails',
            defaults: {},
            fields: (
              [
                'fixedSize',
                'fillOnlyOpacity',
                'strokeRadiusPct',
                'character',
                'overlap',
                'legend',
              ] as const
            ).map((key) => ({
              key,
              label: {
                fixedSize: '固定数据尺寸',
                fillOnlyOpacity: '仅填充透明度',
                strokeRadiusPct: '边框半径比例',
                character: '字符构造',
                overlap: '重合点展开',
                legend: '图例样本',
              }[key],
              type: 'marker-details' as const,
              optional: true,
            })),
          },
          {
            id: 'plot-marker-overrides',
            label: '单点样式（同源 XY）',
            root: '',
            defaults: {},
            fields: [
              {
                key: 'markerOverrides',
                label: '单点覆盖',
                type: 'point-overrides' as const,
                optional: true,
              },
            ],
          },
        ]
      : []),
    {
      id: 'plot-legend',
      label: '图例显示',
      root: 'legendEntry',
      defaults: {},
      fields: [b('visible', '显示图例')],
    },
  ];
}

function f4Group(id: string, label: string, key: string): BatchGroup {
  return {
    id,
    label,
    root: '',
    defaults: {},
    fields: [{ key, label, type: 'f4-object', optional: true }],
  };
}
