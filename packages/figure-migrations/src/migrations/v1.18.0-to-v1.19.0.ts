import {
  canonicalizeFigurePayload,
  validateV1180Structure,
} from '@plot-fig/figure-schema';
export function migrateV1180ToV1190(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1180Structure(next, next.kind)
  )
    throw new Error('1.18.0图形结构无效');
  next.schemaVersion = '1.19.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.19.0';
  return next;
}
