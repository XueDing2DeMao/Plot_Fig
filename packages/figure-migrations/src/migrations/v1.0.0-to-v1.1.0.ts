import { canonicalizeFigurePayload } from '@plot-fig/figure-schema';

type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('无效旧协议对象');
  return value as RecordValue;
}
function upgradeTemplate(value: RecordValue) {
  if (value.kind !== 'figure-template' || value.schemaVersion !== '1.0.0')
    throw new Error('旧模板版本无效');
  if (!Array.isArray(value.panels) || !Array.isArray(value.dataSlots))
    throw new Error('旧模板结构无效');
  for (const entry of value.panels) {
    const panel = record(entry);
    if (!Array.isArray(panel.plotSlots) || !Array.isArray(panel.axes))
      throw new Error('旧图层无效');
    if (
      panel.plotSlots.some((p) => record(p).kind !== 'xy') ||
      panel.axes.some((a) => record(a).scale === 'category')
    )
      throw new Error('1.0.0 不支持该图表或轴');
  }
  if (
    value.dataSlots.some((s) =>
      ['category', 'value', 'values', 'z'].includes(String(record(s).role)),
    )
  )
    throw new Error('1.0.0 不支持该数据角色');
  const next = { ...value, schemaVersion: '1.1.0' };
  // 这里只约束本版本的字段，完整结构与领域检查由加载器在迁移结束后执行。
  return next;
}
export function migrateV100ToV110(input: unknown): unknown {
  // 先规范化再读取字段，继承加载器对访问器和非 JSON 值的防护。
  const value = record(JSON.parse(canonicalizeFigurePayload(input)));
  if (value.kind === 'figure-template') return upgradeTemplate(value);
  if (value.kind !== 'figure-document' || value.schemaVersion !== '1.0.0')
    throw new Error('旧文档版本无效');
  const next = {
    ...value,
    schemaVersion: '1.1.0',
    templateSnapshot: upgradeTemplate(record(value.templateSnapshot)),
  };
  return next;
}
