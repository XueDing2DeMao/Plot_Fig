import { useEffect, useMemo, useState } from 'react';
import { bindWorkspace } from '@plot-fig/data-binding';
import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { tableBatchItems, type BatchItem } from '../batch/items.js';
import {
  sourceColumnNames,
  type BatchColumnMappings,
} from '../batch/column-mapping.js';
import { prepare, type BatchOptions } from '../batch/queue.js';
import { builtInTemplates, type TemplateEntry } from '../templates/catalog.js';
import { listTemplates } from '../templates/library-storage.js';
import { useBatchRunner } from './useBatchRunner.js';
import type { LayerFormatScope } from '../state/layer-format.js';

export type FormatReusePreset = 'default' | 'styles' | 'all' | 'custom';
export function useDatasetBatch(model: WorkspaceEditor) {
  const [base] = useState(model);
  const [selectedTables, setSelectedTables] = useState(() =>
    base.workspace.tables.slice(0, 50).map((t) => t.tableId),
  );
  const [templates, setTemplates] = useState<TemplateEntry[]>(builtInTemplates),
    [libraryError, setLibraryError] = useState('');
  const [templateId, setTemplateId] = useState(''),
    [mode, setMode] = useState<'style' | 'full'>('style');
  const [mappings, setMappings] = useState<BatchColumnMappings>({});
  const [autoXY, setAutoXY] = useState(true);
  const [formatReuse, setFormatReuse] = useState<FormatReusePreset>('default');
  const [customFormatScopes, setCustomFormatScopes] = useState<
    LayerFormatScope[]
  >(['legend', 'background', 'colors', 'fonts']);
  const [formats, setFormats] = useState<BatchOptions['formats']>(['svg']);
  const [dpi, setDpi] = useState(300),
    [includeProject, setIncludeProject] = useState(true);
  useEffect(() => {
    let alive = true;
    void listTemplates()
      .then((custom) => {
        if (alive) setTemplates([...builtInTemplates(), ...custom]);
      })
      .catch((e) => {
        if (alive)
          setLibraryError(e instanceof Error ? e.message : '模板库读取失败');
      });
    return () => {
      alive = false;
    };
  }, []);
  const chosen =
    templateId === 'current-style'
      ? base.template
      : templates.find((t) => t.id === templateId)?.template;
  const full = !!chosen && mode === 'full';
  const names = useMemo(
    () =>
      full && chosen !== base.template
        ? {}
        : sourceColumnNames(base.template, base.workspace),
    [full, chosen, base],
  );
  const options = useMemo<BatchOptions>(
    () => ({
      formats,
      dpi,
      includeProject,
      // 默认直接沿用换表后的图形；主动选格式时才追加格式复用。
      ...(chosen
        ? { template: chosen, mode }
        : formatReuse !== 'default'
          ? { template: base.template, mode: 'style' as const }
          : {}),
      ...(!full && formatReuse !== 'default'
        ? {
            formatScopes:
              formatReuse === 'custom' ? customFormatScopes : [formatReuse],
          }
        : {}),
      columnMappings: mappings,
      autoXY,
      ...(full ? { columnNames: names } : {}),
    }),
    [
      formats,
      dpi,
      includeProject,
      chosen,
      base,
      mode,
      mappings,
      full,
      names,
      autoXY,
      formatReuse,
      customFormatScopes,
    ],
  );
  const batch = useMemo(() => {
    try {
      return {
        items: tableBatchItems(base, selectedTables, {
          ...(full ? { template: chosen } : {}),
          columnNames: names,
          columnMappings: mappings,
          autoXY,
        }),
        error: '',
      };
    } catch (e) {
      return {
        items: [] as BatchItem[],
        error: e instanceof Error ? e.message : '无法建立批次',
      };
    }
  }, [base, selectedTables, full, chosen, names, mappings, autoXY]);
  const preflight = useMemo(
    () =>
      batch.items.map((item) => {
        try {
          const prepared = prepare(item, options),
            data = bindWorkspace(prepared.template, prepared.workspace);
          const errors = data.diagnostics.filter((d) => d.severity === 'error');
          return {
            id: item.id,
            error: errors.map((d) => d.message).join('；'),
          };
        } catch (e) {
          return {
            id: item.id,
            error: e instanceof Error ? e.message : '无法准备此项',
          };
        }
      }),
    [batch.items, options],
  );
  const runner = useBatchRunner(batch.items, options);
  const chooseTemplate = (value: string) => {
    setTemplateId(value);
    setMappings({});
  };
  const changeMode = (value: 'style' | 'full') => {
    setMode(value);
    setMappings({});
  };
  return {
    base,
    selectedTables,
    setSelectedTables,
    templates,
    libraryError,
    templateId,
    chooseTemplate,
    chosen,
    mode,
    changeMode,
    full,
    names,
    mappings,
    setMappings,
    autoXY,
    setAutoXY,
    formatReuse,
    setFormatReuse,
    customFormatScopes,
    setCustomFormatScopes,
    formats,
    setFormats,
    dpi,
    setDpi,
    includeProject,
    setIncludeProject,
    options,
    items: batch.items,
    error: batch.error,
    preflight,
    runner,
  };
}
export type DatasetBatchState = ReturnType<typeof useDatasetBatch>;
