import Type from 'typebox';
import {
  CURRENT_SCHEMA_VERSION,
  ExtensionBagSchema,
  IdentifierSchema,
} from './common.js';
import { DataValueTypeSchema } from './data-slot.js';
import { FigureTemplateSchema } from './figure-template.js';

export const DataSourceColumnSchema = Type.Object(
  {
    columnId: IdentifierSchema,
    valueType: DataValueTypeSchema,
  },
  { additionalProperties: false },
);

export const DataSourceDescriptorSchema = Type.Object(
  {
    sourceId: IdentifierSchema,
    name: Type.String({ minLength: 1, maxLength: 256 }),
    sourceKind: Type.Union([
      Type.Literal('inline'),
      Type.Literal('external'),
      Type.Literal('session'),
    ]),
    mediaType: Type.String({ minLength: 1, maxLength: 256 }),
    contentHash: Type.String({ minLength: 1, maxLength: 256 }),
    columns: Type.Array(DataSourceColumnSchema),
  },
  { additionalProperties: false },
);

export const DataBindingSchema = Type.Object(
  {
    dataSlotId: IdentifierSchema,
    sourceId: IdentifierSchema,
    columnId: IdentifierSchema,
  },
  { additionalProperties: false },
);

export const FigureDocumentSchema = Type.Object(
  {
    kind: Type.Literal('figure-document'),
    schemaVersion: Type.Literal(CURRENT_SCHEMA_VERSION),
    documentId: IdentifierSchema,
    templateSnapshot: FigureTemplateSchema,
    dataSources: Type.Array(DataSourceDescriptorSchema),
    bindingSet: Type.Array(DataBindingSchema),
    documentExtensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type DataSourceColumn = Type.Static<typeof DataSourceColumnSchema>;
export type DataSourceDescriptor = Type.Static<
  typeof DataSourceDescriptorSchema
>;
export type DataBinding = Type.Static<typeof DataBindingSchema>;
export type FigureDocument = Type.Static<typeof FigureDocumentSchema>;
