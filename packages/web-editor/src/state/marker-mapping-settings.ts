import {
  bindWorkspace,
  columnKey,
  type DataBindingSet,
  type DataWorkspace,
} from '@plot-fig/data-binding';
import {
  plotBindingEntries,
  roleAcceptsType,
  validateMarkerMapping,
  type MarkerMapping,
} from '@plot-fig/figure-schema';
import type { WorkspaceEditor } from './workspace-editor.js';
import { templateIdentifiers } from './series-operations.js';
import { assertTemplate } from './publication-utils.js';

export type MarkerMappingSettings = {
  mapping: MarkerMapping;
  columns: Partial<Record<keyof MarkerMapping, string>>;
};
export function markerMappingInputColumns(
  data: DataBindingSet,
  workspace?: DataWorkspace,
) {
  const supported = workspace
    ? new Set(
        workspace.tables.flatMap((t) =>
          t.columns
            .filter((c) =>
              ['number', 'category', 'string'].includes(c.settings.type),
            )
            .map((c) =>
              columnKey({ tableId: t.tableId, columnId: c.columnId }),
            ),
        ),
      )
    : undefined;
  return data.columns.filter((c) => !supported || supported.has(c.columnId));
}
export function configureMarkerMapping(
  model: WorkspaceEditor,
  plotId: string,
  settings: MarkerMappingSettings,
): WorkspaceEditor {
  validateMarkerMapping(settings.mapping);
  const next = structuredClone(model),
    plot = next.template.panels
      .flatMap((p) => p.plotSlots)
      .find((p) => p.plotSlotId === plotId);
  if (plot?.kind !== 'xy') throw new Error('请选择 XY 曲线');
  const data = bindWorkspace(model.template, model.workspace),
    xRef = next.workspace.slotBindings[plot.bindings.x],
    yRef = next.workspace.slotBindings[plot.bindings.y];
  if (!xRef || !yRef || xRef.tableId !== yRef.tableId)
    throw new Error('请先绑定同一张表的 X/Y 数据列');
  const all = next.template.panels.flatMap((p) => p.plotSlots),
    ids = templateIdentifiers(next.template);
  const prune = (slotId: string | undefined) => {
    if (
      slotId &&
      !all.some((p) => plotBindingEntries(p).some((e) => e.slotId === slotId))
    ) {
      next.template.dataSlots = next.template.dataSlots.filter(
        (s) => s.dataSlotId !== slotId,
      );
      delete next.workspace.slotBindings[slotId];
    }
  };
  for (const role of ['color', 'size', 'shape'] as const) {
    const old = plot.bindings[role];
    if (!settings.mapping[role]) {
      delete plot.bindings[role];
      prune(old);
      continue;
    }
    const column = data.columns.find(
      (c) => c.columnId === settings.columns[role],
    );
    if (!column || column.source?.tableId !== xRef.tableId)
      throw new Error(
        '请选择与 X/Y 同表的' +
          { color: '颜色', size: '大小', shape: '形状' }[role] +
          '数据列',
      );
    if (
      (role === 'size' ||
        (role === 'color' && settings.mapping.color?.mode === 'continuous')) &&
      column.valueType !== 'number'
    )
      throw new Error('连续颜色和大小映射需要数值列');
    const table = next.workspace.tables.find(
      (t) => t.tableId === xRef.tableId,
    )!;
    const raw = table.columns.find(
      (c) =>
        columnKey({ tableId: table.tableId, columnId: c.columnId }) ===
        column.columnId,
    )!;
    if (!roleAcceptsType(role, raw.settings.type))
      throw new Error('该列类型不能用于符号映射，请选择数值或分类列');
    let slotId = old;
    if (
      !slotId ||
      all.some(
        (p) =>
          p !== plot && plotBindingEntries(p).some((e) => e.slotId === slotId),
      )
    ) {
      const base = plotId + '-marker-' + role;
      slotId = base;
      let n = 2;
      while (ids.has(slotId)) slotId = base + '-' + n++;
      ids.add(slotId);
      next.template.dataSlots.push({
        dataSlotId: slotId,
        name: '符号' + { color: '颜色', size: '大小', shape: '形状' }[role],
        role,
        valueType: column.valueType,
        required: false,
      });
    } else {
      next.template.dataSlots.find((s) => s.dataSlotId === slotId)!.valueType =
        column.valueType;
    }
    plot.bindings[role] = slotId;
    next.workspace.slotBindings[slotId] = {
      tableId: table.tableId,
      columnId: raw.columnId,
    };
    prune(old);
  }
  if (Object.keys(settings.mapping).length) {
    plot.markerStyle ??= {
      visible: true,
      ...structuredClone(next.template.theme.marker),
      strokeWidthPt: 1,
    };
    plot.markerMapping = structuredClone(settings.mapping);
  } else delete plot.markerMapping;
  assertTemplate(next.template);
  return next;
}
