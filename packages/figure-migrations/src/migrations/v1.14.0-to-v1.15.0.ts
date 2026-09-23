import {
  canonicalizeFigurePayload,
  validateV1140Structure,
} from '@plot-fig/figure-schema';
export function migrateV1140ToV1150(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1140Structure(next, next.kind)
  )
    throw new Error('1.14.0 图形结构无效');
  next.schemaVersion = '1.15.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.15.0';
  return next;
}
