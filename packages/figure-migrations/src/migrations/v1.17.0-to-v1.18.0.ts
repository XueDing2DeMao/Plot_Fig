import {
  canonicalizeFigurePayload,
  validateV1170Structure,
} from '@plot-fig/figure-schema';
export function migrateV1170ToV1180(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1170Structure(next, next.kind)
  )
    throw new Error('1.17.0 图形结构无效');
  next.schemaVersion = '1.18.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.18.0';
  return next;
}
