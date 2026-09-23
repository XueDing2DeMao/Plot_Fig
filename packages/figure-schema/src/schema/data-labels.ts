import Type from 'typebox';
import { Compile } from 'typebox/compile';
import { MarkerSourceSchema } from './marker-mapping.js';

const closed = { additionalProperties: false } as const;
const text = Type.String({
  maxLength: 1024,
  pattern: '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*$',
});
const color = Type.String({ pattern: '^#[0-9a-fA-F]{6}$' });
const offset = Type.Object(
  {
    x: Type.Number({ minimum: -10000, maximum: 10000 }),
    y: Type.Number({ minimum: -10000, maximum: 10000 }),
    unit: Type.Enum(['pt', 'font-percent']),
  },
  closed,
);
const row = Type.Integer({ minimum: 1, maximum: 100000 });
export const DataLabelsSchema = Type.Object(
  {
    visible: Type.Boolean(),
    source: Type.Enum(['x', 'y', 'xy', 'column', 'row', 'custom']),
    template: Type.Optional(text),
    format: Type.Optional(
      Type.Object(
        {
          mode: Type.Enum(['auto', 'fixed', 'scientific']),
          precision: Type.Integer({ minimum: 0, maximum: 12 }),
          prefix: Type.Optional(text),
          suffix: Type.Optional(text),
        },
        closed,
      ),
    ),
    font: Type.Optional(
      Type.Object(
        {
          family: Type.String({ minLength: 1, maxLength: 128 }),
          sizePt: Type.Number({ minimum: 1, maximum: 256 }),
          bold: Type.Boolean(),
          italic: Type.Boolean(),
        },
        closed,
      ),
    ),
    rotationDeg: Type.Optional(Type.Number({ minimum: -360, maximum: 360 })),
    color: Type.Optional(
      Type.Union([
        Type.Object({ mode: Type.Literal('fixed'), value: color }, closed),
        Type.Object({ mode: Type.Enum(['line', 'marker']) }, closed),
      ]),
    ),
    position: Type.Optional(
      Type.Enum(['above', 'below', 'left', 'right', 'center']),
    ),
    offset: Type.Optional(offset),
    gapPt: Type.Optional(Type.Number({ minimum: 0, maximum: 1000 })),
    wrapChars: Type.Optional(Type.Integer({ minimum: 0, maximum: 256 })),
    lineSpacing: Type.Optional(Type.Number({ minimum: 1, maximum: 3 })),
    collision: Type.Optional(Type.Enum(['none', 'hide', 'move'])),
    leader: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color,
          widthPt: Type.Number({ minimum: 0, maximum: 20 }),
        },
        closed,
      ),
    ),
    box: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          fill: Type.Union([color, Type.Literal('none')]),
          stroke: Type.Union([color, Type.Literal('none')]),
          widthPt: Type.Number({ minimum: 0, maximum: 20 }),
          paddingPt: Type.Number({ minimum: 0, maximum: 100 }),
        },
        closed,
      ),
    ),
    sampling: Type.Optional(
      Type.Union([
        Type.Object({ mode: Type.Literal('all') }, closed),
        Type.Object({ mode: Type.Literal('every'), step: row }, closed),
        Type.Object(
          {
            mode: Type.Literal('count'),
            count: Type.Integer({ minimum: 1, maximum: 2000 }),
          },
          closed,
        ),
        Type.Object(
          {
            mode: Type.Literal('rows'),
            rows: Type.Array(row, {
              minItems: 1,
              maxItems: 2000,
              uniqueItems: true,
            }),
          },
          closed,
        ),
      ]),
    ),
    anchor: Type.Optional(
      Type.Enum([
        'point',
        'baseline',
        'x-error-lower',
        'x-error-upper',
        'y-error-lower',
        'y-error-upper',
      ]),
    ),
    baseline: Type.Optional(Type.Number()),
  },
  closed,
);
export const LabelOverridesSchema = Type.Object(
  {
    source: MarkerSourceSchema,
    points: Type.Array(
      Type.Object(
        {
          row,
          visible: Type.Optional(Type.Boolean()),
          text: Type.Optional(text),
          offset: Type.Optional(offset),
        },
        { ...closed, minProperties: 2 },
      ),
      { maxItems: 2000 },
    ),
  },
  closed,
);
export type DataLabels = Type.Static<typeof DataLabelsSchema>;
export type LabelOverrides = Type.Static<typeof LabelOverridesSchema>;
let labelsCheck:
  ReturnType<typeof Compile<typeof DataLabelsSchema>> | undefined;
let overridesCheck:
  ReturnType<typeof Compile<typeof LabelOverridesSchema>> | undefined;
function finite(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string')
    return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\uD800-\uDFFF\uFFFE\uFFFF]/u.test(
      value,
    );
  if (Array.isArray(value)) return value.every(finite);
  if (value && typeof value === 'object')
    return Object.values(value).every(finite);
  return true;
}
export function validateDataLabels(
  value: unknown,
): asserts value is DataLabels {
  labelsCheck ??= Compile(DataLabelsSchema);
  if (!labelsCheck.Check(value) || !finite(value))
    throw new Error('数据标签参数无效');
  if (
    value.source === 'custom' &&
    (!value.template ||
      /[{}]/.test(value.template.replace(/\{(?:x|y|label|row)\}/g, '')))
  )
    throw new Error('标签模板仅支持 {x}、{y}、{label} 和 {row}');
  if (
    value.sampling?.mode === 'rows' &&
    new Set(value.sampling.rows).size !== value.sampling.rows.length
  )
    throw new Error('标签原行不能重复');
}
export function validateLabelOverrides(
  value: unknown,
): asserts value is LabelOverrides {
  overridesCheck ??= Compile(LabelOverridesSchema);
  if (!overridesCheck.Check(value) || !finite(value))
    throw new Error('标签单点覆盖参数无效');
  if (new Set(value.points.map((p) => p.row)).size !== value.points.length)
    throw new Error('标签覆盖原行不能重复');
}
