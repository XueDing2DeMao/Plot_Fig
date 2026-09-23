import {
  createDataTable,
  DATA_LIMITS,
  parseDelimited,
  type DataWorkspace,
} from '@plot-fig/data-binding';
import { loadFigurePayload } from '@plot-fig/figure-migrations';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { parseProjectFile, type ProjectDiagnostic } from './project-file.js';
import { object, validateWorkspace } from './workspace-validation.js';

const PROJECT_KIND = 'plot-fig-project';
export type WorkspaceProjectResult =
  | { ok: true; template: FigureTemplate; workspace: DataWorkspace }
  | { ok: false; diagnostics: ProjectDiagnostic[] };

function failure(
  message: string,
  code: ProjectDiagnostic['code'] = 'PROJECT_INVALID',
): WorkspaceProjectResult {
  return {
    ok: false,
    diagnostics: [{ code, severity: 'error', sourcePath: '/', message }],
  };
}

export function serializeWorkspaceProject(
  template: FigureTemplate,
  workspace: DataWorkspace,
): string {
  const loaded = loadFigurePayload(template);
  if (!loaded.ok || loaded.value.kind !== 'figure-template')
    throw new Error('图形模板无法保存');
  const validated = validateWorkspace(workspace, template);
  const result =
    JSON.stringify(
      { kind: PROJECT_KIND, version: '2.0.0', template, workspace: validated },
      null,
      2,
    ) + '\n';
  if (new TextEncoder().encode(result).byteLength > DATA_LIMITS.projectBytes)
    throw new Error('项目文件超过 20 MiB');
  return result;
}

function migrateLegacy(text: string): WorkspaceProjectResult {
  const legacy = parseProjectFile(text);
  if (!legacy.ok) return legacy;
  const table = createDataTable({
    tableId: 'source-1',
    source: { kind: 'csv', name: legacy.sourceName },
    rows: parseDelimited(legacy.csvText, ','),
  });
  const template = legacy.document.templateSnapshot;
  const workspace: DataWorkspace = {
    tables: [table],
    activeTableId: table.tableId,
    slotBindings: Object.fromEntries(
      legacy.document.bindingSet.map((binding) => [
        binding.dataSlotId,
        { tableId: table.tableId, columnId: binding.columnId },
      ]),
    ),
  };
  return {
    ok: true,
    template,
    workspace: validateWorkspace(workspace, template),
  };
}

export function parseWorkspaceProject(text: string): WorkspaceProjectResult {
  if (new TextEncoder().encode(text).byteLength > DATA_LIMITS.projectBytes)
    return failure('项目文件超过 20 MiB', 'PROJECT_TOO_LARGE');
  try {
    const parsed = object(JSON.parse(text), '/');
    if (parsed.kind !== PROJECT_KIND) return failure('项目文件 kind 无效');
    if (parsed.version === '1.0.0') return migrateLegacy(text);
    if (parsed.version !== '2.0.0')
      return failure('不支持该项目文件版本', 'PROJECT_VERSION_UNSUPPORTED');
    const loaded = loadFigurePayload(parsed.template);
    if (!loaded.ok)
      return {
        ok: false,
        diagnostics: loaded.diagnostics.map((issue) => ({
          code: 'PROJECT_INVALID',
          severity: 'error',
          sourcePath: '/template' + (issue.path === '/' ? '' : issue.path),
          message: issue.message,
        })),
      };
    if (loaded.value.kind !== 'figure-template')
      return failure('图形模板验证失败');
    return {
      ok: true,
      template: loaded.value,
      workspace: validateWorkspace(parsed.workspace, loaded.value),
    };
  } catch (error) {
    return failure(error instanceof Error ? error.message : '项目文件无法读取');
  }
}
