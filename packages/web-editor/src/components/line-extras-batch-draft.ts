import type { CurveArrows, DropLine } from '@plot-fig/figure-schema';
type Kind = 'curve-arrows' | 'drop-line';
export type ExtrasDraft = Record<string, string>;
export function extrasBatchDraft(kind: Kind, value: unknown): ExtrasDraft {
  if (kind === 'curve-arrows') {
    const v = value as CurveArrows | undefined;
    return {
      position: v?.position ?? 'none',
      length: String(v?.lengthPt ?? 7),
      angle: String(v?.angleDeg ?? 40),
      spacing: v?.spacingFactor === undefined ? '' : String(v.spacingFactor),
      tolerance:
        v?.curveTolerance === undefined ? '' : String(v.curveTolerance),
      color: v?.color ?? '',
    };
  }
  const v = value as DropLine | undefined;
  return {
    mode: v?.target.mode ?? 'none',
    value: v?.target.mode === 'value' ? String(v.target.value) : '0',
    custom: v?.style ? 'true' : 'false',
    color: v?.style?.color ?? '#000000',
    width: String(v?.style?.widthPt ?? 0.75),
    dash: v?.style?.dash ?? 'solid',
  };
}
function numeric(text: string | undefined) {
  const n =
    text && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim())
      ? Number(text)
      : NaN;
  if (!Number.isFinite(n)) throw new Error('请输入完整有限数值');
  return n;
}
export function parseExtrasBatchDraft(kind: Kind, text: string): unknown {
  const d: ExtrasDraft = JSON.parse(text);
  if (kind === 'curve-arrows')
    return d.position === 'none'
      ? undefined
      : {
          position: d.position,
          lengthPt: numeric(d.length),
          angleDeg: numeric(d.angle),
          ...(d.spacing?.trim() && d.position === 'repeat'
            ? { spacingFactor: numeric(d.spacing) }
            : {}),
          ...(d.tolerance?.trim()
            ? { curveTolerance: numeric(d.tolerance) }
            : {}),
          ...(d.color?.trim() ? { color: d.color } : {}),
        };
  return d.mode === 'none'
    ? undefined
    : {
        target:
          d.mode === 'value'
            ? { mode: 'value', value: numeric(d.value) }
            : { mode: d.mode },
        ...(d.custom === 'true'
          ? {
              style: {
                color: d.color,
                widthPt: numeric(d.width),
                dash: d.dash,
              },
            }
          : {}),
      };
}
