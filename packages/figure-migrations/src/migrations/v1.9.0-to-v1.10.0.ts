import {
  canonicalizeFigurePayload,
  validateV190Structure,
} from '@plot-fig/figure-schema';
export function migrateV190ToV1100(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV190Structure(next, next.kind)
  )
    throw new Error('1.9.0 图形结构无效');
  next.schemaVersion = '1.10.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.10.0';
  return next;
}
