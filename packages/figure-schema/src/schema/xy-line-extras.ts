import Type from 'typebox';
import { IdentifierSchema } from './common.js';

const color = Type.String({ minLength: 1, maxLength: 128, pattern: '\\S' });
export const CurveArrowsSchema = Type.Object(
  {
    position: Type.Union([
      Type.Literal('start'),
      Type.Literal('end'),
      Type.Literal('both'),
      Type.Literal('repeat'),
    ]),
    lengthPt: Type.Number({ minimum: 1, maximum: 100 }),
    angleDeg: Type.Number({ minimum: 10, maximum: 120 }),
    spacingFactor: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
    curveTolerance: Type.Optional(Type.Number({ minimum: 1, maximum: 10 })),
    color: Type.Optional(color),
  },
  { additionalProperties: false },
);
export const DropLineSchema = Type.Object(
  {
    target: Type.Union([
      Type.Object(
        {
          mode: Type.Union([
            Type.Literal('axis-min'),
            Type.Literal('axis-max'),
          ]),
        },
        { additionalProperties: false },
      ),
      Type.Object(
        { mode: Type.Literal('value'), value: Type.Number() },
        { additionalProperties: false },
      ),
      Type.Object(
        {
          mode: Type.Literal('next-curve'),
          plotSlotId: Type.Optional(IdentifierSchema),
        },
        { additionalProperties: false },
      ),
    ]),
    selection: Type.Optional(
      Type.Object(
        {
          mode: Type.Literal('values'),
          values: Type.Array(Type.Number(), {
            minItems: 1,
            maxItems: 2000,
            uniqueItems: true,
          }),
        },
        { additionalProperties: false },
      ),
    ),
    style: Type.Optional(
      Type.Object(
        {
          color,
          widthPt: Type.Number({ minimum: 0, maximum: 100 }),
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
  },
  { additionalProperties: false },
);
export const xyLineExtrasProperties = {
  closeLine: Type.Optional(Type.Boolean()),
  symbolGapPct: Type.Optional(Type.Number({ minimum: 0, maximum: 256 })),
  lineArrows: Type.Optional(CurveArrowsSchema),
  dropLines: Type.Optional(
    Type.Object(
      {
        horizontal: Type.Optional(DropLineSchema),
        vertical: Type.Optional(DropLineSchema),
      },
      { additionalProperties: false },
    ),
  ),
};
export type CurveArrows = Type.Static<typeof CurveArrowsSchema>;
export type DropLine = Type.Static<typeof DropLineSchema>;
