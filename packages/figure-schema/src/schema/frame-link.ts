import Type from 'typebox';
import { IdentifierSchema } from './common.js';

export const PanelFrameLinkSchema = Type.Object(
  {
    parentPanelId: IdentifierSchema,
    x: Type.Optional(Type.Number()),
    y: Type.Optional(Type.Number()),
    width: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    height: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  },
  { additionalProperties: false, minProperties: 2 },
);
export type PanelFrameLink = Type.Static<typeof PanelFrameLinkSchema>;
