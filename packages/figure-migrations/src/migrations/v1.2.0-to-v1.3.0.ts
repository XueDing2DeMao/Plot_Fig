import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('无效旧协议对象');
  return value as JsonRecord;
}

function template(input: unknown): JsonRecord {
  const value = record(input);
  if (value.kind !== 'figure-template' || value.schemaVersion !== '1.2.0')
    throw new Error('1.2.0 模板版本无效');
  if (!Array.isArray(value.panels)) throw new Error('旧模板结构无效');
  for (const entry of value.panels) {
    const panel = record(entry);
    if (!Array.isArray(panel.axes)) throw new Error('旧图层结构无效');
    for (const entry of panel.axes) {
      const axis = record(entry);
      if (Object.hasOwn(record(axis.majorTicks), 'generation'))
        throw new Error('1.2.0 不支持主刻度生成配置');
    }
  }
  // 仅升级版本，不补默认值；旧自动刻度和全部扩展信息保持原样。
  return { ...value, schemaVersion: '1.3.0' };
}

export function migrateV120ToV130(input: unknown): unknown {
  const value = record(JSON.parse(canonicalizeFigurePayload(input)));
  if (value.kind === 'figure-template') return template(value);
  if (value.kind !== 'figure-document' || value.schemaVersion !== '1.2.0')
    throw new Error('1.2.0 文档版本无效');
  return {
    ...value,
    schemaVersion: '1.3.0',
    templateSnapshot: template(value.templateSnapshot),
  };
}
