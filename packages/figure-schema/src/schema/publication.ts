import { PaintSchema } from './paint.js';
import Type from 'typebox';
import { IdentifierSchema } from './common.js';
import { BasicLineStyleSchema as LineStyleSchema } from './plot-styles.js';
import { TextLayoutSchema } from './text-layout.js';

const closed = { additionalProperties: false };
const color = Type.String({ minLength: 1, maxLength: 128 });
export const TextStyleSchema = Type.Object(
  {
    fontFamily: Type.String({ minLength: 1, maxLength: 256 }),
    fontSizePt: Type.Number({ exclusiveMinimum: 0, maximum: 256 }),
    color,
    bold: Type.Boolean(),
    italic: Type.Boolean(),
    anchor: Type.Union([
      Type.Literal('start'),
      Type.Literal('middle'),
      Type.Literal('end'),
    ]),
    rotation: Type.Number({ minimum: -360, maximum: 360 }),
    layout: Type.Optional(TextLayoutSchema),
  },
  closed,
);
export const ShapeStyleSchema = Type.Object(
  {
    line: LineStyleSchema,
    fill: color,
    paint: Type.Optional(PaintSchema),
    opacity: Type.Number({ minimum: 0, maximum: 1 }),
    arrowHead: Type.Union([
      Type.Literal('end'),
      Type.Literal('both'),
      Type.Literal('none'),
    ]),
    arrowSizePt: Type.Number({ minimum: 0, maximum: 100 }),
  },
  closed,
);
export const LegendLayoutSchema = Type.Object(
  {
    columns: Type.Integer({ minimum: 1, maximum: 20 }),
    direction: Type.Union([
      Type.Literal('vertical'),
      Type.Literal('horizontal'),
    ]),
    anchor: Type.Union([
      Type.Literal('top-left'),
      Type.Literal('top-right'),
      Type.Literal('bottom-left'),
      Type.Literal('bottom-right'),
    ]),
    sampleWidthPt: Type.Number({ minimum: 0, maximum: 200 }),
    rowGapPt: Type.Number({ minimum: 0, maximum: 100 }),
    columnGapPt: Type.Number({ minimum: 0, maximum: 200 }),
    paddingPt: Type.Number({ minimum: 0, maximum: 100 }),
    background: color,
    borderColor: color,
    borderWidthPt: Type.Number({ minimum: 0, maximum: 20 }),
    plotSlotIds: Type.Optional(
      Type.Array(IdentifierSchema, { uniqueItems: true }),
    ),
  },
  closed,
);
export const SharedAxisGroupSchema = Type.Object(
  {
    groupId: IdentifierSchema,
    members: Type.Array(
      Type.Object(
        { panelId: IdentifierSchema, axisId: IdentifierSchema },
        closed,
      ),
      { minItems: 2 },
    ),
  },
  closed,
);
export type TextStyle = Type.Static<typeof TextStyleSchema>;
export type ShapeStyle = Type.Static<typeof ShapeStyleSchema>;
export type LegendLayout = Type.Static<typeof LegendLayoutSchema>;
export type SharedAxisGroup = Type.Static<typeof SharedAxisGroupSchema>;
export const PublicationPresetSchema = Type.Object(
  {
    presetId: IdentifierSchema,
    name: Type.String({ minLength: 1, maxLength: 128 }),
    sourceUrl: Type.String({ maxLength: 2048 }),
    checkedAt: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
    recommendedDpi: Type.Integer({ minimum: 72, maximum: 2400 }),
    minFontPt: Type.Number({ minimum: 0 }),
    maxFontPt: Type.Number({ exclusiveMinimum: 0 }),
  },
  closed,
);
