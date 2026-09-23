import {
  canonicalizeFigurePayload,
  validateV1210Structure,
} from '@plot-fig/figure-schema';
export function migrateV1210ToV1220(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1210Structure(next, next.kind)
  )
    throw new Error('1.21.0图形结构无效');
  next.schemaVersion = '1.22.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.22.0';
  return next;
}
