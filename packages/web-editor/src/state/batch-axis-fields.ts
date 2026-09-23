import type { Axis } from '@plot-fig/figure-schema';
import {
  boolField as b,
  numberField as n,
  textField as t,
  selectField as s,
  lineFields,
  lineDefaults,
  type BatchGroup,
} from './batch-property-fields.js';

const textAppearance = () => [
  b('bold', '粗体'),
  b('italic', '斜体'),
  n('rotation', '旋转角度 (°)', true),
  n('offsetPt.x', '水平偏移 (pt)'),
  n('offsetPt.y', '垂直偏移 (pt)'),
];
const fontFields = () => [
  t('fontFamily', '字体'),
  n('fontSizePt', '字号 (pt)'),
  t('color', '文字颜色'),
];
export function axisBatchGroups(axis: Axis): BatchGroup[] {
  const direction = { in: '向内', out: '向外', both: '双向' };
  const tickFields = (minor: boolean) => [
    b('visible', '显示刻度'),
    n('lengthPt', '刻度长度 (pt)'),
    n('widthPt', '刻度宽度 (pt)'),
    t('color', '刻度颜色'),
    s('direction', '刻度方向', direction),
    ...(minor
      ? [s('lengthMode', '长度方式', { manual: '手动', auto: '自动' })]
      : []),
  ];
  return [
    ...(axis.scale === 'category'
      ? []
      : [
          {
            id: 'axis-scale',
            label: '数值尺度',
            root: '',
            defaults: {},
            fields: [
              s('scale', '尺度', {
                linear: '线性',
                log10: 'Log10',
                ln: 'Ln',
                log2: 'Log2',
                probability: 'Probability',
                probit: 'Probit',
                reciprocal: '倒数',
                'offset-reciprocal': '偏移倒数',
                logit: 'Logit',
                weibull: 'Weibull',
                discrete: 'Discrete',
                custom: '自定义公式',
              }),
              n('symLog.threshold', 'SymLog阈值', true),
              {
                key: 'scaleOptions',
                label: '尺度参数',
                type: 'f5-object' as const,
                optional: true,
              },
              n('symLog.linearLength', 'SymLog线性段长度', true),
              s(
                'logTicks.mode',
                '对数刻度策略',
                { logarithmic: '真实对数细分', 'origin-log10': 'Origin窄区间' },
                true,
              ),
            ],
          },
          {
            id: 'axis-symlog',
            label: 'SymLog参数',
            root: 'symLog',
            defaults: { threshold: 1, linearLength: 1 },
            fields: [
              n('threshold', '线性范围阈值', true),
              n('linearLength', '线性段长度', true),
            ],
          },
          {
            id: 'axis-log-ticks',
            label: '对数刻度策略',
            root: 'logTicks',
            defaults: {},
            fields: [
              s(
                'mode',
                '策略',
                { logarithmic: '真实对数细分', 'origin-log10': 'Origin窄区间' },
                true,
              ),
            ],
          },
        ]),
    ...Object.entries({
      calendar: '日历刻度',
      categoryOrder: '分类排序',
      ticks: '自定义刻度',
      labels: '标签来源',
      labelTable: '多行标签表',
      minorLabels: '次刻度标签',
      specialTicks: '特殊刻度',
      arrow: '轴线箭头',
      references: '参考线与填色',
      rug: 'Rug',
      breaks: '断轴',
      link: '公式轴链接',
    }).map(([key, label]): BatchGroup => ({
      id: 'axis-advanced-' + key,
      label,
      root: 'advanced',
      defaults: {},
      fields: [{ key, label, type: 'f5-object', optional: true }],
    })),
    {
      id: 'axis-labels',
      label: '刻度标签',
      root: 'tickLabels',
      defaults: {
        bold: false,
        italic: false,
        offsetPt: { x: 0, y: 0 },
        prefix: '',
        suffix: '',
        divisor: 1,
        background: 'none',
        position: 'tick',
        lineHeight: 1.2,
        overlap: 'keep',
      },
      fields: [
        b('visible', '显示标签'),
        ...fontFields(),
        s('notation', '数字格式', {
          auto: '自动',
          fixed: '固定小数',
          scientific: '科学计数法',
          engineering: '工程计数法',
        }),
        n('precision', '精度'),
        ...textAppearance(),
        t('prefix', '前缀'),
        t('suffix', '后缀'),
        n('divisor', '除数'),
        s('background', '标签背景', { none: '无', white: '白色' }),
        s(
          'anchor',
          '文字对齐',
          { start: '起点', middle: '居中', end: '终点' },
          true,
        ),
        s('position', '标签位置', { tick: '刻度处', interval: '刻度间' }),
        n('wrapWidthPt', '换行宽度 (pt)', true),
        n('lineHeight', '行高倍数'),
        s('overlap', '重叠处理', { keep: '保留', hide: '隐藏重叠' }),
      ],
    },
    {
      id: 'axis-line',
      label: '轴线',
      root: 'line',
      defaults: { visible: true },
      fields: [
        b('visible', '显示轴线'),
        t('color', '轴线颜色'),
        n('widthPt', '轴线宽度 (pt)'),
      ],
    },
    ...(['major', 'minor'] as const).map((kind): BatchGroup => ({
      id: 'axis-' + kind,
      label: kind === 'major' ? '主刻度外观' : '次刻度外观',
      root: kind + 'Ticks',
      defaults: {
        color: axis.line.color,
        direction: 'out',
        lengthMode: 'manual',
      },
      fields: tickFields(kind === 'minor'),
    })),
    {
      id: 'axis-grid',
      label: '网格线',
      root: 'grid',
      defaults: {
        major: { ...lineDefaults, color: '#d1d5db' },
        minor: { ...lineDefaults, color: '#e5e7eb' },
        layer: 'back',
      },
      fields: [
        s('layer', '网格层次', { back: '数据后方', front: '数据前方' }),
        ...lineFields('major.').map((f) => ({
          ...f,
          label: '主网格' + f.label,
        })),
        ...lineFields('minor.').map((f) => ({
          ...f,
          label: '次网格' + f.label,
        })),
      ],
    },
    {
      id: 'axis-title',
      label: '轴标题外观',
      root: 'title',
      defaults: {
        format: 'auto',
        text: '',
        fontFamily: axis.tickLabels.fontFamily,
        fontSizePt: 12,
        color: axis.tickLabels.color,
        bold: false,
        italic: false,
        position: 0.5,
        offsetPt: { x: 0, y: 0 },
      },
      fields: [
        ...fontFields(),
        ...textAppearance(),
        n('position', '沿轴位置 (0–1)'),
      ],
    },
  ];
}
