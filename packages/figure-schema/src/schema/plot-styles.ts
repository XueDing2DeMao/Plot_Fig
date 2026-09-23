import { MARKER_SHAPES } from '../marker-geometry.js';
import Type from 'typebox';
import {
  ExtensionBagSchema,
  IdentifierSchema,
  ShortDeclarativeTextSchema,
} from './common.js';
import { TextContentFormatSchema } from './text-layout.js';

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
    lineColor: OptionalBindingSchema,
    size: OptionalBindingSchema,
    shape: OptionalBindingSchema,
  },
  { additionalProperties: false },
);

const CustomDashSchema = Type.Object(
  {
    lengthsPt: Type.Array(Type.Number({ minimum: 0.1, maximum: 1000 }), {
      anyOf: [2, 4, 6, 8, 10, 12, 14, 16].map((count) => ({
        minItems: count,
        maxItems: count,
      })),
    }),
    offsetPt: Type.Optional(Type.Number({ minimum: -10000, maximum: 10000 })),
  },
  { additionalProperties: false },
);

export const LineStyleSchema = Type.Object(
  {
    cap: Type.Optional(
      Type.Union([
        Type.Literal('butt'),
        Type.Literal('round'),
        Type.Literal('square'),
      ]),
    ),
    join: Type.Optional(
      Type.Union([
        Type.Literal('miter'),
        Type.Literal('round'),
        Type.Literal('bevel'),
      ]),
    ),
    miterLimit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
    opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    customDash: Type.Optional(CustomDashSchema),
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

// 网格和注释沿用基础描边；高级参数只属于绘图曲线。
export const BasicLineStyleSchema = Type.Omit(
  LineStyleSchema,
  ['cap', 'join', 'miterLimit', 'opacity', 'customDash'],
  { additionalProperties: false },
);

export const MarkerStyleSchema = Type.Object(
  {
    visible: Type.Boolean(),
    shape: Type.Enum(MARKER_SHAPES),
    sizePt: Type.Number({ minimum: 0 }),
    fill: Type.String({ minLength: 1 }),
    stroke: Type.String({ minLength: 1 }),
    strokeWidthPt: Type.Number({ minimum: 0 }),
    rotationDeg: Type.Optional(Type.Number({ minimum: -360, maximum: 360 })),
    opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    followLineOpacity: Type.Optional(Type.Boolean()),
    customVertices: Type.Optional(
      Type.Array(
        Type.Array(Type.Number({ minimum: -1, maximum: 1 }), {
          minItems: 2,
          maxItems: 2,
        }),
        { minItems: 3, maxItems: 64 },
      ),
    ),
  },
  {
    additionalProperties: false,
    allOf: [
      {
        if: { properties: { shape: { const: 'custom' } }, required: ['shape'] },
        then: {
          properties: { customVertices: {} },
          required: ['customVertices'],
        },
        else: {
          not: {
            properties: { customVertices: {} },
            required: ['customVertices'],
          },
        },
      },
    ],
  },
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
    text: ShortDeclarativeTextSchema,
    source: Type.Optional(Type.Enum(['auto', 'manual'])),
    format: Type.Optional(TextContentFormatSchema),
  },
  { additionalProperties: false },
);
