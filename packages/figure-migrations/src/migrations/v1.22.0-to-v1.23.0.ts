import {
  canonicalizeFigurePayload,
  validateV1220Structure,
} from '@plot-fig/figure-schema';

export function migrateV1220ToV1230(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1220Structure(next, next.kind)
  )
    throw new Error('1.22.0图形结构无效');
  next.schemaVersion = '1.23.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.23.0';
  return next;
}
