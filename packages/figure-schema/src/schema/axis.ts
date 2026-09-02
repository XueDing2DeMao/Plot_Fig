import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

const AxisScaleSchema = Type.Union([
  Type.Literal('linear'),
  Type.Literal('log10'),
  Type.Literal('ln'),
]);

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
      min: Type.Number(),
      max: Type.Number(),
    },
    { additionalProperties: false },
  ),
]);

const AxisLineSchema = Type.Object(
  {
    color: Type.String({ minLength: 1 }),
    widthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

const MajorTickSchema = Type.Object(
  {
    visible: Type.Boolean(),
    lengthPt: Type.Number({ minimum: 0 }),
    widthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

const MinorTickSchema = Type.Object(
  {
    visible: Type.Boolean(),
    count: Type.Integer({ minimum: 0 }),
    lengthPt: Type.Number({ minimum: 0 }),
    widthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

const TickLabelSchema = Type.Object(
  {
    visible: Type.Boolean(),
    fontFamily: Type.String({ minLength: 1 }),
    fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
    color: Type.String({ minLength: 1 }),
    notation: Type.Union([
      Type.Literal('auto'),
      Type.Literal('fixed'),
      Type.Literal('scientific'),
    ]),
    precision: Type.Integer({ minimum: 0, maximum: 15 }),
  },
  { additionalProperties: false },
);

const AxisTextSchema = Type.String({
  maxLength: 16_384,
  pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
});

const AxisTitleCommonProperties = {
  text: AxisTextSchema,
  fontFamily: Type.String({ minLength: 1 }),
  fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
  color: Type.String({ minLength: 1 }),
};

const AxisTitleSchema = Type.Union([
  Type.Object(
    {
      format: Type.Literal('plain'),
      ...AxisTitleCommonProperties,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      format: Type.Literal('latex'),
      ...AxisTitleCommonProperties,
    },
    { additionalProperties: false },
  ),
]);

const AxisCommonProperties = {
  axisId: IdentifierSchema,
  scale: AxisScaleSchema,
  range: AxisRangeSchema,
  reverse: Type.Boolean(),
  visible: Type.Boolean(),
  line: AxisLineSchema,
  majorTicks: MajorTickSchema,
  minorTicks: MinorTickSchema,
  tickLabels: TickLabelSchema,
  title: Type.Optional(AxisTitleSchema),
  extensions: Type.Optional(ExtensionBagSchema),
};

const HorizontalAxisSchema = Type.Object(
  {
    ...AxisCommonProperties,
    dimension: Type.Literal('x'),
    position: Type.Union([Type.Literal('bottom'), Type.Literal('top')]),
  },
  { additionalProperties: false },
);

const VerticalAxisSchema = Type.Object(
  {
    ...AxisCommonProperties,
    dimension: Type.Literal('y'),
    position: Type.Union([Type.Literal('left'), Type.Literal('right')]),
  },
  { additionalProperties: false },
);

export const AxisSchema = Type.Union([
  HorizontalAxisSchema,
  VerticalAxisSchema,
]);

export type Axis = Type.Static<typeof AxisSchema>;
