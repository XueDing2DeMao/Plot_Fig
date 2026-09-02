import Type from 'typebox';
import {
  ExtensionBagSchema,
  LengthSchema,
  PointLengthSchema,
} from './common.js';

export const PanelFrameSchema = Type.Object(
  {
    x: Type.Number({ minimum: 0, maximum: 1 }),
    y: Type.Number({ minimum: 0, maximum: 1 }),
    width: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
    height: Type.Number({ exclusiveMinimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export const PageSchema = Type.Object(
  {
    size: Type.Object(
      {
        width: LengthSchema,
        height: LengthSchema,
      },
      { additionalProperties: false },
    ),
    background: Type.String({ minLength: 1 }),
    margins: Type.Object(
      {
        top: PointLengthSchema,
        right: PointLengthSchema,
        bottom: PointLengthSchema,
        left: PointLengthSchema,
      },
      { additionalProperties: false },
    ),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type PanelFrame = Type.Static<typeof PanelFrameSchema>;
export type Page = Type.Static<typeof PageSchema>;
