import Type from 'typebox';
import { Compile } from 'typebox/compile';

const strict = { additionalProperties: false };
const sampling = Type.Union([
  Type.Object({ mode: Type.Enum(['same', 'all']) }, strict),
  Type.Object(
    {
      mode: Type.Literal('every'),
      step: Type.Integer({ minimum: 1, maximum: 100000 }),
    },
    strict,
  ),
  Type.Object(
    {
      mode: Type.Literal('count'),
      count: Type.Integer({ minimum: 1, maximum: 100000 }),
    },
    strict,
  ),
]);
export const ErrorDirectionDetailsSchema = Type.Object(
  {
    source: Type.Optional(Type.Enum(['magnitude', 'endpoints'])),
    direction: Type.Optional(
      Type.Enum([
        'both',
        'positive',
        'negative',
        'away-baseline',
        'toward-baseline',
      ]),
    ),
    baseline: Type.Optional(Type.Number()),
    render: Type.Optional(Type.Enum(['bars', 'lines', 'band'])),
    connection: Type.Optional(
      Type.Enum(['straight', 'step-h', 'step-v', 'spline']),
    ),
    dash: Type.Optional(Type.Enum(['solid', 'dash', 'dot', 'dash-dot'])),
    opacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    followColor: Type.Optional(Type.Boolean()),
    fill: Type.Optional(Type.String({ pattern: '^(none|#[0-9a-fA-F]{6})$' })),
    fillOpacity: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    sampling: Type.Optional(sampling),
    avoidSymbols: Type.Optional(Type.Boolean()),
  },
  strict,
);
export const ErrorDetailsSchema = Type.Object(
  {
    x: Type.Optional(ErrorDirectionDetailsSchema),
    y: Type.Optional(ErrorDirectionDetailsSchema),
    value: Type.Optional(ErrorDirectionDetailsSchema),
  },
  strict,
);
export type ErrorDirectionDetails = Type.Static<
  typeof ErrorDirectionDetailsSchema
>;
export type ErrorDetails = Type.Static<typeof ErrorDetailsSchema>;
let validator: ReturnType<typeof Compile> | undefined;
export function validateErrorDetails(
  value: unknown,
): asserts value is ErrorDetails {
  validator ??= Compile(ErrorDetailsSchema);
  if (!validator.Check(value))
    throw new Error('误差高级设置包含未知字段或无效数值');
  for (const item of Object.values(value as ErrorDetails))
    if (item?.baseline !== undefined && !Number.isFinite(item.baseline))
      throw new Error('误差参考基线须为有限数值');
  const bar = (value as ErrorDetails).value;
  if (
    bar &&
    ((bar.render !== undefined && bar.render !== 'bars') ||
      (bar.sampling && !['same', 'all'].includes(bar.sampling.mode)) ||
      bar.avoidSymbols)
  )
    throw new Error('柱图误差只支持误差棒，不支持独立抽样或符号避让');
}
