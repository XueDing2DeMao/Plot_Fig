import {
  canonicalizeFigurePayload,
  validateV1110Structure,
} from '@plot-fig/figure-schema';
export function migrateV1110ToV1120(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1110Structure(next, next.kind)
  )
    throw new Error('1.11.0 图形结构无效');
  next.schemaVersion = '1.12.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.12.0';
  return next;
}
