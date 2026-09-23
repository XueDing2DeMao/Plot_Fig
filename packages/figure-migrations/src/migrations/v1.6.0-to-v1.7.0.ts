import {
  canonicalizeFigurePayload,
  validateV160Structure,
} from '@plot-fig/figure-schema';
export function migrateV160ToV170(input: unknown): unknown {
  const value = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(value?.kind) ||
    !validateV160Structure(value, value.kind)
  )
    throw new Error('1.6.0 图形结构无效');
  return value.kind === 'figure-template'
    ? { ...value, schemaVersion: '1.7.0' }
    : {
        ...value,
        schemaVersion: '1.7.0',
        templateSnapshot: { ...value.templateSnapshot, schemaVersion: '1.7.0' },
      };
}
