import Type from 'typebox';
import {CurveGroupsSchema} from './curve-groups.js';
import {PanelStackSchema} from './curve-transforms.js';
import { PanelFrameLinkSchema } from './frame-link.js';
import {
  LayerAppearanceSchema,
  ClipMarginsSchema,
} from './layer-appearance.js';
import {
  SharedAxisGroupSchema,
  PublicationPresetSchema,
} from './publication.js';
import { AnnotationSchema } from './annotation.js';
import { AxisSchema } from './axis.js';
import { YAxisAlignmentSchema } from './axis-alignment.js';
import { AxisLengthRatioSchema } from './axis-length-ratio.js';
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
    name: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
    visible: Type.Optional(Type.Boolean()),
    appearance: Type.Optional(LayerAppearanceSchema),
    clipMargins: Type.Optional(ClipMarginsSchema),
    frame: PanelFrameSchema,
    frameLink: Type.Optional(PanelFrameLinkSchema),
    coordinateSystem: Type.Literal('cartesian-2d'),
    clip: Type.Boolean(),
    axes: Type.Array(AxisSchema, { minItems: 2 }),
    yAxisAlignment: Type.Optional(YAxisAlignmentSchema),
    axisLengthRatio: Type.Optional(AxisLengthRatioSchema),
    plotSlots: Type.Array(PlotSlotSchema),
    groups: Type.Optional(CurveGroupsSchema),
    stack: Type.Optional(PanelStackSchema),
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
    sharedAxisGroups: Type.Optional(Type.Array(SharedAxisGroupSchema)),
    publicationPreset: Type.Optional(PublicationPresetSchema),
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
