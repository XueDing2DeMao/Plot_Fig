import Type from 'typebox';
import { MARKER_SHAPES } from '../marker-geometry.js';
import { MarkerStyleSchema } from './plot-styles.js';
const domain = Type.Object(
  { min: Type.Number(), max: Type.Number() },
  { additionalProperties: false },
);
const dimension = Type.Number({ minimum: 0, maximum: 1000000 });
export const MarkerMappingSchema = Type.Object(
  {
    color: Type.Optional(
      Type.Object(
        {
          mode: Type.Enum(['continuous', 'categorical']),
          target: Type.Enum(['fill', 'stroke', 'both']),
          colors: Type.Array(Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }), {
            minItems: 1,
            maxItems: 64,
          }),
          domain: Type.Optional(domain),
        },
        { additionalProperties: false },
      ),
    ),
    size: Type.Optional(
      Type.Object(
        {
          mode: Type.Enum(['area', 'diameter']),
          minSize: dimension,
          maxSize: dimension,
          unit: Type.Enum(['pt', 'x-data', 'y-data']),
          domain: Type.Optional(domain),
        },
        { additionalProperties: false },
      ),
    ),
    shape: Type.Optional(
      Type.Object(
        {
          shapes: Type.Array(
            Type.Enum(MARKER_SHAPES.filter((s) => s !== 'custom')),
            { minItems: 1, maxItems: 64 },
          ),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);
const sourceText = Type.String({ minLength: 1, maxLength: 512 });
export const MarkerSourceSchema = Type.Object(
  {
    tableId: sourceText,
    xColumnId: sourceText,
    yColumnId: sourceText,
    dataStartRow: Type.Integer({ minimum: 0, maximum: 100000 }),
    fingerprint: Type.String({ pattern: '^sha256:[0-9a-f]{64}$' }),
  },
  { additionalProperties: false },
);
const patch = Type.Partial(
  Type.Object(
    {
      ...MarkerStyleSchema.properties,
      sizePt: dimension,
      strokeWidthPt: dimension,
      fill: Type.String({ minLength: 1, maxLength: 128 }),
      stroke: Type.String({ minLength: 1, maxLength: 128 }),
    },
    { additionalProperties: false, minProperties: 1 },
  ),
);
export const MarkerOverridesSchema = Type.Object(
  {
    source: MarkerSourceSchema,
    points: Type.Array(
      Type.Object(
        { row: Type.Integer({ minimum: 1, maximum: 100000 }), style: patch },
        { additionalProperties: false },
      ),
      { maxItems: 2000 },
    ),
  },
  { additionalProperties: false },
);
export type MarkerMapping = Type.Static<typeof MarkerMappingSchema>;
export type MarkerSource = Type.Static<typeof MarkerSourceSchema>;
export type MarkerOverrides = Type.Static<typeof MarkerOverridesSchema>;
