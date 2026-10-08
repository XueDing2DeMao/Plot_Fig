import {
  canonicalizeFigurePayload,
  validateV1230Structure,
} from '@plot-fig/figure-schema';

export function migrateV1230ToV1240(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1230Structure(next, next.kind)
  )
    throw new Error('1.23.0图形结构无效');
  // 新堆叠为可选配置；保留旧偏移与累积值，不在迁移时触发重排。
  next.schemaVersion = '1.24.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.24.0';
  return next;
}
