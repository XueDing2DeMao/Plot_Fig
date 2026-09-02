import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

export const DataRoleSchema = Type.Union([
  Type.Literal('x'),
  Type.Literal('y'),
  Type.Literal('xError'),
  Type.Literal('xErrorLower'),
  Type.Literal('xErrorUpper'),
  Type.Literal('yError'),
  Type.Literal('yErrorLower'),
  Type.Literal('yErrorUpper'),
  Type.Literal('group'),
  Type.Literal('label'),
  Type.Literal('color'),
  Type.Literal('size'),
]);

export const DataValueTypeSchema = Type.Union([
  Type.Literal('number'),
  Type.Literal('category'),
  Type.Literal('string'),
]);

export const DataSlotSchema = Type.Object(
  {
    dataSlotId: IdentifierSchema,
    name: Type.String({ minLength: 1, maxLength: 256 }),
    role: DataRoleSchema,
    valueType: DataValueTypeSchema,
    required: Type.Boolean(),
    description: Type.Optional(Type.String({ maxLength: 1024 })),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type DataRole = Type.Static<typeof DataRoleSchema>;
export type DataValueType = Type.Static<typeof DataValueTypeSchema>;
export type DataSlot = Type.Static<typeof DataSlotSchema>;
