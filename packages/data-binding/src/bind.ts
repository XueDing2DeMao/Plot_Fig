import { roleAcceptsType, type FigureTemplate } from '@plot-fig/figure-schema';
import type { DataBindingSet, DataDiagnostic, SlotBinding } from './types.js';

function findColumn(
  templateSlot: FigureTemplate['dataSlots'][number],
  data: DataBindingSet,
  override?: string,
) {
  if (override)
    return data.columns.find((column) => column.columnId === override);
  const exact = data.columns.filter(
    (column) => column.name === templateSlot.name,
  );
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  const insensitive = data.columns.filter(
    (column) => column.name.toLowerCase() === templateSlot.name.toLowerCase(),
  );
  return insensitive.length === 1 ? insensitive[0] : undefined;
}

export function bindDataSlots(
  template: FigureTemplate,
  data: DataBindingSet,
  overrides: Record<string, string> = {},
): DataBindingSet {
  const diagnostics: DataDiagnostic[] = [...data.diagnostics];
  const bindings: SlotBinding[] = [];
  for (const slot of template.dataSlots) {
    const column = findColumn(slot, data, overrides[slot.dataSlotId]);
    if (!column && !slot.required) continue;
    if (!column) {
      diagnostics.push({
        code: 'SLOT_COLUMN_MISSING',
        severity: 'error',
        sourcePath: `/dataSlots/${slot.dataSlotId}`,
        message: `No unambiguous column matches ${slot.name}`,
      });
      continue;
    }
    if (!roleAcceptsType(slot.role, column.valueType)) {
      diagnostics.push({
        code: 'COLUMN_TYPE_CONFLICT',
        severity: 'error',
        sourcePath: `/columns/${column.columnId}`,
        message: `${slot.role} requires a numeric column`,
      });
      bindings.push({
        dataSlotId: slot.dataSlotId,
        columnId: column.columnId,
        status: 'invalid',
      });
      continue;
    }
    bindings.push({
      dataSlotId: slot.dataSlotId,
      columnId: column.columnId,
      status: 'valid',
    });
  }
  return { ...structuredClone(data), bindings, diagnostics };
}
