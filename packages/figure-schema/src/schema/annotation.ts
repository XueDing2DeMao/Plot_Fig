import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

const CoordinateSpaceSchema = Type.Union([
  Type.Literal('page'),
  Type.Literal('panel'),
  Type.Literal('data'),
]);

const PointSchema = Type.Object(
  {
    x: Type.Number(),
    y: Type.Number(),
  },
  { additionalProperties: false },
);

const AnnotationTextSchema = Type.String({
  maxLength: 16_384,
  pattern: '^(?!.*<\\/?[A-Za-z][^>]*>)[\\s\\S]*$',
});

const BaseAnnotationFields = {
  annotationId: IdentifierSchema,
  coordinateSpace: CoordinateSpaceSchema,
  panelId: Type.Optional(IdentifierSchema),
  xAxisId: Type.Optional(IdentifierSchema),
  yAxisId: Type.Optional(IdentifierSchema),
  extensions: Type.Optional(ExtensionBagSchema),
};

export const LegendAnnotationSchema = Type.Object(
  {
    ...BaseAnnotationFields,
    kind: Type.Literal('legend'),
    position: PointSchema,
    visible: Type.Boolean(),
  },
  { additionalProperties: false },
);

export const TextAnnotationSchema = Type.Object(
  {
    ...BaseAnnotationFields,
    kind: Type.Literal('text'),
    position: PointSchema,
    text: AnnotationTextSchema,
    format: Type.Union([Type.Literal('plain'), Type.Literal('latex')]),
  },
  { additionalProperties: false },
);

export const ArrowAnnotationSchema = Type.Object(
  {
    ...BaseAnnotationFields,
    kind: Type.Literal('arrow'),
    start: PointSchema,
    end: PointSchema,
  },
  { additionalProperties: false },
);

export const RectangleAnnotationSchema = Type.Object(
  {
    ...BaseAnnotationFields,
    kind: Type.Literal('rectangle'),
    start: PointSchema,
    end: PointSchema,
  },
  { additionalProperties: false },
);

export const ReferenceLineAnnotationSchema = Type.Object(
  {
    ...BaseAnnotationFields,
    kind: Type.Literal('reference-line'),
    orientation: Type.Union([Type.Literal('x'), Type.Literal('y')]),
    value: Type.Number(),
  },
  { additionalProperties: false },
);

export const AnnotationSchema = Type.Union([
  LegendAnnotationSchema,
  TextAnnotationSchema,
  ArrowAnnotationSchema,
  RectangleAnnotationSchema,
  ReferenceLineAnnotationSchema,
]);

export type Annotation = Type.Static<typeof AnnotationSchema>;
