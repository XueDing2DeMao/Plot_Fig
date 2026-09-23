import { bindWorkspace } from '@plot-fig/data-binding';
import { rescaleFigureRanges } from '@plot-fig/svg-renderer';
import type { ColumnRef } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { parseWorkspaceProject } from '../state/workspace-project.js';
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
): BatchItem[] {
  if (ids.length > BATCH_LIMITS.items) throw new Error('批次最多 50 项');
  const names = Object.fromEntries(
    Object.entries(model.workspace.slotBindings).map(([id, ref]) => [
      id,
      model.workspace.tables
        .find((t) => t.tableId === ref.tableId)
        ?.columns.find((c) => c.columnId === ref.columnId)?.name,
    ]),
  );
  return ids.map((id) => {
    const table = model.workspace.tables.find((t) => t.tableId === id);
    if (!table) return { id, name: id, error: '数据表不存在' };
    const next = structuredClone(model),
      bindings: Record<string, ColumnRef> = {};
    for (const [slot, name] of Object.entries(names)) {
      const columns = table.columns.filter((c) => c.name === name);
      if (columns.length !== 1)
        return { id, name: table.name, error: '列名缺失或重复：' + name };
      bindings[slot] = { tableId: id, columnId: columns[0]!.columnId };
    }
    next.workspace = {
      tables: [structuredClone(table)],
      activeTableId: id,
      slotBindings: bindings,
    };
    const resolved = rescaleFigureRanges({
      before: model.template,
      candidate: next.template,
      beforeData: bindWorkspace(model.template, model.workspace),
      data: bindWorkspace(next.template, next.workspace),
      reason: 'initialize',
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
  });
}
export async function projectBatchItems(files: File[]): Promise<BatchItem[]> {
  if (
    files.length > BATCH_LIMITS.items ||
    files.reduce((n, f) => n + f.size, 0) > BATCH_LIMITS.inputBytes
  )
    throw new Error('批次最多 50 项、总输入不超过 100 MiB');
  const items: BatchItem[] = [];
  for (const [i, file] of files.entries())
    try {
      const result = parseWorkspaceProject(await file.text());
      items.push(
        result.ok
          ? {
              id: String(i),
              name: file.name,
              model: { template: result.template, workspace: result.workspace },
            }
          : {
              id: String(i),
              name: file.name,
              error: result.diagnostics.map((d) => d.message).join('; '),
            },
      );
    } catch (e) {
      items.push({
        id: String(i),
        name: file.name,
        error: e instanceof Error ? e.message : '读取失败',
      });
    }
  return items;
}
