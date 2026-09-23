import {
  canonicalizeFigurePayload,
  validateV1190Structure,
} from '@plot-fig/figure-schema';

/** F6只增加可选属性；迁移保留1.19的全部内容并更新版本。 */
export function migrateV1190ToV1200(input: unknown): unknown {
  const next = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(next?.kind) ||
    !validateV1190Structure(next, next.kind)
  )
    throw new Error('1.19.0图形结构无效');
  next.schemaVersion = '1.20.0';
  if (next.kind === 'figure-document')
    next.templateSnapshot.schemaVersion = '1.20.0';
  return next;
}
