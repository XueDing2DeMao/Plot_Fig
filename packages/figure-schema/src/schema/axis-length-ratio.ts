import Type from 'typebox';
import { IdentifierSchema } from './common.js';

export const AxisLengthRatioSchema = Type.Object(
  {
    xAxisId: IdentifierSchema,
    yAxisId: IdentifierSchema,
    ratio: Type.Number({ exclusiveMinimum: 0 }),
  },
  { additionalProperties: false },
);
export type AxisLengthRatio = Type.Static<typeof AxisLengthRatioSchema>;
