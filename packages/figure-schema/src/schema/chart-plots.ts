import { PaintSchema } from './paint.js';
import Type from 'typebox';
import { ErrorDetailsSchema } from './error-details.js';
import { DataLabelsSchema, LabelOverridesSchema } from './data-labels.js';
import { CurveTransformSchema } from './curve-transforms.js';
import {
  IdentifierSchema,
  ExtensionBagSchema,
  ShortDeclarativeTextSchema,
} from './common.js';
import {
  LegendEntrySchema,
  LineStyleSchema,
  MarkerStyleSchema,
  ErrorBarStyleSchema,
} from './plot-styles.js';
const common = {
  plotSlotId: IdentifierSchema,
  visible: Type.Optional(Type.Boolean()),
  xAxisId: IdentifierSchema,
  yAxisId: IdentifierSchema,
  legendEntry: LegendEntrySchema,
  extensions: Type.Optional(ExtensionBagSchema),
};
const closed = { additionalProperties: false };
const orientation = Type.Union([
  Type.Literal('vertical'),
  Type.Literal('horizontal'),
]);
export const FillStyleSchema = Type.Object(
  {
    paint: Type.Optional(PaintSchema),
    color: Type.String({ minLength: 1 }),
    opacity: Type.Number({ minimum: 0, maximum: 1 }),
    borderColor: Type.String({ minLength: 1 }),
    borderWidthPt: Type.Number({ minimum: 0 }),
  },
  closed,
);
const xyBindings = { x: IdentifierSchema, y: IdentifierSchema };
export const ColorScaleSchema = Type.Object(
  {
    colors: Type.Array(Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }), {
      minItems: 2,
      maxItems: 32,
    }),
    reverse: Type.Boolean(),
    transform: Type.Optional(
      Type.Union([Type.Literal('linear'), Type.Literal('log10')]),
    ),
    interpolation: Type.Optional(
      Type.Union([Type.Literal('continuous'), Type.Literal('discrete')]),
    ),
    range: Type.Union([
      Type.Object({ mode: Type.Literal('auto') }, closed),
      Type.Object(
        { mode: Type.Literal('fixed'), min: Type.Number(), max: Type.Number() },
        closed,
      ),
    ]),
    colorbar: Type.Object(
      {
        visible: Type.Boolean(),
        title: ShortDeclarativeTextSchema,
        orientation: Type.Optional(
          Type.Union([Type.Literal('vertical'), Type.Literal('horizontal')]),
        ),
        side: Type.Optional(
          Type.Union([
            Type.Literal('left'),
            Type.Literal('right'),
            Type.Literal('top'),
            Type.Literal('bottom'),
          ]),
        ),
        length: Type.Optional(Type.Number({ minimum: 0.1, maximum: 1 })),
        widthPt: Type.Optional(Type.Number({ minimum: 2, maximum: 72 })),
        majorTicks: Type.Optional(Type.Integer({ minimum: 2, maximum: 20 })),
        minorTicks: Type.Optional(Type.Integer({ minimum: 0, maximum: 10 })),
        notation: Type.Optional(
          Type.Union([
            Type.Literal('auto'),
            Type.Literal('fixed'),
            Type.Literal('scientific'),
          ]),
        ),
        precision: Type.Optional(Type.Integer({ minimum: 0, maximum: 15 })),
        endpoints: Type.Optional(
          Type.Union([
            Type.Literal('flat'),
            Type.Literal('triangles'),
            Type.Literal('both'),
          ]),
        ),
        mode: Type.Optional(
          Type.Union([Type.Literal('linked'), Type.Literal('independent')]),
        ),
        range: Type.Optional(
          Type.Object({ min: Type.Number(), max: Type.Number() }, closed),
        ),
      },
      closed,
    ),
  },
  closed,
);
const distributionKinds = Type.Union([
  Type.Literal('normal'),
  Type.Literal('lognormal'),
  Type.Literal('weibull'),
  Type.Literal('exponential'),
  Type.Literal('gamma'),
  Type.Literal('laplace'),
  Type.Literal('lorentz'),
  Type.Literal('kde'),
  Type.Literal('poisson'),
  Type.Literal('binomial'),
]);
export const DistributionSchema = Type.Object(
  {
    visible: Type.Boolean(),
    kind: distributionKinds,
    samples: Type.Integer({ minimum: 32, maximum: 2000 }),
    parameters: Type.Record(
      Type.String({ minLength: 1, maxLength: 32 }),
      Type.Number(),
    ),
    bandwidth: Type.Optional(
      Type.Object(
        {
          method: Type.Union([
            Type.Literal('scott'),
            Type.Literal('silverman'),
            Type.Literal('custom'),
          ]),
          value: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
        },
        closed,
      ),
    ),
    extendPercent: Type.Number({ minimum: 0, maximum: 500 }),
    normalize: Type.Union([
      Type.Literal('density'),
      Type.Literal('probability'),
      Type.Literal('count'),
    ]),
    symmetric: Type.Boolean(),
    side: Type.Optional(
      Type.Union([
        Type.Literal('positive'),
        Type.Literal('negative'),
        Type.Literal('symmetric'),
        Type.Literal('split'),
      ]),
    ),
    fill: Type.Optional(FillStyleSchema),
  },
  closed,
);
export const BarOptionsSchema = Type.Object(
  {
    baseline: Type.Number(),
    percentage: Type.Boolean(),
    missing: Type.Union([Type.Literal('gap'), Type.Literal('zero')]),
    positive: Type.Optional(FillStyleSchema),
    negative: Type.Optional(FillStyleSchema),
  },
  closed,
);
export const BarPlotSchema = Type.Object(
  {
    ...common,
    kind: Type.Literal('bar'),
    orientation,
    layout: Type.Union([Type.Literal('grouped'), Type.Literal('stacked')]),
    stackGroup: Type.Optional(IdentifierSchema),
    width: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
    gap: Type.Number({ minimum: 0, exclusiveMaximum: 1 }),
    overlap: Type.Optional(Type.Number({ minimum: -1, maximum: 1 })),
    options: Type.Optional(BarOptionsSchema),
    bindings: Type.Object(
      {
        category: IdentifierSchema,
        value: IdentifierSchema,
        label: Type.Optional(IdentifierSchema),
        valueError: Type.Optional(IdentifierSchema),
        valueErrorLower: Type.Optional(IdentifierSchema),
        valueErrorUpper: Type.Optional(IdentifierSchema),
      },
      closed,
    ),
    fillStyle: FillStyleSchema,
    errorBarStyle: Type.Optional(ErrorBarStyleSchema),
    errorDetails: Type.Optional(ErrorDetailsSchema),
    dataLabels: Type.Optional(DataLabelsSchema),
    labelOverrides: Type.Optional(LabelOverridesSchema),
  },
  closed,
);
export const HistogramBinsSchema = Type.Union([
  Type.Object(
    {
      mode: Type.Literal('auto'),
      scale: Type.Optional(
        Type.Union([
          Type.Literal('linear'),
          Type.Literal('log10'),
          Type.Literal('log2'),
          Type.Literal('ln'),
        ]),
      ),
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('count'),
      count: Type.Integer({ minimum: 1, maximum: 1000 }),
      scale: Type.Optional(
        Type.Union([
          Type.Literal('linear'),
          Type.Literal('log10'),
          Type.Literal('log2'),
          Type.Literal('ln'),
        ]),
      ),
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('edges'),
      edges: Type.Array(Type.Number(), { minItems: 2, maxItems: 1001 }),
      scale: Type.Optional(
        Type.Union([
          Type.Literal('linear'),
          Type.Literal('log10'),
          Type.Literal('log2'),
          Type.Literal('ln'),
        ]),
      ),
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('width'),
      width: Type.Number({ exclusiveMinimum: 0 }),
      start: Type.Optional(Type.Number()),
      end: Type.Optional(Type.Number()),
      scale: Type.Optional(
        Type.Union([
          Type.Literal('linear'),
          Type.Literal('log10'),
          Type.Literal('log2'),
          Type.Literal('ln'),
        ]),
      ),
    },
    closed,
  ),
]);
export const HistogramPlotSchema = Type.Object(
  {
    ...common,
    kind: Type.Literal('histogram'),
    bindings: Type.Object({ values: IdentifierSchema }, closed),
    bins: HistogramBinsSchema,
    normalization: Type.Union([
      Type.Literal('count'),
      Type.Literal('probability'),
      Type.Literal('density'),
    ]),
    distribution: Type.Optional(DistributionSchema),
    showStatistics: Type.Optional(Type.Boolean()),
    boundary: Type.Optional(
      Type.Union([Type.Literal('left'), Type.Literal('right')]),
    ),
    gap: Type.Optional(Type.Number({ minimum: 0, maximum: 0.95 })),
    fillStyle: FillStyleSchema,
  },
  closed,
);
export const BoxPlotSchema = Type.Object(
  {
    ...common,
    kind: Type.Literal('box'),
    orientation,
    bindings: Type.Object(
      {
        values: IdentifierSchema,
        group: Type.Optional(IdentifierSchema),
        split: Type.Optional(IdentifierSchema),
      },
      closed,
    ),
    width: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
    quantileMethod: Type.Union([
      Type.Literal('type7'),
      Type.Literal('type1'),
      Type.Literal('type2'),
    ]),
    whiskerFactor: Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
    boxRange: Type.Optional(
      Type.Union([
        Type.Literal('iqr'),
        Type.Literal('min-max'),
        Type.Literal('percentile'),
        Type.Literal('sd'),
        Type.Literal('se'),
      ]),
    ),
    whiskerRange: Type.Optional(
      Type.Union([
        Type.Literal('outlier'),
        Type.Literal('min-max'),
        Type.Literal('percentile'),
        Type.Literal('sd'),
        Type.Literal('se'),
      ]),
    ),
    percentile: Type.Optional(
      Type.Array(Type.Number({ minimum: 0, maximum: 100 }), {
        minItems: 1,
        maxItems: 16,
      }),
    ),
    percentileLow: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    percentileHigh: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    showNotch: Type.Optional(Type.Boolean()),
    showMean: Type.Optional(Type.Boolean()),
    showMedian: Type.Optional(Type.Boolean()),
    showExtremes: Type.Optional(Type.Boolean()),
    rawPoints: Type.Optional(
      Type.Union([
        Type.Literal('none'),
        Type.Literal('jitter'),
        Type.Literal('spread'),
      ]),
    ),
    distribution: Type.Optional(DistributionSchema),
    confidence: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          target: Type.Union([Type.Literal('median'), Type.Literal('mean')]),
          method: Type.Union([Type.Literal('notch'), Type.Literal('normal')]),
          level: Type.Number({ exclusiveMinimum: 0, exclusiveMaximum: 1 }),
        },
        closed,
      ),
    ),
    partStyles: Type.Optional(
      Type.Object(
        {
          whisker: Type.Optional(LineStyleSchema),
          cap: Type.Optional(LineStyleSchema),
          median: Type.Optional(LineStyleSchema),
          notch: Type.Optional(LineStyleSchema),
          percentile: Type.Optional(LineStyleSchema),
          connection: Type.Optional(LineStyleSchema),
          mean: Type.Optional(MarkerStyleSchema),
          outlier: Type.Optional(MarkerStyleSchema),
          extreme: Type.Optional(MarkerStyleSchema),
          rawPoint: Type.Optional(MarkerStyleSchema),
        },
        closed,
      ),
    ),
    connections: Type.Optional(
      Type.Object(
        {
          mean: Type.Boolean(),
          median: Type.Boolean(),
          percentiles: Type.Boolean(),
        },
        closed,
      ),
    ),
    showOutliers: Type.Boolean(),
    fillStyle: FillStyleSchema,
    lineStyle: LineStyleSchema,
  },
  closed,
);
export const AreaPlotSchema = Type.Object(
  {
    ...common,
    kind: Type.Literal('area'),
    transform: Type.Optional(CurveTransformSchema),
    bindings: Type.Object(
      { ...xyBindings, label: Type.Optional(IdentifierSchema) },
      closed,
    ),
    baseline: Type.Number(),
    fillStyle: FillStyleSchema,
    lineStyle: LineStyleSchema,
    dataLabels: Type.Optional(DataLabelsSchema),
    labelOverrides: Type.Optional(LabelOverridesSchema),
  },
  closed,
);
const gridBindings = Type.Object(
  { ...xyBindings, z: IdentifierSchema },
  closed,
);
export const HeatmapPlotSchema = Type.Object(
  {
    ...common,
    kind: Type.Literal('heatmap'),
    bindings: gridBindings,
    colorScale: ColorScaleSchema,
    heatmap: Type.Optional(
      Type.Object(
        {
          missingColor: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
          cellBorder: Type.Optional(LineStyleSchema),
          labels: Type.Boolean(),
          interpolation: Type.Union([
            Type.Literal('nearest'),
            Type.Literal('bilinear'),
          ]),
          dataRegion: Type.Union([Type.Literal('matrix'), Type.Literal('xyz')]),
        },
        closed,
      ),
    ),
  },
  closed,
);
export const ContourLevelsSchema = Type.Union([
  Type.Object(
    {
      mode: Type.Literal('auto'),
      count: Type.Integer({ minimum: 1, maximum: 50 }),
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('interval'),
      start: Type.Number(),
      end: Type.Number(),
      step: Type.Number({ exclusiveMinimum: 0 }),
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('values'),
      values: Type.Array(Type.Number(), { minItems: 1, maxItems: 50 }),
    },
    closed,
  ),
]);
export const ContourPlotSchema = Type.Object(
  {
    ...common,
    kind: Type.Literal('contour'),
    bindings: gridBindings,
    colorScale: ColorScaleSchema,
    mode: Type.Union([Type.Literal('lines'), Type.Literal('filled')]),
    levels: ContourLevelsSchema,
    levelStyles: Type.Optional(
      Type.Array(
        Type.Object(
          {
            level: Type.Number(),
            lineStyle: LineStyleSchema,
          },
          closed,
        ),
        { maxItems: 50 },
      ),
    ),
    lineStyle: LineStyleSchema,
    contour: Type.Optional(
      Type.Object(
        {
          smoothing: Type.Boolean(),
          labels: Type.Boolean(),
          outOfRange: Type.Union([
            Type.Literal('clamp'),
            Type.Literal('transparent'),
          ]),
          dataRegion: Type.Union([Type.Literal('matrix'), Type.Literal('xyz')]),
        },
        closed,
      ),
    ),
  },
  closed,
);
export type FillStyle = Type.Static<typeof FillStyleSchema>;
export type ColorScale = Type.Static<typeof ColorScaleSchema>;
export type HistogramBins = Type.Static<typeof HistogramBinsSchema>;
export type ContourLevels = Type.Static<typeof ContourLevelsSchema>;
export type Distribution = Type.Static<typeof DistributionSchema>;
