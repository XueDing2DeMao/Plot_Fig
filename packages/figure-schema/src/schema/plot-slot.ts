import Type from 'typebox';
import {DataLabelsSchema,LabelOverridesSchema} from './data-labels.js';
import {ErrorDetailsSchema} from './error-details.js';
import {CurveSubsetSchema} from './curve-groups.js';
import {CurveTransformSchema} from './curve-transforms.js';
import {LineMappingSchema} from './line-mapping.js';
import { MarkerDetailsSchema } from './marker-details.js';
import {
  MarkerMappingSchema,
  MarkerOverridesSchema,
} from './marker-mapping.js';
import { XyDataViewSchema } from './xy-data-view.js';
import { xyLineExtrasProperties } from './xy-line-extras.js';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';
import {
  PlotBindingsSchema,
  LineStyleSchema,
  MarkerStyleSchema,
  ErrorBarStyleSchema,
  LegendEntrySchema,
} from './plot-styles.js';
import {
  BarPlotSchema,
  HistogramPlotSchema,
  BoxPlotSchema,
  AreaPlotSchema,
  HeatmapPlotSchema,
  ContourPlotSchema,
} from './chart-plots.js';
export * from './plot-styles.js';
export const XyPlotSchema = Type.Object(
  {
    plotSlotId: IdentifierSchema,
    visible: Type.Optional(Type.Boolean()),
    kind: Type.Literal('xy'),
    mode: Type.Union([
      Type.Literal('markers'),
      Type.Literal('line'),
      Type.Literal('line-markers'),
    ]),
    xAxisId: IdentifierSchema,
    yAxisId: IdentifierSchema,
    bindings: PlotBindingsSchema,
    dataView: Type.Optional(XyDataViewSchema),
    markerMapping: Type.Optional(MarkerMappingSchema),
    markerDetails: Type.Optional(MarkerDetailsSchema),
    markerOverrides: Type.Optional(MarkerOverridesSchema),
    lineMapping: Type.Optional(LineMappingSchema),
    lineInFront: Type.Optional(Type.Boolean()),
    dataLabels: Type.Optional(DataLabelsSchema),
    labelOverrides: Type.Optional(LabelOverridesSchema),
    errorDetails: Type.Optional(ErrorDetailsSchema),
    subset: Type.Optional(CurveSubsetSchema),
    transform: Type.Optional(CurveTransformSchema),
    lineConnection: Type.Optional(
      Type.Union([
        Type.Literal('straight'),
        Type.Literal('step-h'),
        Type.Literal('step-v'),
        Type.Literal('spline'),
      ]),
    ),
    lineStyle: Type.Optional(LineStyleSchema),
    ...xyLineExtrasProperties,
    markerStyle: Type.Optional(MarkerStyleSchema),
    errorBarStyle: Type.Optional(ErrorBarStyleSchema),
    legendEntry: LegendEntrySchema,
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);
export const PlotSlotSchema = Type.Union([
  XyPlotSchema,
  BarPlotSchema,
  HistogramPlotSchema,
  BoxPlotSchema,
  AreaPlotSchema,
  HeatmapPlotSchema,
  ContourPlotSchema,
]);
export type XyPlot = Type.Static<typeof XyPlotSchema>;
export type PlotSlot = Type.Static<typeof PlotSlotSchema>;
export type PlotBindings = Type.Static<typeof PlotBindingsSchema>;
export type LineStyle = Type.Static<typeof LineStyleSchema>;
export type MarkerStyle = Type.Static<typeof MarkerStyleSchema>;
export type ErrorBarStyle = Type.Static<typeof ErrorBarStyleSchema>;
export type LegendEntry = Type.Static<typeof LegendEntrySchema>;
