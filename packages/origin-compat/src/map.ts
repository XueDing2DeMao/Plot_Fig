import {
  CURRENT_SCHEMA_VERSION,
  type FigureTemplate,
  type XyPlot,
} from '@plot-fig/figure-schema';
import type { NormalizedOriginSnapshot } from './normalize.js';
import type { CompatibilityItem, ImportDiagnostic } from './types.js';
import {
  preserveUnknown,
  validateSlotRequirements,
} from './map-diagnostics.js';

export type MappingCandidate = {
  value: FigureTemplate;
  diagnostics: ImportDiagnostic[];
  items: CompatibilityItem[];
};
const extension = (value: Record<string, unknown> | undefined) =>
  value && Object.keys(value).length ? { origin: value } : undefined;

function mapAxis(
  axis: NormalizedOriginSnapshot['layers'][number]['xAxis'],
  axisId: string,
  dimension: 'x' | 'y',
) {
  const extensions = extension(axis.unknownProperties);
  return {
    axisId,
    dimension,
    position: dimension === 'x' ? ('bottom' as const) : ('left' as const),
    scale: axis.scale,
    range:
      axis.range.mode === 'auto'
        ? { mode: 'auto' as const }
        : { mode: 'fixed' as const, min: axis.range.from, max: axis.range.to },
    reverse: axis.reverse,
    visible: axis.visible,
    line: { color: axis.lineColor, widthPt: axis.lineWidthPt },
    majorTicks: {
      visible: true,
      lengthPt: axis.majorTickLengthPt,
      widthPt: axis.lineWidthPt,
    },
    minorTicks: {
      visible: axis.minorTickCount > 0,
      count: axis.minorTickCount,
      lengthPt: axis.majorTickLengthPt / 2,
      widthPt: axis.lineWidthPt,
    },
    tickLabels: {
      visible: true,
      fontFamily: axis.tickLabelFont,
      fontSizePt: axis.tickLabelSizePt,
      color: axis.lineColor,
      notation: 'auto' as const,
      precision: 6,
    },
    ...(axis.title
      ? {
          title: {
            ...axis.title,
            fontFamily: axis.tickLabelFont,
            fontSizePt: axis.tickLabelSizePt,
            color: axis.lineColor,
          },
        }
      : {}),
    ...(extensions ? { extensions } : {}),
  };
}

function collectDataSlots(
  input: NormalizedOriginSnapshot,
): FigureTemplate['dataSlots'] {
  const slots = new Map<string, FigureTemplate['dataSlots'][number]>();
  for (const layer of input.layers)
    for (const plot of layer.plots)
      for (const [role, requirement] of Object.entries(plot.bindings)) {
        if (!slots.has(requirement.slotId))
          slots.set(requirement.slotId, {
            dataSlotId: requirement.slotId,
            name: requirement.name,
            role: role as FigureTemplate['dataSlots'][number]['role'],
            valueType: requirement.valueType,
            required: role === 'x' || role === 'y',
          });
      }
  return [...slots.values()];
}

type OriginAnnotation =
  NormalizedOriginSnapshot['layers'][number]['annotations'][number];
function mapAnnotation(
  annotation: OriginAnnotation,
  panelId: string,
): FigureTemplate['annotations'][number] {
  const coordinateSpace =
    annotation.coordinateSpace === 'layer'
      ? ('panel' as const)
      : annotation.coordinateSpace;
  const extensions = extension(annotation.unknownProperties);
  const common = {
    annotationId: annotation.annotationId,
    coordinateSpace,
    ...(coordinateSpace === 'page' ? {} : { panelId }),
    ...(coordinateSpace === 'data'
      ? { xAxisId: `${panelId}-x`, yAxisId: `${panelId}-y` }
      : {}),
    ...(extensions ? { extensions } : {}),
  };
  switch (annotation.kind) {
    case 'legend':
      return {
        ...common,
        kind: 'legend',
        position: annotation.position,
        visible: annotation.visible,
      } as FigureTemplate['annotations'][number];
    case 'text':
      return {
        ...common,
        kind: 'text',
        position: annotation.position,
        text: annotation.text,
        format: annotation.format,
      } as FigureTemplate['annotations'][number];
    case 'arrow':
      return {
        ...common,
        kind: 'arrow',
        start: annotation.start,
        end: annotation.end,
      } as FigureTemplate['annotations'][number];
    case 'rectangle':
      return {
        ...common,
        kind: 'rectangle',
        start: annotation.start,
        end: annotation.end,
      } as FigureTemplate['annotations'][number];
    default:
      return {
        ...common,
        kind: 'reference-line',
        orientation: annotation.orientation,
        value: annotation.value,
      } as FigureTemplate['annotations'][number];
  }
}

export function mapOriginSnapshot(
  input: NormalizedOriginSnapshot,
  importerVersion: string,
): MappingCandidate {
  const preserved = preserveUnknown(input);
  const panels = input.layers.map((layer) => {
    const xAxisId = `${layer.layerId}-x`;
    const yAxisId = `${layer.layerId}-y`;
    const axes = [
      mapAxis(layer.xAxis, xAxisId, 'x'),
      mapAxis(layer.yAxis, yAxisId, 'y'),
    ] as FigureTemplate['panels'][number]['axes'];
    const layerExtensions = extension(layer.unknownProperties);
    return {
      panelId: layer.layerId,
      frame: layer.frame,
      coordinateSystem: 'cartesian-2d' as const,
      clip: true,
      axes,
      plotSlots: layer.plots.map((plot) => {
        const extensions = extension(plot.unknownProperties);
        return {
          plotSlotId: plot.plotId,
          kind: 'xy' as const,
          mode:
            plot.mode === 'scatter'
              ? ('markers' as const)
              : plot.mode === 'line'
                ? ('line' as const)
                : ('line-markers' as const),
          xAxisId,
          yAxisId,
          bindings: Object.fromEntries(
            Object.entries(plot.bindings).map(([role, req]) => [
              role,
              req.slotId,
            ]),
          ) as XyPlot['bindings'],
          ...(plot.line ? { lineStyle: plot.line } : {}),
          ...(plot.symbol ? { markerStyle: plot.symbol } : {}),
          ...(plot.errorBar ? { errorBarStyle: plot.errorBar } : {}),
          legendEntry: {
            visible: plot.legendText.length > 0,
            text: plot.legendText,
          },
          ...(extensions ? { extensions } : {}),
        };
      }),
      ...(layerExtensions ? { extensions: layerExtensions } : {}),
    };
  });
  const rootExtensions = extension(input.unknownProperties);
  const value: FigureTemplate = {
    kind: 'figure-template',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    templateId: input.templateId,
    metadata: { name: input.name, tags: ['origin-import'] },
    page: {
      size: { width: input.page.width, height: input.page.height },
      background: input.page.background,
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    panels,
    dataSlots: collectDataSlots(input),
    annotations: input.layers.flatMap((layer) =>
      layer.annotations.map((annotation) =>
        mapAnnotation(annotation, layer.layerId),
      ),
    ),
    theme: {
      font: {
        family: input.theme.fontFamily,
        sizePt: input.theme.fontSizePt,
        color: input.theme.foreground,
      },
      line: { color: input.theme.foreground, widthPt: 1 },
      marker: {
        shape: 'circle',
        sizePt: 4,
        fill: input.theme.background,
        stroke: input.theme.foreground,
      },
      palette: input.theme.palette,
      background: input.theme.background,
    },
    provenance: {
      sourceKind: 'origin-snapshot',
      sourceHash: input.sourceHash,
      importerVersion,
    },
    ...(rootExtensions ? { extensions: rootExtensions } : {}),
  };
  const items: CompatibilityItem[] = [
    {
      sourcePath: '/page',
      targetPath: '/page',
      disposition: 'mapped',
      message: 'page mapped',
    },
    ...input.layers.map((_layer, index) => ({
      sourcePath: `/layers/${index}`,
      targetPath: `/panels/${index}`,
      disposition: 'mapped' as const,
      message: `layer ${index} mapped`,
    })),
  ];
  return {
    value,
    diagnostics: [...preserved.diagnostics, ...validateSlotRequirements(input)],
    items: [...items, ...preserved.items],
  };
}
