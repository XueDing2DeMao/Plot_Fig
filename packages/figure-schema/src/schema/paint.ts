import Type from 'typebox';
const closed = { additionalProperties: false };
const color = Type.String({
  pattern: '^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|none)$',
});
/** 缺省 paint 使用宿主原有颜色，none 仅去掉填充，不影响边框。 */
export const PaintSchema = Type.Union([
  Type.Object({ kind: Type.Literal('none') }, closed),
  Type.Object({ kind: Type.Literal('solid'), color }, closed),
  Type.Object(
    {
      kind: Type.Literal('linear-gradient'),
      angle: Type.Number({ minimum: -360, maximum: 360 }),
      startColor: color,
      endColor: color,
    },
    closed,
  ),
  Type.Object(
    {
      kind: Type.Literal('pattern'),
      pattern: Type.Enum(['diagonal', 'cross', 'dots']),
      foreground: color,
      background: color,
      spacingPt: Type.Number({ minimum: 2, maximum: 100 }),
      widthPt: Type.Number({ minimum: 0.1, maximum: 10 }),
    },
    closed,
  ),
]);
export type Paint = Type.Static<typeof PaintSchema>;
