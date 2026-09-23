import Type from 'typebox';

const closed = { additionalProperties: false };
const color = Type.String({ minLength: 1, maxLength: 128 });

export const TextContentFormatSchema = Type.Union([
  Type.Literal('auto'),
  Type.Literal('plain'),
  Type.Literal('rich'),
  Type.Literal('latex'),
]);

export const TextPaddingSchema = Type.Object(
  {
    top: Type.Number({ minimum: 0, maximum: 14400 }),
    right: Type.Number({ minimum: 0, maximum: 14400 }),
    bottom: Type.Number({ minimum: 0, maximum: 14400 }),
    left: Type.Number({ minimum: 0, maximum: 14400 }),
  },
  closed,
);

export const TextBorderSchema = Type.Object(
  {
    widthPt: Type.Number({ minimum: 0, maximum: 20 }),
    color,
  },
  closed,
);

export const TextLayoutSchema = Type.Object(
  {
    align: Type.Optional(
      Type.Union([
        Type.Literal('left'),
        Type.Literal('center'),
        Type.Literal('right'),
      ]),
    ),
    wrapWidthPt: Type.Optional(
      Type.Number({ exclusiveMinimum: 0, maximum: 14400 }),
    ),
    lineHeight: Type.Optional(Type.Number({ minimum: 0.5, maximum: 5 })),
    paddingPt: Type.Optional(TextPaddingSchema),
    background: Type.Optional(color),
    border: Type.Optional(TextBorderSchema),
  },
  closed,
);

export type TextLayoutOptions = Type.Static<typeof TextLayoutSchema>;
export type TextContentFormat = Type.Static<typeof TextContentFormatSchema>;
