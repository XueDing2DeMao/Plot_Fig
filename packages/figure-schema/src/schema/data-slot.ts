import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

export const DataRoleSchema = Type.Union([
  Type.Literal('valueError'),
  Type.Literal('valueErrorLower'),
  Type.Literal('valueErrorUpper'),
  Type.Literal('category'),
  Type.Literal('value'),
  Type.Literal('values'),
  Type.Literal('z'),
  Type.Literal('x'),
  Type.Literal('y'),
  Type.Literal('xError'),
  Type.Literal('xErrorLower'),
  Type.Literal('xErrorUpper'),
  Type.Literal('yError'),
  Type.Literal('yErrorLower'),
  Type.Literal('yErrorUpper'),
  Type.Literal('group'),
  Type.Literal('split'),
  Type.Literal('label'),
  Type.Literal('color'),
  Type.Literal('lineColor'),
  Type.Literal('size'),
  Type.Literal('shape'),
]);

export const DataValueTypeSchema = Type.Union([
  Type.Literal('number'),
  Type.Literal('category'),
  Type.Literal('string'),
]);

// 结构层只声明字段；role 与 valueType 的兼容性留给 Task 8 的 domain validator。
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
