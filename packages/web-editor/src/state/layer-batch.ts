import { bindWorkspace, type DataTable } from '@plot-fig/data-binding';
import {
  plotBindingEntries,
  resolvePanelFrames,
  roleAcceptsType,
  type FigureTemplate,
  type Panel,
} from '@plot-fig/figure-schema';
import { renderFigureSvg, rescaleFigureRanges } from '@plot-fig/svg-renderer';
import type { WorkspaceEditor } from './workspace-editor.js';
import { axisDataSlotIds } from './axis-data-refs.js';
import { appendPanelFrom } from './panel-operations.js';
import { assertTemplate } from './publication-utils.js';
import { applyTemplateStyle } from '../templates/styles.js';
import { synchronizeLegendSources } from './legend-bindings.js';

export function layerSlotIds(panel: Panel) {
  return new Set([
    ...panel.plotSlots.flatMap((p) =>
      plotBindingEntries(p).map((e) => e.slotId),
    ),
    ...panel.axes.flatMap((a) => axisDataSlotIds(a.advanced)),
  ]);
}

export function hasLayerAxisLinks(template: FigureTemplate, panelId: string) {
  return (
    template.panels.some((p) =>
      p.axes.some(
        (a) =>
          a.advanced?.link &&
          a.advanced.link.panelId !== p.panelId &&
          (p.panelId === panelId || a.advanced.link.panelId === panelId),
      ),
    ) ||
    !!template.sharedAxisGroups?.some((g) =>
      g.members.some((m) => m.panelId === panelId),
    )
  );
}

// 创建仅用于预览/导出的副本，未配置的其他图层不会干扰当前层。
export function isolateLayer(
  model: WorkspaceEditor,
  panelId: string,
): WorkspaceEditor {
  if (hasLayerAxisLinks(model.template, panelId))
    throw new Error('此图层包含跨层坐标轴联动，请先解除联动再独立批量处理');
  const resolved = resolvePanelFrames(structuredClone(model.template));
  const panel = resolved.panels.find((p) => p.panelId === panelId);
  if (!panel) throw new Error('所选图层不存在');
  delete panel.frameLink;
  const slots = layerSlotIds(panel);
  const plots = new Set(panel.plotSlots.map((p) => p.plotSlotId));
  const slotBindings = Object.fromEntries(
    Object.entries(model.workspace.slotBindings).filter(([id]) =>
      slots.has(id),
    ),
  );
  const tableIds = new Set(
    Object.values(slotBindings).map((ref) => ref.tableId),
  );
  const next = {
    ...model,
    workspace: structuredClone({
      ...model.workspace,
      slotBindings,
      tables: model.workspace.tables.filter((t) => tableIds.has(t.tableId)),
    }),
  };
  if (
    next.workspace.activeTableId &&
    !tableIds.has(next.workspace.activeTableId)
  )
    next.workspace.activeTableId = next.workspace.tables[0]?.tableId ?? null;
  next.template = {
    ...resolved,
    panels: [panel],
    dataSlots: resolved.dataSlots.filter((s) => slots.has(s.dataSlotId)),
    annotations: resolved.annotations
      .filter((a) => a.coordinateSpace === 'page' || a.panelId === panelId)
      .flatMap((a) => {
        if (a.kind !== 'legend' || !a.layout?.plotSlotIds) return [a];
        a.layout.plotSlotIds = a.layout.plotSlotIds.filter((id) =>
          plots.has(id),
        );
        return a.layout.plotSlotIds.length ? [a] : [];
      }),
  };
  delete next.template.sharedAxisGroups;
  next.activePanelId = panelId;
  return next;
}

export function renderLayer(
  model: WorkspaceEditor,
  panelId: string,
  purpose: 'display' | 'export' = 'display',
) {
  const layer = isolateLayer(model, panelId);
  const data = bindWorkspace(layer.template, layer.workspace);
  const errors = data.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length) return { ok: false as const, diagnostics: errors };
  return renderFigureSvg(layer.template, data, { purpose });
}

export function suggestLayerColumns(
  source: WorkspaceEditor,
  table: DataTable,
): Record<string, string> {
  const panel =
    source.template.panels.find((p) => p.panelId === source.activePanelId) ??
    source.template.panels[0]!;
  const ids = layerSlotIds(panel);
  return Object.fromEntries(
    source.template.dataSlots
      .filter((s) => ids.has(s.dataSlotId))
      .flatMap((slot) => {
        const ref = source.workspace.slotBindings[slot.dataSlotId];
        const old =
          ref &&
          source.workspace.tables
            .find((t) => t.tableId === ref.tableId)
            ?.columns.find((c) => c.columnId === ref.columnId);
        const name = old?.name ?? slot.name;
        const matches = table.columns.filter(
          (c) =>
            c.name.toLowerCase() === name.toLowerCase() &&
            roleAcceptsType(slot.role, c.settings.type),
        );
        return matches.length === 1
          ? [[slot.dataSlotId, matches[0]!.columnId]]
          : [];
      }),
  );
}

function fitLayer(model: WorkspaceEditor): WorkspaceEditor {
  for (const panel of model.template.panels)
    for (const axis of panel.axes) {
      axis.range = { mode: 'auto' };
      if (axis.scale === 'category') delete axis.rescale;
      else axis.rescale = { ...axis.rescale, mode: 'auto' };
    }
  const data = bindWorkspace(model.template, model.workspace);
  // 按数量创建的空图层允许保存，绑定完成后才绘图。
  if (data.diagnostics.some((d) => d.severity === 'error')) return model;
  const fit = rescaleFigureRanges({
    before: model.template,
    candidate: model.template,
    beforeData: data,
    data,
    reason: 'initialize',
  });
  if (fit.diagnostics.some((d) => d.severity === 'error'))
    throw new Error(fit.diagnostics.map((d) => d.message).join('；'));
  return { ...model, template: fit.template };
}

export type LayerBatchOptions = {
  mode: 'tables' | 'count';
  tableIds?: string[];
  count?: number;
  keepExisting: boolean;
  mappings?: Record<string, Record<string, string>>;
};

export function createLayerBatch(
  model: WorkspaceEditor,
  source: WorkspaceEditor,
  options: LayerBatchOptions,
): WorkspaceEditor {
  const sourceId = source.activePanelId ?? source.template.panels[0]!.panelId;
  const base = isolateLayer(source, sourceId);
  if (!base.template.panels[0]!.plotSlots.length)
    throw new Error('模板图层中没有曲线，请先添加绘图');
  const tableIds = options.tableIds ?? [];
  const count =
    options.mode === 'tables' ? tableIds.length : (options.count ?? 0);
  const total =
    count + (options.keepExisting ? model.template.panels.length : 0);
  if (!Number.isInteger(count) || count < 1 || total > 16)
    throw new Error('请选择创建数量，图层总数最多 16 个');
  if (new Set(tableIds).size !== tableIds.length)
    throw new Error('请勿重复选择数据表');
  let next = structuredClone(model);
  let firstId = '';
  for (let i = 0; i < count; i++) {
    let layer = structuredClone(base);
    layer.workspace = { ...structuredClone(model.workspace), slotBindings: {} };
    const panel = layer.template.panels[0]!;
    if (options.mode === 'tables') {
      const table = model.workspace.tables.find(
        (t) => t.tableId === tableIds[i],
      );
      if (!table) throw new Error('所选数据表不存在');
      panel.name = table.name.slice(0, 128);
      const mapping =
        options.mappings?.[table.tableId] ?? suggestLayerColumns(source, table);
      for (const slot of layer.template.dataSlots) {
        const columnId = mapping[slot.dataSlotId];
        if (slot.required && !columnId)
          throw new Error(`${table.name}：请选择 ${slot.name} 数据列`);
        if (columnId) {
          const column = table.columns.find((c) => c.columnId === columnId);
          if (!column || !roleAcceptsType(slot.role, column.settings.type))
            throw new Error(`${table.name}：${slot.name} 数据列无效`);
          layer.workspace.slotBindings[slot.dataSlotId] = {
            tableId: table.tableId,
            columnId,
          };
        }
      }
    } else
      panel.name = `图层 ${i + 1 + (options.keepExisting ? model.template.panels.length : 0)}`;
    layer = synchronizeLegendSources(fitLayer(layer));
    if (options.mode === 'tables') {
      const result = renderLayer(layer, panel.panelId);
      if (!result.ok)
        throw new Error(
          `${panel.name}：${result.diagnostics.map((d) => d.message).join('；')}`,
        );
    }
    if (i === 0 && !options.keepExisting) next = layer;
    else next = appendPanelFrom(next, layer, panel.panelId);
    if (i === 0) firstId = next.activePanelId!;
  }
  next.activePanelId = firstId;
  assertTemplate(next.template);
  return next;
}

export function applyLayerStyles(
  model: WorkspaceEditor,
  source: FigureTemplate,
  panelIds: string[],
): WorkspaceEditor {
  if (!panelIds.length) throw new Error('请至少选择一个图层');
  const next = structuredClone(model);
  for (const id of new Set(panelIds)) {
    const layer = isolateLayer(model, id);
    layer.template = applyTemplateStyle(layer.template, source);
    if (source.panels[0]!.appearance)
      layer.template.panels[0]!.appearance = structuredClone(
        source.panels[0]!.appearance,
      );
    else delete layer.template.panels[0]!.appearance;
    const fitted = fitLayer(layer);
    const index = next.template.panels.findIndex((p) => p.panelId === id);
    // 页面尺寸是所有图层共有的；仅替换目标层的样式与自动范围。
    const existing = next.template.panels[index]!;
    next.template.panels[index] = {
      ...fitted.template.panels[0]!,
      ...(existing.frameLink
        ? { frameLink: existing.frameLink, frame: existing.frame }
        : {}),
    };
    const styled = new Map(
      fitted.template.annotations
        .filter((a) => a.coordinateSpace !== 'page')
        .map((a) => [a.annotationId, a]),
    );
    next.template.annotations = next.template.annotations.map(
      (a) => styled.get(a.annotationId) ?? a,
    );
  }
  assertTemplate(next.template);
  return next;
}
