import {
  resolvePanelFrames,
  defaultTextStyle,
  defaultShapeStyle,
  defaultLegendLayout,
  type Axis,
  type FigureTemplate,
  type Panel,
  type Annotation,
  type Paint,
} from '@plot-fig/figure-schema';
import { copyDetailedStyle } from '../templates/detail-style.js';
import { assertTemplate } from './publication-utils.js';
import { assertIndependentLayout } from './panel-frame-links.js';
import { hasLayerAxisLinks } from './layer-batch.js';

export const layerFormatOptions = [
  {
    id: 'page-background',
    label: '页面背景',
    detail: '页面背景由所有图层共享',
  },
  {
    id: 'legend',
    label: '图例格式',
    detail: '复制已有图层图例的布局和文本格式，保留曲线名称',
  },
  { id: 'background', label: '图层背景', detail: '仅复制图层背景色与透明度' },
  { id: 'size', label: '图层尺寸', detail: '复制宽度和高度，保留目标位置' },
  {
    id: 'ticks',
    label: '刻度与范围',
    detail: '复制坐标轴比例、范围和刻度间隔',
  },
  { id: 'colors', label: '颜色', detail: '仅复制曲线、坐标轴和图层注释的颜色' },
  { id: 'fonts', label: '字体', detail: '仅复制字体、字号、粗体和斜体' },
  {
    id: 'styles',
    label: '所有样式格式',
    detail: '复制外观，保留图层尺寸和坐标轴范围',
  },
  { id: 'all', label: '所有', detail: '包含外观、尺寸、刻度与范围及页面背景' },
] as const;
export type LayerFormatScope = (typeof layerFormatOptions)[number]['id'];
export type LayerFormatSnapshot = {
  template: FigureTemplate;
  scope: LayerFormatScope;
  name: string;
};
const styleScopes: LayerFormatScope[] = [
  'legend',
  'background',
  'colors',
  'fonts',
  'styles',
];

export function canPasteLayerFormat(
  snapshot: LayerFormatSnapshot,
  scope: LayerFormatScope,
) {
  return (
    snapshot.scope === 'all' ||
    snapshot.scope === scope ||
    (snapshot.scope === 'styles' && styleScopes.includes(scope))
  );
}

export function copyLayerFormat(
  template: FigureTemplate,
  panelId: string,
  scope: LayerFormatScope,
): LayerFormatSnapshot {
  const index = template.panels.findIndex((panel) => panel.panelId === panelId);
  if (index < 0) throw new Error('找不到要复制格式的图层');
  const panel = resolvePanelFrames(template).panels[index]!;
  const snapshot = structuredClone({
    ...template,
    panels: [panel],
    annotations: template.annotations.filter(
      (a) => a.coordinateSpace !== 'page' && a.panelId === panelId,
    ),
  });
  return {
    scope,
    name: panel.name ?? `图层 ${index + 1}`,
    template: snapshot,
  };
}

type Fields = Record<string, unknown>;
const record = (value: object) => value as Fields;
function copyKeys(target: object, source: object, keys: readonly string[]) {
  for (const key of keys) {
    const value = record(source)[key];
    if (value === undefined) delete record(target)[key];
    else record(target)[key] = structuredClone(value);
  }
}
const colorKeys = [
  'color',
  'fill',
  'stroke',
  'borderColor',
  'background',
  'colors',
];
const fontKeys = ['fontFamily', 'fontSizePt', 'bold', 'italic'];
function mergeStyle(target: object, source: object, scope: LayerFormatScope) {
  if (scope === 'colors') {
    copyKeys(
      target,
      source,
      colorKeys.filter((key) => key in target || key in source),
    );
    // 仅换色时保留目标的填充类型、渐变角度和花纹几何。
    const paint = record(target).paint as Paint | undefined;
    const sample = record(source).paint as Paint | undefined;
    const fallback = String(
      record(source).fill ?? record(source).color ?? 'none',
    );
    const colors =
      sample?.kind === 'linear-gradient'
        ? [sample.startColor, sample.endColor]
        : sample?.kind === 'pattern'
          ? [sample.foreground, sample.background]
          : [
              sample?.kind === 'solid'
                ? sample.color
                : sample?.kind === 'none'
                  ? 'none'
                  : fallback,
            ];
    if (paint?.kind === 'solid') paint.color = colors[0]!;
    else if (paint?.kind === 'linear-gradient') {
      paint.startColor = colors[0]!;
      paint.endColor = colors[1] ?? colors[0]!;
    } else if (paint?.kind === 'pattern') {
      paint.foreground = colors[0]!;
      paint.background = colors[1] ?? colors[0]!;
    } else if (!paint && sample) {
      if ('fill' in target) record(target).fill = colors[0];
      else if ('color' in target) record(target).color = colors[0];
    }
  } else if (scope === 'fonts')
    copyKeys(
      target,
      source,
      fontKeys.filter((key) => key in target || key in source),
    );
}

function textStyleFor(
  annotation: Extract<Annotation, { kind: 'text' | 'legend' }>,
  template: FigureTemplate,
) {
  if (annotation.textStyle) return structuredClone(annotation.textStyle);
  const defaults = defaultTextStyle();
  if (annotation.kind === 'legend' || annotation.format === 'plain') {
    defaults.fontFamily = template.theme.font.family;
    defaults.fontSizePt = template.theme.font.sizePt;
    defaults.color = template.theme.font.color;
  }
  return defaults;
}

function copyAnnotationStyles(
  annotations: Annotation[],
  template: FigureTemplate,
  source: FigureTemplate,
  scope: LayerFormatScope,
) {
  const indices = new Map<string, number>();
  for (const annotation of annotations) {
    const samples = source.annotations.filter(
      (a) => a.kind === annotation.kind,
    );
    const index = indices.get(annotation.kind) ?? 0;
    indices.set(annotation.kind, index + 1);
    const sample = samples[index % samples.length];
    if (!sample) continue;
    const allStyles = scope === 'styles' || scope === 'all';
    if (
      (annotation.kind === 'text' || annotation.kind === 'legend') &&
      (sample.kind === 'text' || sample.kind === 'legend')
    ) {
      const current = textStyleFor(annotation, template);
      const match = textStyleFor(sample, source);
      if (allStyles) annotation.textStyle = match;
      else {
        mergeStyle(current, match, scope);
        annotation.textStyle = current;
      }
      if (
        annotation.kind === 'legend' &&
        sample.kind === 'legend' &&
        scope === 'colors'
      ) {
        annotation.layout ??= defaultLegendLayout();
        mergeStyle(
          annotation.layout,
          sample.layout ?? defaultLegendLayout(),
          scope,
        );
      }
    } else if (
      annotation.kind !== 'text' &&
      annotation.kind !== 'legend' &&
      sample.kind !== 'text' &&
      sample.kind !== 'legend'
    ) {
      const match = sample.shapeStyle ?? defaultShapeStyle();
      if (allStyles) annotation.shapeStyle = structuredClone(match);
      else if (scope === 'colors') {
        annotation.shapeStyle ??= defaultShapeStyle();
        mergeStyle(annotation.shapeStyle, match, scope);
        mergeStyle(annotation.shapeStyle.line, match.line, scope);
      }
    }
  }
}

function copyLegend(
  target: Panel,
  source: Panel,
  annotations: Annotation[],
  samples: Annotation[],
  sourceTemplate: FigureTemplate,
) {
  for (const [i, plot] of target.plotSlots.entries()) {
    const sample = source.plotSlots[i % source.plotSlots.length];
    if (sample) copyKeys(plot.legendEntry, sample.legendEntry, ['format']);
  }
  const legends = samples.filter((a) => a.kind === 'legend');
  let index = 0;
  for (const annotation of annotations) {
    if (annotation.kind !== 'legend') continue;
    const sample = legends[index++ % legends.length];
    if (sample?.kind !== 'legend') continue;
    const ids = annotation.layout?.plotSlotIds;
    copyKeys(annotation, sample, ['layout']);
    annotation.textStyle = textStyleFor(sample, sourceTemplate);
    if (annotation.layout) {
      delete annotation.layout.plotSlotIds;
      if (ids) annotation.layout.plotSlotIds = ids;
    } else if (ids) {
      // 缺省布局仍须保留目标图例包含的曲线。
      annotation.layout = { ...defaultLegendLayout(), plotSlotIds: ids };
    }
  }
}

function copyScale(target: Axis, source: Axis) {
  if ((target.scale === 'category') !== (source.scale === 'category'))
    throw new Error('分类轴与数值轴不能互相粘贴刻度与范围，请选择外观格式');
  copyKeys(target, source, [
    'scale',
    'scaleOptions',
    'symLog',
    'logTicks',
    'range',
    'rescale',
    'reverse',
  ]);
  copyKeys(target.majorTicks, source.majorTicks, ['generation']);
  target.minorTicks.count = source.minorTicks.count;
}

function copyAppearance(
  template: FigureTemplate,
  target: Panel,
  source: FigureTemplate,
  scope: LayerFormatScope,
) {
  const annotations = template.annotations.filter(
    (a) => a.coordinateSpace !== 'page' && a.panelId === target.panelId,
  );
  const styled = structuredClone({
    ...template,
    panels: [{ ...target, plotSlots: [] }],
    annotations: [],
  });
  copyDetailedStyle(styled, source);
  const sample = source.panels[0]!;
  const formatted = styled.panels[0]!;
  const allStyles = scope === 'styles' || scope === 'all';
  if (allStyles) {
    copyKeys(target, sample, ['appearance']);
    target.axes = formatted.axes;
  } else {
    for (const [i, axis] of target.axes.entries()) {
      const match = formatted.axes[i]!;
      mergeStyle(axis.line, match.line, scope);
      mergeStyle(axis.majorTicks, match.majorTicks, scope);
      mergeStyle(axis.minorTicks, match.minorTicks, scope);
      mergeStyle(axis.tickLabels, match.tickLabels, scope);
      if (axis.title && match.title) mergeStyle(axis.title, match.title, scope);
    }
  }
  copyAnnotationStyles(annotations, template, source, scope);
  // 网格、热图配色和曲线连接方式不改变目标的数据来源。
  for (const axis of target.axes) {
    const match = sample.axes.find(
      (a) => a.dimension === axis.dimension && a.position === axis.position,
    );
    if (!match) continue;
    if (allStyles) copyKeys(axis, match, ['grid']);
    else if (scope === 'colors')
      for (const kind of ['major', 'minor'] as const)
        if (axis.grid?.[kind] && match.grid?.[kind])
          mergeStyle(axis.grid[kind], match.grid[kind], scope);
  }
  const kindIndex = new Map<string, number>();
  for (const plot of target.plotSlots) {
    const candidates = sample.plotSlots.filter((p) => p.kind === plot.kind);
    const index = kindIndex.get(plot.kind) ?? 0;
    kindIndex.set(plot.kind, index + 1);
    const match = candidates[index % candidates.length];
    if (!match) continue;
    for (const key of [
      'lineStyle',
      'markerStyle',
      'fillStyle',
      'outlierStyle',
      'errorBarStyle',
    ]) {
      if (
        key === 'errorBarStyle' &&
        plot.kind === 'bar' &&
        plot.layout === 'stacked'
      )
        continue;
      if (allStyles) copyKeys(plot, match, [key]);
      else {
        const currentStyle = record(plot)[key],
          sampleStyle = record(match)[key];
        if (currentStyle && sampleStyle)
          mergeStyle(currentStyle as object, sampleStyle as object, scope);
      }
    }
    if (plot.kind === 'xy' && match.kind === 'xy' && allStyles)
      copyKeys(plot, match, [
        'mode',
        'lineConnection',
        'symbolGapPct',
        'closeLine',
        'lineArrows',
        'lineInFront',
      ]);
    if (
      (plot.kind === 'heatmap' || plot.kind === 'contour') &&
      (match.kind === 'heatmap' || match.kind === 'contour') &&
      (allStyles || scope === 'colors')
    )
      copyKeys(plot.colorScale, match.colorScale, ['colors']);
    if (
      'dataLabels' in plot &&
      plot.dataLabels &&
      'dataLabels' in match &&
      match.dataLabels
    )
      copyKeys(
        plot.dataLabels,
        match.dataLabels,
        allStyles
          ? [
              'font',
              'color',
              'rotationDeg',
              'position',
              'offset',
              'gapPt',
              'wrapChars',
              'lineSpacing',
              'leader',
              'box',
            ]
          : scope === 'fonts'
            ? ['font']
            : scope === 'colors'
              ? ['color']
              : [],
      );
  }
}

export function pasteLayerFormat(
  template: FigureTemplate,
  snapshot: LayerFormatSnapshot,
  panelId: string,
  scope: LayerFormatScope,
): FigureTemplate {
  if (!canPasteLayerFormat(snapshot, scope))
    throw new Error('未复制此范围，请重新选择复制格式');
  if (!template.panels.some((panel) => panel.panelId === panelId))
    throw new Error('找不到要粘贴格式的图层');
  const next = structuredClone(template);
  const target = next.panels.find((panel) => panel.panelId === panelId)!;
  const source = snapshot.template.panels[0]!;
  if (scope === 'all' || scope === 'page-background')
    copyKeys(next.page, snapshot.template.page, [
      'background',
      'backgroundPaint',
    ]);
  if (scope === 'all' || scope === 'size') {
    assertIndependentLayout(next, [panelId]);
    const frame = {
      ...target.frame,
      width: source.frame.width,
      height: source.frame.height,
    };
    if (frame.x + frame.width > 1 + 1e-9 || frame.y + frame.height > 1 + 1e-9)
      throw new Error('复制的尺寸会使目标图层超出页面，请先调整图层位置');
    target.frame = frame;
  }
  if (scope === 'all' || scope === 'ticks') {
    if (hasLayerAxisLinks(next, panelId))
      throw new Error('当前图层包含坐标轴联动，请先解除联动，或仅粘贴外观格式');
    for (const axis of target.axes) {
      const match = source.axes.find(
        (a) => a.dimension === axis.dimension && a.position === axis.position,
      );
      if (match) copyScale(axis, match);
    }
  }
  if (
    scope === 'styles' ||
    scope === 'all' ||
    scope === 'colors' ||
    scope === 'fonts'
  )
    copyAppearance(next, target, snapshot.template, scope);
  if (scope === 'background') {
    target.appearance ??= {};
    copyKeys(target.appearance, source.appearance ?? {}, ['background']);
  }
  if (scope === 'legend' || scope === 'styles' || scope === 'all')
    copyLegend(
      target,
      source,
      next.annotations.filter(
        (a) => a.coordinateSpace !== 'page' && a.panelId === panelId,
      ),
      snapshot.template.annotations,
      snapshot.template,
    );
  return assertTemplate(next);
}
