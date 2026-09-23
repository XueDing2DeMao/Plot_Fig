import {
  canonicalizeFigurePayload,
  validateFigureDocument,
  validateFigureTemplate,
} from '@plot-fig/figure-schema';
import type {
  DataBinding,
  DataSourceDescriptor,
  FigureDocument,
  FigureTemplate,
  ValidationIssue,
  ValidationResult,
} from '@plot-fig/figure-schema';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as figureSchema from '@plot-fig/figure-schema';
import { canonicalizeFigurePayload as internalCanonicalizeFigurePayload } from './canonicalize.js';
import { validTemplate } from './schema/fixtures.js';
import {
  validateFigureDocument as internalValidateFigureDocument,
  validateFigureTemplate as internalValidateFigureTemplate,
} from './validation/validate.js';

const validDocument = {
  kind: 'figure-document',
  schemaVersion: '1.22.0',
  documentId: 'document-1',
  templateSnapshot: validTemplate,
  dataSources: [
    {
      sourceId: 'source-1',
      name: 'Measurement',
      sourceKind: 'external',
      mediaType: 'text/csv',
      contentHash: 'sha256:abc123',
      columns: [
        { columnId: 'temperature', valueType: 'number' },
        { columnId: 'conductivity', valueType: 'number' },
      ],
    },
  ],
  bindingSet: [
    { dataSlotId: 'slot-x', sourceId: 'source-1', columnId: 'temperature' },
    { dataSlotId: 'slot-y', sourceId: 'source-1', columnId: 'conductivity' },
  ],
} as const satisfies FigureDocument;

describe('root package entry', () => {
  it('exports only the stable runtime API surface', () => {
    expect(Object.keys(figureSchema).sort()).toEqual([
      'AxisAdvancedSchema',
      'AxisScaleOptionsSchema',
      'CURRENT_SCHEMA_VERSION',
      'FormulaPairSchema',
      'MARKER_SHAPES',
      'axisScaleSpec',
      'canonicalizeFigurePayload',
      'categoricalDimension',
      'compileAxisFormula',
      'createNumericScale',
      'defaultLegendLayout',
      'defaultShapeStyle',
      'defaultTextStyle',
      'isAdvancedAxis',
      'isPositiveLogAxis',
      'logarithmBase',
      'numericScaleCapability',
      'plotBindingEntries',
      'plotRoles',
      'resolvePanelFrames',
      'roleAcceptsType',
      'sameAxisScale',
      'validateAxisScaleSettings',
      'validateCharacterGlyph',
      'validateCurveGroups',
      'validateCurveGroupsStructure',
      'validateCurveSubset',
      'validateCurveTransform',
      'validateCurveTransforms',
      'validateDataLabels',
      'validateErrorDetails',
      'validateF4PanelRelations',
      'validateFigureDocument',
      'validateFigureTemplate',
      'validateFormulaPair',
      'validateLabelOverrides',
      'validateLineMapping',
      'validateMarkerDetails',
      'validateMarkerMapping',
      'validateMarkerMappingStructure',
      'validateMarkerOverrides',
      'validateMarkerSource',
      'validateMarkerVertices',
      'validateNumericScaleSpec',
      'validatePanelStack',
      'validateV1100Structure',
      'validateV1110Structure',
      'validateV1120Structure',
      'validateV1130Structure',
      'validateV1140Structure',
      'validateV1150Structure',
      'validateV1160Structure',
      'validateV1170Structure',
      'validateV1180Structure',
      'validateV1190Structure',
      'validateV150Structure',
      'validateV160Structure',
      'validateV170Structure',
      'validateV180Structure',
      'validateV190Structure',
    ]);
    expect(figureSchema).not.toHaveProperty('FigureTemplateSchema');
    expect(figureSchema).not.toHaveProperty('FigureDocumentSchema');
    expect(figureSchema).not.toHaveProperty('validateFigureTemplateDomain');
    expect(figureSchema).not.toHaveProperty('validateFigureTemplateStructure');
  });

  it('re-exports the stable runtime implementations', () => {
    expect(validateFigureTemplate).toBe(internalValidateFigureTemplate);
    expect(validateFigureDocument).toBe(internalValidateFigureDocument);
    expect(canonicalizeFigurePayload).toBe(internalCanonicalizeFigurePayload);
  });

  it('re-exports the public types for template and document flows', () => {
    const template: FigureTemplate = validTemplate;
    const binding: DataBinding = {
      dataSlotId: 'slot-x',
      sourceId: 'source-1',
      columnId: 'temperature',
    };
    const source: DataSourceDescriptor = validDocument.dataSources[0];
    const issue: ValidationIssue = {
      code: 'FIGURE_SCHEMA_INVALID',
      path: '/templateId',
      message: 'must be string',
    };
    const templateResult: ValidationResult<FigureTemplate> =
      validateFigureTemplate(template);
    const documentResult: ValidationResult<FigureDocument> =
      validateFigureDocument(validDocument);

    expect(binding.columnId).toBe('temperature');
    expect(source.columns).toHaveLength(2);
    expect(issue.code).toBe('FIGURE_SCHEMA_INVALID');
    expect(templateResult.ok).toBe(true);
    expect(documentResult.ok).toBe(true);
    expectTypeOf(templateResult).toEqualTypeOf<
      ValidationResult<FigureTemplate>
    >();
    expectTypeOf(documentResult).toEqualTypeOf<
      ValidationResult<FigureDocument>
    >();
  });
});
