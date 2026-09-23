import Type from 'typebox';
import { Compile } from 'typebox/compile';
import { validateMarkerMapping } from '../marker-mapping-validation.js';
const strict = { additionalProperties: false };
const colors = Type.Array(Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }), {
  minItems: 1,
  maxItems: 64,
});
export const LineMappingSchema = Type.Union([
  Type.Object({ mode: Type.Literal('increment'), colors }, strict),
  Type.Object({ mode: Type.Literal('categorical'), colors }, strict),
  Type.Object(
    {
      mode: Type.Literal('continuous'),
      colors: Type.Array(Type.String({ pattern: '^#[0-9a-fA-F]{6}$' }), {
        minItems: 2,
        maxItems: 64,
      }),
      domain: Type.Optional(
        Type.Object({ min: Type.Number(), max: Type.Number() }, strict),
      ),
    },
    strict,
  ),
]);
export type LineMapping = Type.Static<typeof LineMappingSchema>;
let check: ReturnType<typeof Compile<typeof LineMappingSchema>> | undefined;
export function validateLineMapping(
  value: unknown,
): asserts value is LineMapping {
  check ??= Compile(LineMappingSchema);
  if (!check.Check(value)) throw new Error('无效的线条颜色映射');
  validateMarkerMapping({
    color: {
      ...value,
      mode: value.mode === 'increment' ? 'categorical' : value.mode,
      target: 'stroke',
    },
  });
}
