import Type from 'typebox';
const strict = { additionalProperties: false };
const text = (maxLength: number) => Type.String({ minLength: 1, maxLength });
const character = {
  fontFamily: text(128),
  outline: Type.Enum(['none', 'box', 'circle']),
};
export const MarkerDetailsSchema = Type.Object(
  {
    fixedSize: Type.Optional(
      Type.Object(
        {
          value: Type.Number({ minimum: 0, maximum: 1000000 }),
          unit: Type.Enum(['x-data', 'y-data']),
        },
        strict,
      ),
    ),
    fillOnlyOpacity: Type.Optional(Type.Boolean()),
    strokeRadiusPct: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
    character: Type.Optional(
      Type.Union([
        Type.Object(
          { ...character, mode: Type.Literal('constant'), text: text(1) },
          strict,
        ),
        Type.Object(
          { ...character, mode: Type.Literal('sequence'), alphabet: text(256) },
          strict,
        ),
        Type.Object({ ...character, mode: Type.Literal('row-number') }, strict),
      ]),
    ),
    overlap: Type.Optional(
      Type.Object(
        {
          direction: Type.Enum(['horizontal', 'vertical']),
          gapPt: Type.Number({ minimum: 0, maximum: 100 }),
          center: Type.Boolean(),
        },
        strict,
      ),
    ),
    legend: Type.Optional(
      Type.Object(
        {
          rows: Type.Array(Type.Integer({ minimum: 1, maximum: 100000 }), {
            minItems: 1,
            maxItems: 8,
            uniqueItems: true,
          }),
          sizePt: Type.Number({ minimum: 4, maximum: 36 }),
        },
        strict,
      ),
    ),
  },
  strict,
);
export type MarkerDetails = Type.Static<typeof MarkerDetailsSchema>;
