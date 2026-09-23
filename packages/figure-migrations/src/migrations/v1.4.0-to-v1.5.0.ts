import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
type JsonRecord = Record<string, unknown>;
function record(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('无效旧协议对象');
  return value as JsonRecord;
}
function template(input: unknown): JsonRecord {
  const value = record(input);
  if (
    value.kind !== 'figure-template' ||
    value.schemaVersion !== '1.4.0' ||
    !Array.isArray(value.panels)
  )
    throw new Error('1.4.0 模板结构无效');
  for (const entry of value.panels) {
    const panel = record(entry);
    if (!Array.isArray(panel.axes)) throw new Error('旧图层结构无效');
    for (const item of panel.axes) {
      const axis = record(item);
      if (
        Object.hasOwn(axis, 'rescale') ||
        !['auto', 'fixed'].includes(String(record(axis.range).mode))
      )
        throw new Error('1.4.0 不支持范围策略或单端范围');
    }
  }
  return { ...value, schemaVersion: '1.5.0' };
}
export function migrateV140ToV150(input: unknown): unknown {
  const value = record(JSON.parse(canonicalizeFigurePayload(input)));
  if (value.kind === 'figure-template') return template(value);
  if (value.kind !== 'figure-document' || value.schemaVersion !== '1.4.0')
    throw new Error('1.4.0 文档版本无效');
  return {
    ...value,
    schemaVersion: '1.5.0',
    templateSnapshot: template(value.templateSnapshot),
  };
}
