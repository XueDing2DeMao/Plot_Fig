import Type, { type TProperties } from 'typebox';

const IdentifierSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
});

const UnknownPropertyBagSchema = Type.Record(Type.String(), Type.Unknown());

const PointSchema = Type.Object(
  {
    x: Type.Number(),
    y: Type.Number(),
  },
  { additionalProperties: false },
);

const SlotRequirementSchema = Type.Object(
  {
    slotId: IdentifierSchema,
    name: Type.String({ minLength: 1, maxLength: 256 }),
    valueType: Type.Union([
      Type.Literal('number'),
      Type.Literal('category'),
      Type.Literal('string'),
    ]),
  },
  { additionalProperties: false },
);

const PlotBindingsSchema = Type.Object(
  {
    x: SlotRequirementSchema,
    y: SlotRequirementSchema,
    xError: Type.Optional(SlotRequirementSchema),
    xErrorLower: Type.Optional(SlotRequirementSchema),
    xErrorUpper: Type.Optional(SlotRequirementSchema),
    yError: Type.Optional(SlotRequirementSchema),
    yErrorLower: Type.Optional(SlotRequirementSchema),
    yErrorUpper: Type.Optional(SlotRequirementSchema),
    group: Type.Optional(SlotRequirementSchema),
    label: Type.Optional(SlotRequirementSchema),
    color: Type.Optional(SlotRequirementSchema),
    size: Type.Optional(SlotRequirementSchema),
  },
  { additionalProperties: false },
);

const AxisRangeSchema = Type.Union([
  Type.Object(
    {
      mode: Type.Literal('auto'),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      mode: Type.Literal('fixed'),
      from: Type.Number(),
      to: Type.Number(),
    },
    { additionalProperties: false },
  ),
]);

const AxisSchema = Type.Object(
  {
    scale: Type.Union([
      Type.Literal('linear'),
      Type.Literal('log10'),
      Type.Literal('ln'),
    ]),
    range: AxisRangeSchema,
    reverse: Type.Boolean(),
    visible: Type.Boolean(),
    title: Type.Optional(
      Type.Object(
        {
          text: Type.String({ maxLength: 16_384 }),
          format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
        },
        { additionalProperties: false },
      ),
    ),
    lineColor: Type.String({ minLength: 1 }),
    lineWidthPt: Type.Number({ minimum: 0 }),
    majorTickLengthPt: Type.Number({ minimum: 0 }),
    minorTickCount: Type.Integer({ minimum: 0 }),
    tickLabelFont: Type.String({ minLength: 1 }),
    tickLabelSizePt: Type.Number({ exclusiveMinimum: 0 }),
    unknownProperties: Type.Optional(UnknownPropertyBagSchema),
  },
  { additionalProperties: false },
);

const PlotSchema = Type.Object(
  {
    plotId: IdentifierSchema,
    mode: Type.Union([
      Type.Literal('scatter'),
      Type.Literal('line'),
      Type.Literal('line-symbol'),
    ]),
    bindings: PlotBindingsSchema,
    line: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color: Type.String({ minLength: 1 }),
          widthPt: Type.Number({ minimum: 0 }),
          dash: Type.Union([
            Type.Literal('solid'),
            Type.Literal('dashed'),
            Type.Literal('dotted'),
            Type.Literal('dash-dot'),
          ]),
        },
        { additionalProperties: false },
      ),
    ),
    symbol: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          shape: Type.Union([
            Type.Literal('circle'),
            Type.Literal('square'),
            Type.Literal('triangle'),
            Type.Literal('diamond'),
            Type.Literal('plus'),
            Type.Literal('cross'),
          ]),
          sizePt: Type.Number({ minimum: 0 }),
          fill: Type.String({ minLength: 1 }),
          stroke: Type.String({ minLength: 1 }),
          strokeWidthPt: Type.Number({ minimum: 0 }),
        },
        { additionalProperties: false },
      ),
    ),
    errorBar: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color: Type.String({ minLength: 1 }),
          widthPt: Type.Number({ minimum: 0 }),
          capWidthPt: Type.Number({ minimum: 0 }),
        },
        { additionalProperties: false },
      ),
    ),
    legendText: Type.String({ maxLength: 1024 }),
    unknownProperties: Type.Optional(UnknownPropertyBagSchema),
  },
  { additionalProperties: false },
);

const AnnotationBaseFields = {
  annotationId: IdentifierSchema,
  coordinateSpace: Type.Union([
    Type.Literal('page'),
    Type.Literal('layer'),
    Type.Literal('data'),
  ]),
  unknownProperties: Type.Optional(UnknownPropertyBagSchema),
} satisfies TProperties;

function createAnnotationSchema<TVariantFields extends TProperties>(
  variantFields: TVariantFields,
) {
  return Type.Object(
    {
      ...AnnotationBaseFields,
      ...variantFields,
    },
    { additionalProperties: false },
  );
}

const AnnotationSchema = Type.Union([
  createAnnotationSchema({
    kind: Type.Literal('legend'),
    position: PointSchema,
    visible: Type.Boolean(),
  }),
  createAnnotationSchema({
    kind: Type.Literal('text'),
    position: PointSchema,
    text: Type.String({ maxLength: 16_384 }),
    format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
  }),
  createAnnotationSchema({
    kind: Type.Literal('arrow'),
    start: PointSchema,
    end: PointSchema,
  }),
  createAnnotationSchema({
    kind: Type.Literal('rectangle'),
    start: PointSchema,
    end: PointSchema,
  }),
  createAnnotationSchema({
    kind: Type.Literal('reference-line'),
    orientation: Type.Union([Type.Literal('x'), Type.Literal('y')]),
    value: Type.Number(),
  }),
]);

const LayerSchema = Type.Object(
  {
    layerId: IdentifierSchema,
    frame: Type.Object(
      {
        leftPct: Type.Number(),
        bottomPct: Type.Number(),
        widthPct: Type.Number(),
        heightPct: Type.Number(),
      },
      { additionalProperties: false },
    ),
    xAxis: AxisSchema,
    yAxis: AxisSchema,
    plots: Type.Array(PlotSchema),
    annotations: Type.Array(AnnotationSchema),
    unknownProperties: Type.Optional(UnknownPropertyBagSchema),
  },
  { additionalProperties: false },
);

const AutomationEntrySchema = Type.Object(
  {
    kind: Type.Union([
      Type.Literal('labtalk'),
      Type.Literal('origin-c'),
      Type.Literal('python'),
      Type.Literal('macro'),
    ]),
    text: Type.String(),
  },
  { additionalProperties: false },
);

export const OriginTemplateSnapshotV1Schema = Type.Object(
  {
    kind: Type.Literal('origin-template-snapshot'),
    snapshotVersion: Type.Literal('1.0.0'),
    originVersion: Type.String({ minLength: 1 }),
    sourceHash: Type.String({ minLength: 1 }),
    templateId: IdentifierSchema,
    name: Type.String({ minLength: 1 }),
    page: Type.Object(
      {
        width: Type.Number({ exclusiveMinimum: 0 }),
        height: Type.Number({ exclusiveMinimum: 0 }),
        unit: Type.Union([
          Type.Literal('mm'),
          Type.Literal('cm'),
          Type.Literal('inch'),
        ]),
        background: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    layers: Type.Array(LayerSchema, { minItems: 1 }),
    theme: Type.Object(
      {
        fontFamily: Type.String({ minLength: 1 }),
        fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
        foreground: Type.String({ minLength: 1 }),
        background: Type.String({ minLength: 1 }),
        palette: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
      },
      { additionalProperties: false },
    ),
    unknownProperties: Type.Optional(UnknownPropertyBagSchema),
    automation: Type.Optional(Type.Array(AutomationEntrySchema)),
  },
  { additionalProperties: false },
);

export type OriginTemplateSnapshotV1 = Type.Static<
  typeof OriginTemplateSnapshotV1Schema
>;
