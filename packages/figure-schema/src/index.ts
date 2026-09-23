export { canonicalizeFigurePayload } from './canonicalize.js';
export {
  validateMarkerDetails,
  validateCharacterGlyph,
  type CharacterGlyph,
} from './marker-detail-validation.js';
export type { MarkerDetails } from './schema/marker-details.js';
export { validateV1150Structure } from './validation/structural.js';
export { validateV1140Structure } from './validation/structural.js';
export type {
  MarkerMapping,
  MarkerOverrides,
  MarkerSource,
} from './schema/marker-mapping.js';
export {
  validateMarkerMapping,
  validateMarkerMappingStructure,
  validateMarkerOverrides,
  validateMarkerSource,
} from './marker-mapping-validation.js';
export { validateV1110Structure } from './validation/structural.js';
export type { CurveArrows, DropLine } from './schema/xy-line-extras.js';
export { validateV150Structure } from './validation/structural.js';
export { validateV160Structure } from './validation/structural.js';
export { validateV170Structure } from './validation/structural.js';
export {
  validateV1100Structure,
  validateV190Structure,
} from './validation/structural.js';
export { validateV180Structure } from './validation/structural.js';
export type { AxisLengthRatio } from './schema/axis-length-ratio.js';
export { resolvePanelFrames } from './panel-frame-links.js';
export type { PanelFrameLink } from './schema/frame-link.js';
export type {
  LayerAppearance,
  ClipMargins,
} from './schema/layer-appearance.js';
export type {
  DataBinding,
  DataSourceDescriptor,
  FigureDocument,
} from './schema/figure-document.js';
export type { FigureTemplate } from './schema/figure-template.js';
export type { ValidationIssue, ValidationResult } from './validation/types.js';
export {
  validateFigureDocument,
  validateFigureTemplate,
} from './validation/validate.js';

export type {
  PlotSlot,
  XyPlot,
  LineStyle,
  MarkerStyle,
} from './schema/plot-slot.js';
export type {
  FillStyle,
  ColorScale,
  HistogramBins,
  ContourLevels,
  Distribution,
} from './schema/chart-plots.js';
export type { Axis, MajorTickGeneration } from './schema/axis.js';
export type { YAxisAlignment } from './schema/axis-alignment.js';
export type { DataRole, DataSlot } from './schema/data-slot.js';
export { CURRENT_SCHEMA_VERSION } from './schema/common.js';
export {
  plotRoles,
  plotBindingEntries,
  roleAcceptsType,
  categoricalDimension,
} from './plot-contract.js';
export type { PlotKind, PlotRole } from './plot-contract.js';
export type { Annotation } from './schema/annotation.js';
export type { Panel } from './schema/figure-template.js';
export type { ErrorBarStyle } from './schema/plot-slot.js';
export type {
  TextStyle,
  ShapeStyle,
  LegendLayout,
  SharedAxisGroup,
} from './schema/publication.js';
export {
  defaultTextStyle,
  defaultShapeStyle,
  defaultLegendLayout,
} from './publication-defaults.js';
export type { AxisPlacement, TickDirection } from './schema/axis-appearance.js';
export type {
  TextLayoutOptions,
  TextContentFormat,
} from './schema/text-layout.js';

export { MARKER_SHAPES, validateMarkerVertices } from './marker-geometry.js';
export { validateV1120Structure } from './validation/structural.js';
export type { XyDataView } from './schema/xy-data-view.js';
export { validateLineMapping } from './schema/line-mapping.js';
export type { LineMapping } from './schema/line-mapping.js';
export {
  validateDataLabels,
  validateLabelOverrides,
} from './schema/data-labels.js';
export type { DataLabels, LabelOverrides } from './schema/data-labels.js';
export type {
  CurveGroup,
  CurveGroups,
  CurveSubset,
} from './schema/curve-groups.js';
export {
  validateCurveGroupsStructure,
  validateCurveSubset,
} from './schema/curve-groups.js';
export type {
  CurveOffset,
  CurveFill,
  CurveTransform,
  PanelStack,
} from './schema/curve-transforms.js';
export {
  validateCurveTransform,
  validatePanelStack,
} from './schema/curve-transforms.js';
export type {
  ErrorDetails,
  ErrorDirectionDetails,
} from './schema/error-details.js';
export { validateErrorDetails } from './schema/error-details.js';
export { validateV1160Structure } from './validation/structural.js';
export { validateV1170Structure } from './validation/structural.js';
export { validateV1180Structure } from './validation/structural.js';
export { validateV1190Structure } from './validation/structural.js';
export * from './numeric-scale.js';
export * from './axis-scale.js';
export type {
  AxisAdvanced,
  AxisLabelSource,
  AxisScaleOptions,
} from './schema/axis-advanced.js';
export {
  AxisAdvancedSchema,
  AxisScaleOptionsSchema,
  FormulaPairSchema,
} from './schema/axis-advanced.js';
export {
  compileAxisFormula,
  validateFormulaPair,
  type FormulaPair,
} from './restricted-formula.js';
export { validateV1130Structure } from './validation/structural.js';
export {
  validateF4PanelRelations,
  validateCurveGroups,
  validateCurveTransforms,
} from './schema/curve-relations.js';

export { PaintSchema, type Paint } from './schema/paint.js';
export { validateV1210Structure } from './validation/structural.js';
