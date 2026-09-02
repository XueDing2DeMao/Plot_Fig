import Type from 'typebox';

export const ThemeSchema = Type.Object(
  {
    font: Type.Object(
      {
        family: Type.String({ minLength: 1, maxLength: 256 }),
        sizePt: Type.Number({ exclusiveMinimum: 0 }),
        color: Type.String({ minLength: 1 }),
      },
      { additionalProperties: false },
    ),
    line: Type.Object(
      {
        color: Type.String({ minLength: 1 }),
        widthPt: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    marker: Type.Object(
      {
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
      },
      { additionalProperties: false },
    ),
    palette: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    background: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export type Theme = Type.Static<typeof ThemeSchema>;
