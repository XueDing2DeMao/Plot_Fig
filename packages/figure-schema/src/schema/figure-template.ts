import Type from 'typebox';
import { AnnotationSchema } from './annotation.js';
import { AxisSchema } from './axis.js';
import {
  CURRENT_SCHEMA_VERSION,
  ExtensionBagSchema,
  IdentifierSchema,
} from './common.js';
import { DataSlotSchema } from './data-slot.js';
import { PageSchema, PanelFrameSchema } from './layout.js';
import { PlotSlotSchema } from './plot-slot.js';
import { ThemeSchema } from './theme.js';

export const PanelSchema = Type.Object(
  {
    panelId: IdentifierSchema,
    frame: PanelFrameSchema,
    coordinateSystem: Type.Literal('cartesian-2d'),
    clip: Type.Boolean(),
    axes: Type.Array(AxisSchema, { minItems: 2 }),
    plotSlots: Type.Array(PlotSlotSchema),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export const FigureTemplateSchema = Type.Object(
  {
    kind: Type.Literal('figure-template'),
    schemaVersion: Type.Literal(CURRENT_SCHEMA_VERSION),
    templateId: IdentifierSchema,
    metadata: Type.Object(
      {
        name: Type.String({ minLength: 1 }),
        description: Type.Optional(Type.String()),
        tags: Type.Array(Type.String(), { uniqueItems: true }),
      },
      { additionalProperties: false },
    ),
    page: PageSchema,
    panels: Type.Array(PanelSchema, { minItems: 1 }),
    dataSlots: Type.Array(DataSlotSchema),
    annotations: Type.Array(AnnotationSchema),
    theme: ThemeSchema,
    provenance: Type.Optional(
      Type.Object(
        {
          sourceKind: Type.String(),
          sourceHash: Type.String(),
          importerVersion: Type.String(),
        },
        { additionalProperties: false },
      ),
    ),
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type Panel = Type.Static<typeof PanelSchema>;
export type FigureTemplate = Type.Static<typeof FigureTemplateSchema>;
