import Type from 'typebox';
import { ExtensionBagSchema, IdentifierSchema } from './common.js';

const OptionalBindingSchema = Type.Optional(IdentifierSchema);

// 结构层接受对称与非对称误差键；互斥与成对要求留给 Task 8 的 domain validator。
export const PlotBindingsSchema = Type.Object(
  {
    x: IdentifierSchema,
    y: IdentifierSchema,
    xError: OptionalBindingSchema,
    xErrorLower: OptionalBindingSchema,
    xErrorUpper: OptionalBindingSchema,
    yError: OptionalBindingSchema,
    yErrorLower: OptionalBindingSchema,
    yErrorUpper: OptionalBindingSchema,
    group: OptionalBindingSchema,
    label: OptionalBindingSchema,
    color: OptionalBindingSchema,
    size: OptionalBindingSchema,
  },
  { additionalProperties: false },
);

export const LineStyleSchema = Type.Object(
  {
    visible: Type.Boolean(),
    color: Type.String({ minLength: 1 }),
    widthPt: Type.Number({ minimum: 0 }),
    dash: Type.Union([
      Type.Literal('solid'),
      Type.Literal('dashed'),
      Type.Literal('dotted'),
      Type.Literal('dash-dot'),
    ]),
  },
  { additionalProperties: false },
);

export const MarkerStyleSchema = Type.Object(
  {
    visible: Type.Boolean(),
    shape: Type.Union([
      Type.Literal('circle'),
      Type.Literal('square'),
      Type.Literal('triangle'),
      Type.Literal('diamond'),
      Type.Literal('plus'),
      Type.Literal('cross'),
    ]),
    sizePt: Type.Number({ minimum: 0 }),
    fill: Type.String({ minLength: 1 }),
    stroke: Type.String({ minLength: 1 }),
    strokeWidthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const ErrorBarStyleSchema = Type.Object(
  {
    visible: Type.Boolean(),
    color: Type.String({ minLength: 1 }),
    widthPt: Type.Number({ minimum: 0 }),
    capWidthPt: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const LegendEntrySchema = Type.Object(
  {
    visible: Type.Boolean(),
    text: Type.String({ maxLength: 1024 }),
  },
  { additionalProperties: false },
);

export const PlotSlotSchema = Type.Object(
  {
    plotSlotId: IdentifierSchema,
    kind: Type.Literal('xy'),
    mode: Type.Union([
      Type.Literal('markers'),
      Type.Literal('line'),
      Type.Literal('line-markers'),
    ]),
    xAxisId: IdentifierSchema,
    yAxisId: IdentifierSchema,
    bindings: PlotBindingsSchema,
    lineStyle: Type.Optional(LineStyleSchema),
    markerStyle: Type.Optional(MarkerStyleSchema),
    errorBarStyle: Type.Optional(ErrorBarStyleSchema),
    legendEntry: LegendEntrySchema,
    extensions: Type.Optional(ExtensionBagSchema),
  },
  { additionalProperties: false },
);

export type PlotBindings = Type.Static<typeof PlotBindingsSchema>;
export type LineStyle = Type.Static<typeof LineStyleSchema>;
export type MarkerStyle = Type.Static<typeof MarkerStyleSchema>;
export type ErrorBarStyle = Type.Static<typeof ErrorBarStyleSchema>;
export type LegendEntry = Type.Static<typeof LegendEntrySchema>;
export type PlotSlot = Type.Static<typeof PlotSlotSchema>;
