import {
  canonicalizeFigurePayload,
  validateV150Structure,
} from '@plot-fig/figure-schema';

export function migrateV150ToV160(input: unknown): unknown {
  const value = JSON.parse(canonicalizeFigurePayload(input));
  if (
    !['figure-template', 'figure-document'].includes(value?.kind) ||
    !validateV150Structure(value, value.kind)
  )
    throw new Error('1.5.0 图形结构无效');
  // 仅升级版本；不注入会影响旧图布局、绘制顺序的默认字段。
  return value.kind === 'figure-template'
    ? { ...value, schemaVersion: '1.6.0' }
    : {
        ...value,
        schemaVersion: '1.6.0',
        templateSnapshot: { ...value.templateSnapshot, schemaVersion: '1.6.0' },
      };
}
