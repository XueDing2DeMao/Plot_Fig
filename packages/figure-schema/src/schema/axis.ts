import Type from 'typebox';
import { AxisAdvancedSchema, AxisScaleOptionsSchema } from './axis-advanced.js';
import {
  AxisGridSchema,
  AxisPlacementSchema,
  AxisTextAppearanceProperties,
  TickDirectionSchema,
  TickLabelAppearanceProperties,
} from './axis-appearance.js';
import {
  DeclarativeTextSchema,
  ExtensionBagSchema,
  IdentifierSchema,
} from './common.js';
import { TextContentFormatSchema } from './text-layout.js';

const AxisScaleSchema = Type.Union([
  Type.Literal('category'),
  Type.Literal('linear'),
  Type.Literal('log10'),
  Type.Literal('ln'),
  Type.Literal('log2'),
  Type.Literal('probability'),
  Type.Literal('probit'),
  Type.Literal('reciprocal'),
  Type.Literal('offset-reciprocal'),
  Type.Literal('logit'),
  Type.Literal('weibull'),
  Type.Literal('discrete'),
  Type.Literal('custom'),
]);

const AxisRangeSchema = Type.Union([
  Type.Object(
    { mode: Type.Literal('min-only'), min: Type.Number() },
    { additionalProperties: false },
  ),
  Type.Object(
    { mode: Type.Literal('max-only'), max: Type.Number() },
    { additionalProperties: false },
  ),
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

const AxisRescaleSchema = Type.Object(
  {
    mode: Type.Union([
      Type.Literal('normal'),
      Type.Literal('auto'),
      Type.Literal('fixed'),
      Type.Literal('fixed-min-normal'),
      Type.Literal('fixed-min-auto'),
      Type.Literal('fixed-max-normal'),
      Type.Literal('fixed-max-auto'),
    ]),
    margin: Type.Optional(
      Type.Object(
        {
          minPercent: Type.Number({ minimum: 0, maximum: 100 }),
          maxPercent: Type.Number({ minimum: 0, maximum: 100 }),
        },
        { additionalProperties: false },
      ),
    ),
    nice: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

const AxisLineSchema = Type.Object(
  {
    visible: Type.Optional(Type.Boolean()),
    color: Type.String({ minLength: 1 }),
    widthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

const MajorTickGenerationSchema = Type.Union([
  Type.Object({ mode: Type.Literal('auto') }, { additionalProperties: false }),
  Type.Object(
    {
      mode: Type.Literal('increment'),
      step: Type.Number({ exclusiveMinimum: 0 }),
      anchor: Type.Optional(Type.Number()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      mode: Type.Literal('count'),
      count: Type.Integer({ minimum: 2, maximum: 1000 }),
      anchor: Type.Optional(Type.Number()),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    { mode: Type.Literal('endpoints') },
    { additionalProperties: false },
  ),
]);

export type MajorTickGeneration = Type.Static<typeof MajorTickGenerationSchema>;

const MajorTickSchema = Type.Object(
  {
    visible: Type.Boolean(),
    lengthPt: Type.Number({ minimum: 0 }),
    widthPt: Type.Number({ minimum: 0 }),
    generation: Type.Optional(MajorTickGenerationSchema),
    direction: Type.Optional(TickDirectionSchema),
    color: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const MinorTickSchema = Type.Object(
  {
    direction: Type.Optional(TickDirectionSchema),
    color: Type.Optional(Type.String({ minLength: 1 })),
    lengthMode: Type.Optional(
      Type.Union([Type.Literal('manual'), Type.Literal('auto')]),
    ),
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
      Type.Literal('engineering'),
    ]),
    precision: Type.Integer({ minimum: 0, maximum: 15 }),
    ...TickLabelAppearanceProperties,
  },
  { additionalProperties: false },
);

const AxisTitleCommonProperties = {
  ...AxisTextAppearanceProperties,
  position: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  text: DeclarativeTextSchema,
  fontFamily: Type.String({ minLength: 1 }),
  fontSizePt: Type.Number({ exclusiveMinimum: 0 }),
  color: Type.String({ minLength: 1 }),
};

const AxisTitleSchema = Type.Union([
  Type.Object(
    { format: TextContentFormatSchema, ...AxisTitleCommonProperties },
    { additionalProperties: false },
  ),
]);

const AxisCommonProperties = {
  axisId: IdentifierSchema,
  scaleOptions: Type.Optional(AxisScaleOptionsSchema),
  advanced: Type.Optional(AxisAdvancedSchema),
  scale: AxisScaleSchema,
  symLog: Type.Optional(
    Type.Object(
      {
        threshold: Type.Number({ exclusiveMinimum: 0 }),
        linearLength: Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
      },
      { additionalProperties: false },
    ),
  ),
  logTicks: Type.Optional(
    Type.Object(
      {
        mode: Type.Union([
          Type.Literal('logarithmic'),
          Type.Literal('origin-log10'),
        ]),
      },
      { additionalProperties: false },
    ),
  ),
  range: AxisRangeSchema,
  rescale: Type.Optional(AxisRescaleSchema),
  reverse: Type.Boolean(),
  visible: Type.Boolean(),
  line: AxisLineSchema,
  majorTicks: MajorTickSchema,
  minorTicks: MinorTickSchema,
  tickLabels: TickLabelSchema,
  title: Type.Optional(AxisTitleSchema),
  grid: Type.Optional(AxisGridSchema),
  placement: Type.Optional(AxisPlacementSchema),
  compatibility: Type.Optional(
    Type.Object(
      { unboundRange: Type.Literal('panel-v1.7') },
      { additionalProperties: false },
    ),
  ),
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
