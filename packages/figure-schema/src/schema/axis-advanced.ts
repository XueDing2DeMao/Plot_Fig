import Type from 'typebox';
import { IdentifierSchema } from './common.js';
const closed = { additionalProperties: false };
const choice = <T extends string>(...values: [T, ...T[]]) =>
  Type.Union(
    values.map((v) => Type.Literal(v)) as [
      Type.TLiteral<T>,
      ...Type.TLiteral<T>[],
    ],
  );
const text = Type.String({ maxLength: 1024 });
const size = Type.Number({ minimum: 0, maximum: 256 });
const color = Type.String({ minLength: 1, maxLength: 128 });
export const FormulaPairSchema = Type.Object(
  {
    forward: Type.String({ minLength: 1, maxLength: 256 }),
    inverse: Type.String({ minLength: 1, maxLength: 256 }),
    min: Type.Number(),
    max: Type.Number(),
  },
  closed,
);
export const AxisScaleOptionsSchema = Type.Object(
  {
    offset: Type.Optional(Type.Number()),
    formula: Type.Optional(FormulaPairSchema),
  },
  closed,
);
const positionSource = Type.Union([
  Type.Object(
    {
      mode: Type.Literal('values'),
      values: Type.Array(Type.Number(), { maxItems: 10000 }),
    },
    closed,
  ),
  Type.Object(
    { mode: Type.Literal('column'), dataSlotId: IdentifierSchema },
    closed,
  ),
]);
export const AxisLabelSourceSchema = Type.Object(
  {
    source: choice('value', 'date', 'column', 'metadata', 'index'),
    dataSlotId: Type.Optional(IdentifierSchema),
    positionSlotId: Type.Optional(IdentifierSchema),
    match: Type.Optional(choice('value', 'index')),
    metadata: Type.Optional(choice('name', 'unit', 'table')),
    format: Type.Optional(Type.String({ maxLength: 128 })),
    timeZone: Type.Optional(Type.String({ minLength: 1, maxLength: 128 })),
    title: Type.Optional(text),
  },
  closed,
);
const reference = Type.Object(
  {
    id: IdentifierSchema,
    kind: choice('constant', 'column', 'statistic'),
    value: Type.Optional(Type.Number()),
    dataSlotId: Type.Optional(IdentifierSchema),
    plotSlotId: Type.Optional(IdentifierSchema),
    statistic: Type.Optional(
      choice('mean', 'median', 'min', 'max', 'sd', 'quantile'),
    ),
    quantile: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    domain: Type.Optional(choice('all', 'visible')),
    color: Type.Optional(color),
    widthPt: Type.Optional(size),
    dash: Type.Optional(choice('solid', 'dash', 'dot')),
    label: Type.Optional(text),
    showValue: Type.Optional(Type.Boolean()),
    labelPosition: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  },
  closed,
);
const after = Type.Object(
  {
    scale: Type.Optional(choice('linear', 'log10', 'ln', 'log2')),
    majorStep: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    minorCount: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
    notation: Type.Optional(
      choice('auto', 'fixed', 'scientific', 'engineering'),
    ),
    precision: Type.Optional(Type.Integer({ minimum: 0, maximum: 15 })),
  },
  closed,
);
export const AxisAdvancedSchema = Type.Object(
  {
    calendar: Type.Optional(
      Type.Object(
        {
          unit: choice(
            'second',
            'minute',
            'hour',
            'day',
            'week',
            'month',
            'quarter',
            'year',
          ),
          step: Type.Integer({ minimum: 1, maximum: 10000 }),
          anchor: Type.Optional(Type.Number()),
        },
        closed,
      ),
    ),
    categoryOrder: Type.Optional(
      Type.Object(
        {
          mode: choice('appearance', 'ascending', 'descending', 'custom'),
          values: Type.Optional(Type.Array(text, { maxItems: 10000 })),
        },
        closed,
      ),
    ),
    ticks: Type.Optional(
      Type.Object(
        {
          major: Type.Optional(positionSource),
          minor: Type.Optional(positionSource),
        },
        closed,
      ),
    ),
    labels: Type.Optional(AxisLabelSourceSchema),
    labelTable: Type.Optional(
      Type.Object(
        {
          rows: Type.Array(AxisLabelSourceSchema, { minItems: 1, maxItems: 8 }),
          gapPt: Type.Optional(Type.Number({ minimum: 0, maximum: 64 })),
        },
        closed,
      ),
    ),
    minorLabels: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          fontSizePt: Type.Optional(
            Type.Number({ exclusiveMinimum: 0, maximum: 128 }),
          ),
          color: Type.Optional(color),
        },
        closed,
      ),
    ),
    specialTicks: Type.Optional(
      Type.Array(
        Type.Object(
          {
            at: choice('min', 'max', 'value'),
            value: Type.Optional(Type.Number()),
            label: Type.Optional(text),
            color: Type.Optional(color),
            fontSizePt: Type.Optional(
              Type.Number({ exclusiveMinimum: 0, maximum: 128 }),
            ),
            lengthPt: Type.Optional(size),
            leaderPt: Type.Optional(size),
            hide: Type.Optional(Type.Boolean()),
          },
          closed,
        ),
        { maxItems: 128 },
      ),
    ),
    arrow: Type.Optional(choice('start', 'end', 'both')),
    references: Type.Optional(
      Type.Object(
        {
          items: Type.Array(reference, { maxItems: 128 }),
          fill: Type.Optional(
            Type.Object(
              {
                mode: choice('paired', 'alternating'),
                color,
                opacity: Type.Number({ minimum: 0, maximum: 1 }),
              },
              closed,
            ),
          ),
        },
        closed,
      ),
    ),
    rug: Type.Optional(
      Type.Object(
        {
          plotSlotIds: Type.Array(IdentifierSchema, { maxItems: 128 }),
          source: choice('raw', 'display'),
          arrangement: choice('overlap', 'stack'),
          side: choice('inside', 'outside'),
          followStyle: Type.Boolean(),
          color: Type.Optional(color),
          lengthPt: Type.Optional(size),
          widthPt: Type.Optional(size),
          offsetPt: Type.Optional(size),
        },
        closed,
      ),
    ),
    breaks: Type.Optional(
      Type.Object(
        {
          intervals: Type.Array(
            Type.Object(
              {
                from: Type.Number(),
                to: Type.Number(),
                gapPercent: Type.Optional(
                  Type.Number({ minimum: 0.1, maximum: 20 }),
                ),
                after: Type.Optional(after),
              },
              closed,
            ),
            { minItems: 1, maxItems: 8 },
          ),
          weights: Type.Optional(
            Type.Array(Type.Number({ exclusiveMinimum: 0, maximum: 1000 }), {
              minItems: 2,
              maxItems: 9,
            }),
          ),
          mark: Type.Optional(choice('slash', 'zigzag')),
          markSizePt: Type.Optional(Type.Number({ minimum: 1, maximum: 32 })),
        },
        closed,
      ),
    ),
    link: Type.Optional(
      Type.Object(
        {
          panelId: IdentifierSchema,
          axisId: IdentifierSchema,
          formula: FormulaPairSchema,
        },
        closed,
      ),
    ),
  },
  closed,
);
export type AxisAdvanced = Type.Static<typeof AxisAdvancedSchema>;
export type AxisLabelSource = Type.Static<typeof AxisLabelSourceSchema>;
export type AxisScaleOptions = Type.Static<typeof AxisScaleOptionsSchema>;
