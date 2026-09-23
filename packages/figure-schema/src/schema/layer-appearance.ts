import Type from 'typebox';

const closed = { additionalProperties: false };
const color = Type.String({ minLength: 1, maxLength: 128 });
const opacity = Type.Number({ minimum: 0, maximum: 1 });
export const LayerAppearanceSchema = Type.Object(
  {
    background: Type.Optional(Type.Object({ color, opacity }, closed)),
    border: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color,
          widthPt: Type.Number({ minimum: 0, maximum: 20 }),
          dash: Type.Union([
            Type.Literal('solid'),
            Type.Literal('dashed'),
            Type.Literal('dotted'),
            Type.Literal('dash-dot'),
          ]),
        },
        closed,
      ),
    ),
    shadow: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color,
          opacity,
          offsetXPt: Type.Number({ minimum: -100, maximum: 100 }),
          offsetYPt: Type.Number({ minimum: -100, maximum: 100 }),
        },
        closed,
      ),
    ),
    dataOnTopOfAxes: Type.Optional(Type.Boolean()),
  },
  closed,
);
export const ClipMarginsSchema = Type.Object(
  {
    horizontalPct: Type.Number({ minimum: -100, exclusiveMaximum: 50 }),
    verticalPct: Type.Number({ minimum: -100, exclusiveMaximum: 50 }),
  },
  closed,
);
export type LayerAppearance = Type.Static<typeof LayerAppearanceSchema>;
export type ClipMargins = Type.Static<typeof ClipMarginsSchema>;
