import type { AxisAdvanced } from '@plot-fig/figure-schema';
export function axisDataSlotIds(advanced: AxisAdvanced | undefined): string[] {
  const ids: string[] = [];
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, v] of Object.entries(value)) {
      if (
        (key === 'dataSlotId' || key === 'positionSlotId') &&
        typeof v === 'string'
      )
        ids.push(v);
      else visit(v);
    }
  }
  visit(advanced);
  return ids;
}
export function remapAxisData(
  advanced: AxisAdvanced | undefined,
  names: ReadonlyMap<string, string>,
) {
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, v] of Object.entries(value)) {
      if (
        (key === 'dataSlotId' ||
          key === 'positionSlotId' ||
          key === 'plotSlotId') &&
        typeof v === 'string'
      )
        (value as Record<string, unknown>)[key] = names.get(v) ?? v;
      else if (key === 'plotSlotIds' && Array.isArray(v))
        (value as Record<string, unknown>)[key] = v.map(
          (id) => names.get(id) ?? id,
        );
      else visit(v);
    }
  }
  visit(advanced);
}
