import Type from 'typebox';

export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;

export const IdentifierSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: '^[A-Za-z0-9][A-Za-z0-9._:-]*$',
});

export const LengthUnitSchema = Type.Union([
  Type.Literal('mm'),
  Type.Literal('cm'),
  Type.Literal('in'),
  Type.Literal('px'),
]);

export const LengthSchema = Type.Object(
  {
    value: Type.Number({ minimum: 0 }),
    unit: LengthUnitSchema,
  },
  { additionalProperties: false },
);

export const PointLengthSchema = Type.Number({ minimum: 0 });

export const ExtensionBagSchema = Type.Object(
  {
    origin: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

export type Identifier = Type.Static<typeof IdentifierSchema>;
export type Length = Type.Static<typeof LengthSchema>;
export type ExtensionBag = Type.Static<typeof ExtensionBagSchema>;
