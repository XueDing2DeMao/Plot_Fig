import Type from 'typebox';
import { IdentifierSchema, ShortDeclarativeTextSchema } from './common.js';
import { BasicLineStyleSchema as LineStyleSchema } from './plot-styles.js';
import { TextContentFormatSchema, TextLayoutSchema } from './text-layout.js';

const closed = { additionalProperties: false };
const offset = Type.Number({ minimum: -14400, maximum: 14400 });
const screenOffset = Type.Object({ x: offset, y: offset }, closed);

export const TickDirectionSchema = Type.Union([
  Type.Literal('in'),
  Type.Literal('out'),
  Type.Literal('both'),
]);

export const AxisPlacementSchema = Type.Union([
  Type.Object(
    { mode: Type.Literal('frame'), offsetPt: Type.Optional(offset) },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('percent'),
      percent: Type.Number({ minimum: 0, maximum: 100 }),
      offsetPt: Type.Optional(offset),
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('cross'),
      axisId: IdentifierSchema,
      value: Type.Number(),
      offsetPt: Type.Optional(offset),
    },
    closed,
  ),
]);

export const AxisGridSchema = Type.Object(
  {
    major: Type.Optional(LineStyleSchema),
    minor: Type.Optional(LineStyleSchema),
    layer: Type.Optional(
      Type.Union([Type.Literal('back'), Type.Literal('front')]),
    ),
  },
  closed,
);

export const AxisTextAppearanceProperties = {
  bold: Type.Optional(Type.Boolean()),
  italic: Type.Optional(Type.Boolean()),
  rotation: Type.Optional(Type.Number({ minimum: -180, maximum: 180 })),
  offsetPt: Type.Optional(screenOffset),
  layout: Type.Optional(TextLayoutSchema),
};

export const TickLabelAppearanceProperties = {
  ...AxisTextAppearanceProperties,
  textFormat: Type.Optional(TextContentFormatSchema),
  formula: Type.Optional(Type.String({ minLength: 1, maxLength: 256 })),
  prefix: Type.Optional(ShortDeclarativeTextSchema),
  suffix: Type.Optional(ShortDeclarativeTextSchema),
  divisor: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  background: Type.Optional(
    Type.Union([Type.Literal('none'), Type.Literal('white')]),
  ),
  anchor: Type.Optional(
    Type.Union([
      Type.Literal('start'),
      Type.Literal('middle'),
      Type.Literal('end'),
    ]),
  ),
  position: Type.Optional(
    Type.Union([Type.Literal('tick'), Type.Literal('interval')]),
  ),
  wrapWidthPt: Type.Optional(
    Type.Number({ exclusiveMinimum: 0, maximum: 14400 }),
  ),
  lineHeight: Type.Optional(Type.Number({ minimum: 0.5, maximum: 5 })),
  overlap: Type.Optional(
    Type.Union([Type.Literal('keep'), Type.Literal('hide')]),
  ),
};

export type AxisPlacement = Type.Static<typeof AxisPlacementSchema>;
export type TickDirection = Type.Static<typeof TickDirectionSchema>;
