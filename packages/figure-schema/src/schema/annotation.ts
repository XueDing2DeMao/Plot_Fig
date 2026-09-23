import Type, { type TProperties } from 'typebox';
import {
  TextStyleSchema,
  ShapeStyleSchema,
  LegendLayoutSchema,
} from './publication.js';
import {
  DeclarativeTextSchema,
  ExtensionBagSchema,
  IdentifierSchema,
} from './common.js';
import { TextContentFormatSchema } from './text-layout.js';

const BaseAnnotationFields = {
  annotationId: IdentifierSchema,
  visible: Type.Optional(Type.Boolean()),
  extensions: Type.Optional(ExtensionBagSchema),
} satisfies TProperties;

const PageScopeFields = {
  coordinateSpace: Type.Literal('page'),
} satisfies TProperties;

const PanelScopeFields = {
  coordinateSpace: Type.Literal('panel'),
  panelId: IdentifierSchema,
} satisfies TProperties;

const DataScopeFields = {
  coordinateSpace: Type.Literal('data'),
  panelId: IdentifierSchema,
  xAxisId: IdentifierSchema,
  yAxisId: IdentifierSchema,
} satisfies TProperties;

const PointSchema = Type.Object(
  {
    x: Type.Number(),
    y: Type.Number(),
  },
  { additionalProperties: false },
);

function createAnnotationSchema<
  TScopeFields extends TProperties,
  TVariantFields extends TProperties,
>(scopeFields: TScopeFields, variantFields: TVariantFields) {
  return Type.Object(
    {
      ...BaseAnnotationFields,
      ...scopeFields,
      ...variantFields,
    },
    { additionalProperties: false },
  );
}

const LegendFields = {
  kind: Type.Literal('legend'),
  position: PointSchema,
  visible: Type.Boolean(),
  textStyle: Type.Optional(TextStyleSchema),
  layout: Type.Optional(LegendLayoutSchema),
} satisfies TProperties;

const TextFields = {
  kind: Type.Literal('text'),
  position: PointSchema,
  text: DeclarativeTextSchema,
  format: TextContentFormatSchema,
  textStyle: Type.Optional(TextStyleSchema),
} satisfies TProperties;

const SegmentFields = {
  shapeStyle: Type.Optional(ShapeStyleSchema),
  start: PointSchema,
  end: PointSchema,
} satisfies TProperties;

export const LegendAnnotationSchema = Type.Union([
  createAnnotationSchema(PageScopeFields, LegendFields),
  createAnnotationSchema(PanelScopeFields, LegendFields),
]);

export const TextAnnotationSchema = Type.Union([
  createAnnotationSchema(PageScopeFields, TextFields),
  createAnnotationSchema(PanelScopeFields, TextFields),
  createAnnotationSchema(DataScopeFields, TextFields),
]);

export const ArrowAnnotationSchema = Type.Union([
  createAnnotationSchema(PageScopeFields, {
    kind: Type.Literal('arrow'),
    ...SegmentFields,
  }),
  createAnnotationSchema(PanelScopeFields, {
    kind: Type.Literal('arrow'),
    ...SegmentFields,
  }),
  createAnnotationSchema(DataScopeFields, {
    kind: Type.Literal('arrow'),
    ...SegmentFields,
  }),
]);

export const RectangleAnnotationSchema = Type.Union([
  createAnnotationSchema(PageScopeFields, {
    kind: Type.Literal('rectangle'),
    ...SegmentFields,
  }),
  createAnnotationSchema(PanelScopeFields, {
    kind: Type.Literal('rectangle'),
    ...SegmentFields,
  }),
  createAnnotationSchema(DataScopeFields, {
    kind: Type.Literal('rectangle'),
    ...SegmentFields,
  }),
]);

export const ReferenceLineAnnotationSchema = createAnnotationSchema(
  DataScopeFields,
  {
    kind: Type.Literal('reference-line'),
    shapeStyle: Type.Optional(ShapeStyleSchema),
    orientation: Type.Union([Type.Literal('x'), Type.Literal('y')]),
    value: Type.Number(),
  },
);

export const AnnotationSchema = Type.Union([
  LegendAnnotationSchema,
  TextAnnotationSchema,
  ArrowAnnotationSchema,
  RectangleAnnotationSchema,
  ReferenceLineAnnotationSchema,
]);

export type Annotation = Type.Static<typeof AnnotationSchema>;
