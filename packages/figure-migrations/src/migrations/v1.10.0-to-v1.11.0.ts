import {
  canonicalizeFigurePayload,
  validateV1100Structure,
} from '@plot-fig/figure-schema';
export function migrateV1100ToV1110(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1100Structure(next, next.kind)
  )
    throw new Error('1.10.0 图形结构无效');
  next.schemaVersion = '1.11.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.11.0';
  return next;
}
