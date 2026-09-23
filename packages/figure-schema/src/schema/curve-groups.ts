import Type from 'typebox';
import { IdentifierSchema } from './common.js';
import { MARKER_SHAPES } from '../marker-geometry.js';
import { Compile } from 'typebox/compile';
const closed = { additionalProperties: false };
export const CurveStyleLists = {
  colors: Type.Optional(
    Type.Array(Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }), {
      minItems: 1,
      maxItems: 64,
    }),
  ),
  lineDashes: Type.Optional(
    Type.Array(Type.Enum(['solid', 'dashed', 'dotted', 'dash-dot']), {
      minItems: 1,
      maxItems: 64,
    }),
  ),
  markerShapes: Type.Optional(
    Type.Array(Type.Enum(MARKER_SHAPES.filter((s) => s !== 'custom')), {
      minItems: 1,
      maxItems: 64,
    }),
  ),
};
export const CurveGroupSchema = Type.Object(
  {
    groupId: IdentifierSchema,
    name: Type.String({ minLength: 1, maxLength: 128 }),
    members: Type.Array(IdentifierSchema, {
      minItems: 1,
      maxItems: 128,
      uniqueItems: true,
    }),
    parentId: Type.Optional(IdentifierSchema),
    mode: Type.Enum(['dependent', 'independent']),
    increment: Type.Enum(['synchronized', 'nested']),
    step: Type.Integer({ minimum: 1, maximum: 64 }),
    ...CurveStyleLists,
  },
  closed,
);
export const CurveGroupsSchema = Type.Array(CurveGroupSchema, {
  minItems: 1,
  maxItems: 64,
});
export const CurveSubsetSchema = Type.Union([
  Type.Object(
    {
      mode: Type.Literal('length'),
      length: Type.Integer({ minimum: 1, maximum: 100000 }),
      breakConnection: Type.Boolean(),
      ...CurveStyleLists,
    },
    closed,
  ),
  Type.Object(
    {
      mode: Type.Literal('group'),
      breakConnection: Type.Boolean(),
      ...CurveStyleLists,
    },
    closed,
  ),
]);
export type CurveGroup = Type.Static<typeof CurveGroupSchema>;
export type CurveGroups = Type.Static<typeof CurveGroupsSchema>;
export type CurveSubset = Type.Static<typeof CurveSubsetSchema>;
let groupsCheck:
  ReturnType<typeof Compile<typeof CurveGroupsSchema>> | undefined;
let subsetCheck:
  ReturnType<typeof Compile<typeof CurveSubsetSchema>> | undefined;
export function validateCurveGroupsStructure(
  value: unknown,
): asserts value is CurveGroups {
  groupsCheck ??= Compile(CurveGroupsSchema);
  if (!groupsCheck.Check(value))
    throw new Error('曲线组的成员、递增列表或步长无效');
}
export function validateCurveSubset(
  value: unknown,
): asserts value is CurveSubset {
  subsetCheck ??= Compile(CurveSubsetSchema);
  if (!subsetCheck.Check(value))
    throw new Error('曲线子集的分段方式或样式列表无效');
}
