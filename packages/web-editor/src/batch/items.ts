import { bindWorkspace } from '@plot-fig/data-binding';
import { rescaleFigureRanges } from '@plot-fig/svg-renderer';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import {
  resolveBatchColumns,
  sourceColumnNames,
  hasMultipleBatchSources,
  type BatchColumnMappings,
} from './column-mapping.js';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { batchXYTemplate } from './xy-template.js';
import { synchronizeCurveOneAxisTitles } from '../state/axis-title-bindings.js';
export type BatchItem = {
  id: string;
  name: string;
  model?: WorkspaceEditor;
  error?: string;
};
export const BATCH_LIMITS = {
  items: 50,
  inputBytes: 100 * 1024 * 1024,
  outputBytes: 200 * 1024 * 1024,
};
export function tableBatchItems(
  model: WorkspaceEditor,
  ids: string[],
  settings: {
    template?: FigureTemplate;
    columnNames?: Record<string, string>;
    columnMappings?: BatchColumnMappings;
    autoXY?: boolean;
  } = {},
): BatchItem[] {
  if (ids.length > BATCH_LIMITS.items) throw new Error('批次最多 50 项');
  const template = settings.template ?? model.template;
  const currentTemplate =
    !settings.template || settings.template === model.template;
  const names =
    settings.columnNames ??
    (currentTemplate ? sourceColumnNames(template, model.workspace) : {});
  const multipleSources =
    currentTemplate && hasMultipleBatchSources(template, model.workspace);
  return ids.map((id) => {
    const table = model.workspace.tables.find((t) => t.tableId === id);
    if (!table) return { id, name: id, error: '数据表不存在' };
    try {
      const overrides = settings.columnMappings?.[id] ?? {};
      if (
        multipleSources &&
        template.dataSlots.some(
          (s) =>
            (s.required || names[s.dataSlotId] !== undefined) &&
            !Object.hasOwn(overrides, s.dataSlotId),
        )
      )
        throw new Error(
          `${table.name}：原图依赖多张表，请逐项显式确认全部数据槽映射`,
        );
      const workspace = {
        tables: [structuredClone(table)],
        activeTableId: id,
        slotBindings: {},
      };
      const itemTemplate = batchXYTemplate(
        template,
        workspace,
        names,
        overrides,
        settings.autoXY ?? true,
      );
      const remapped: WorkspaceEditor = {
        ...model,
        template: structuredClone(itemTemplate),
        workspace: {
          ...workspace,
          slotBindings: resolveBatchColumns(
            itemTemplate,
            workspace,
            names,
            overrides,
            !!settings.template,
            settings.autoXY ?? true,
          ),
        },
      };
      const next =
        (settings.autoXY ?? true)
          ? synchronizeCurveOneAxisTitles(model, remapped)
          : remapped;
      const resolved = rescaleFigureRanges({
        before: model.template,
        candidate: next.template,
        beforeData: bindWorkspace(model.template, model.workspace),
        data: bindWorkspace(next.template, next.workspace),
        // 当前图形沿用主图的数据变更策略，同表同绑定不重置已显示的窗口。
        reason: settings.template ? 'initialize' : 'change',
      });
      const errors = resolved.diagnostics.filter((d) => d.severity === 'error');
      if (errors.length)
        return {
          id,
          name: table.name,
          error: errors.map((d) => d.message).join('；'),
        };
      next.template = resolved.template;
      return { id, name: table.name, model: next };
    } catch (error) {
      return {
        id,
        name: table.name,
        error: error instanceof Error ? error.message : '无法绑定数据表',
      };
    }
  });
}
