import {
  canonicalizeFigurePayload,
  validateV1130Structure,
} from '@plot-fig/figure-schema';
export function migrateV1130ToV1140(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1130Structure(next, next.kind)
  )
    throw new Error('1.13.0 图形结构无效');
  next.schemaVersion = '1.14.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.14.0';
  return next;
}
