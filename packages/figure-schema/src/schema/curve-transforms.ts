import { PaintSchema } from './paint.js';
import Type from 'typebox';
import { IdentifierSchema } from './common.js';
import { Compile } from 'typebox/compile';
const closed = { additionalProperties: false };
const scope = {
  scope: Type.Optional(Type.Enum(['panel', 'within-group', 'between-groups'])),
};
export const CurveOffsetSchema = Type.Union([
  Type.Object(
    { mode: Type.Literal('constant'), value: Type.Number(), ...scope },
    closed,
  ),
  Type.Object(
    { mode: Type.Literal('increment'), value: Type.Number(), ...scope },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('auto'),
      gap: Type.Number({ minimum: 0, maximum: 100 }),
      ...scope,
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('list'),
      values: Type.Array(Type.Number(), { minItems: 1, maxItems: 128 }),
      ...scope,
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('metadata'),
      metadata: Type.Enum(['name', 'unit']),
      ...scope,
    },
    closed,
  ),
]);
export const CurveFillSchema = Type.Object(
  {
    positivePaint: Type.Optional(PaintSchema),
    negativePaint: Type.Optional(PaintSchema),
    target: Type.Enum(['baseline', 'next']),
    baseline: Type.Optional(Type.Number()),
    targetPlotId: Type.Optional(IdentifierSchema),
    positiveColor: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
    negativeColor: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
    opacity: Type.Number({ minimum: 0, maximum: 1 }),
  },
  closed,
);
export const CurveTransformSchema = Type.Object(
  {
    offsetX: Type.Optional(CurveOffsetSchema),
    offsetY: Type.Optional(CurveOffsetSchema),
    fill: Type.Optional(CurveFillSchema),
  },
  { ...closed, minProperties: 1 },
);
export const PanelStackSchema = Type.Object(
  {
    mode: Type.Enum(['normal', 'percent']),
    members: Type.Array(IdentifierSchema, {
      minItems: 2,
      maxItems: 128,
      uniqueItems: true,
    }),
    labels: Type.Optional(
      Type.Object(
        {
          visible: Type.Boolean(),
          color: Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }),
          fontSizePt: Type.Number({ minimum: 4, maximum: 72 }),
          format: Type.Enum(['fixed', 'scientific']),
        },
        closed,
      ),
    ),
  },
  closed,
);
export type CurveOffset = Type.Static<typeof CurveOffsetSchema>;
export type CurveFill = Type.Static<typeof CurveFillSchema>;
export type CurveTransform = Type.Static<typeof CurveTransformSchema>;
export type PanelStack = Type.Static<typeof PanelStackSchema>;
let transformCheck:
  ReturnType<typeof Compile<typeof CurveTransformSchema>> | undefined;
let stackCheck: ReturnType<typeof Compile<typeof PanelStackSchema>> | undefined;
export function validateCurveTransform(
  value: unknown,
): asserts value is CurveTransform {
  transformCheck ??= Compile(CurveTransformSchema);
  if (!transformCheck.Check(value)) throw new Error('曲线偏移或填充设置无效');
  if (
    value.fill?.target === 'baseline' &&
    value.fill.targetPlotId !== undefined
  )
    throw new Error('基线填充不能指定目标曲线');
  if (value.fill?.target === 'next' && value.fill.baseline !== undefined)
    throw new Error('下一曲线填充不能指定基线');
}
export function validatePanelStack(
  value: unknown,
): asserts value is PanelStack {
  stackCheck ??= Compile(PanelStackSchema);
  if (!stackCheck.Check(value))
    throw new Error('堆叠成员、模式或总计标签设置无效');
}
