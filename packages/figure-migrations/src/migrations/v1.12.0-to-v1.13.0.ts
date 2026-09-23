import {
  canonicalizeFigurePayload,
  validateV1120Structure,
} from '@plot-fig/figure-schema';
export function migrateV1120ToV1130(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1120Structure(next, next.kind)
  )
    throw new Error('1.12.0 图形结构无效');
  next.schemaVersion = '1.13.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.13.0';
  return next;
}
