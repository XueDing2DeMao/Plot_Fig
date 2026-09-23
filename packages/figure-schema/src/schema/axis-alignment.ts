import Type from 'typebox';
import { IdentifierSchema } from './common.js';

export const YAxisAlignmentSchema = Type.Object(
  {
    leftAxisId: IdentifierSchema,
    rightAxisId: IdentifierSchema,
    value: Type.Number(),
  },
  { additionalProperties: false },
);

export type YAxisAlignment = Type.Static<typeof YAxisAlignmentSchema>;
