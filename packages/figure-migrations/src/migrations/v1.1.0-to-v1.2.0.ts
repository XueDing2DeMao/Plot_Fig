import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('无效旧协议对象');
  return value as RecordValue;
}
function template(input: unknown): RecordValue {
  const value = record(input);
  if (
    value.kind !== 'figure-template' ||
    value.schemaVersion !== '1.1.0' ||
    value.sharedAxisGroups !== undefined ||
    value.publicationPreset !== undefined
  )
    throw new Error('1.1.0 模板字段无效');
  if (!Array.isArray(value.annotations) || !Array.isArray(value.panels))
    throw new Error('旧模板结构无效');
  for (const a of value.annotations) {
    const annotation = record(a);
    if (['textStyle', 'shapeStyle', 'layout'].some((k) => k in annotation))
      throw new Error('旧版不支持出版样式');
  }
  for (const p of value.panels) {
    const panel = record(p);
    if (!Array.isArray(panel.plotSlots)) throw new Error('旧图表结构无效');
    for (const entry of panel.plotSlots) {
      const plot = record(entry);
      if (
        plot.kind === 'bar' &&
        ('errorBarStyle' in plot ||
          Object.keys(record(plot.bindings)).some((k) =>
            k.startsWith('valueError'),
          ))
      )
        throw new Error('旧版不支持柱图误差');
    }
  }
  const next = { ...value, schemaVersion: '1.2.0' };
  // 不依赖当前协议校验器，避免后续版本升级阻断这条历史路径。
  return next;
}
export function migrateV110ToV120(input: unknown): unknown {
  const value = record(JSON.parse(canonicalizeFigurePayload(input)));
  if (value.kind === 'figure-template') return template(value);
  if (value.kind !== 'figure-document' || value.schemaVersion !== '1.1.0')
    throw new Error('旧文档版本无效');
  const next = {
    ...value,
    schemaVersion: '1.2.0',
    templateSnapshot: template(value.templateSnapshot),
  };
  return next;
}
