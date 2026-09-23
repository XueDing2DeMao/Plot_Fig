import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('无效旧协议对象');
  return value as JsonRecord;
}

function rejectFields(value: unknown, fields: readonly string[]): void {
  const object = record(value);
  if (fields.some((field) => Object.hasOwn(object, field)))
    throw new Error('1.3.0 不支持坐标轴外观扩展字段');
}

function template(input: unknown): JsonRecord {
  const value = record(input);
  if (value.kind !== 'figure-template' || value.schemaVersion !== '1.3.0')
    throw new Error('1.3.0 模板版本无效');
  if (!Array.isArray(value.panels)) throw new Error('旧模板结构无效');
  for (const entry of value.panels) {
    const panel = record(entry);
    if (!Array.isArray(panel.axes)) throw new Error('旧图层结构无效');
    for (const entry of panel.axes) {
      const axis = record(entry);
      // 仅检查协议声明位置；扩展袋内同名 JSON 数据不属于新增字段。
      rejectFields(axis, ['placement', 'grid']);
      rejectFields(axis.line, ['visible']);
      rejectFields(axis.majorTicks, ['direction', 'color']);
      rejectFields(axis.minorTicks, ['direction', 'color', 'lengthMode']);
      rejectFields(axis.tickLabels, [
        'prefix',
        'suffix',
        'divisor',
        'bold',
        'italic',
        'background',
        'anchor',
        'position',
        'rotation',
        'offsetPt',
        'wrapWidthPt',
        'lineHeight',
        'overlap',
      ]);
      if (record(axis.tickLabels).notation === 'engineering')
        throw new Error('1.3.0 不支持工程计数标签');
      if (axis.title !== undefined)
        rejectFields(axis.title, [
          'bold',
          'italic',
          'position',
          'rotation',
          'offsetPt',
        ]);
    }
  }
  // 不补外观默认值，保留旧自动刻度、generation 和扩展数据。
  return { ...value, schemaVersion: '1.4.0' };
}

export function migrateV130ToV140(input: unknown): unknown {
  const value = record(JSON.parse(canonicalizeFigurePayload(input)));
  if (value.kind === 'figure-template') return template(value);
  if (value.kind !== 'figure-document' || value.schemaVersion !== '1.3.0')
    throw new Error('1.3.0 文档版本无效');
  return {
    ...value,
    schemaVersion: '1.4.0',
    templateSnapshot: template(value.templateSnapshot),
  };
}
