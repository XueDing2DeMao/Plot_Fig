import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { useEffect, useMemo, useState } from 'react';
import type { ColumnRef } from '@plot-fig/data-binding';

import {
  builtInTemplates,
  templateThumbnail,
  type TemplateEntry,
} from '../templates/catalog.js';
import { listTemplates } from '../templates/library-storage.js';
import { suggestMappings, applyFullTemplate } from '../templates/mapping.js';
import { applyTemplateStyle } from '../templates/styles.js';
import { useModelPreviewDraft } from './use-model-preview-draft.js';
function useTemplateRecords() {
  const builtins = useMemo(builtInTemplates, []),
    [custom, setCustom] = useState<TemplateEntry[]>([]),
    [message, setMessage] = useState('');
  const reload = async () => setCustom(await listTemplates());
  useEffect(() => {
    void reload().catch((e) => setMessage(e.message));
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
      setMessage('模板库已更新');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '模板操作失败');
    }
  };
  return { builtins, custom, message, run };
}
function useTemplateChoice(model: WorkspaceEditor, builtins: TemplateEntry[]) {
  const [selected, setSelected] = useState<TemplateEntry | undefined>(
      builtins[0],
    ),
    [search, setSearch] = useState(''),
    [mode, setMode] = useState('style');
  const [mapping, setMapping] = useState<Record<string, ColumnRef>>(() =>
    selected ? suggestMappings(selected.template, model.workspace) : {},
  );
  const [name, setName] = useState(model.template.metadata.name),
    [tags, setTags] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false);
  const choose = (entry: TemplateEntry) => {
    setSelected(entry);
    setMapping(suggestMappings(entry.template, model.workspace));
    setConfirmDelete(false);
    setName(entry.name);
    setTags(entry.tags.join(', '));
  };
  return {
    selected,
    setSelected,
    search,
    setSearch,
    mode,
    setMode,
    mapping,
    setMapping,
    name,
    setName,
    tags,
    setTags,
    confirmDelete,
    setConfirmDelete,
    choose,
  };
}
export function useTemplateLibrary(model: WorkspaceEditor) {
  const records = useTemplateRecords(),
    choice = useTemplateChoice(model, records.builtins),
    draft = useModelPreviewDraft(model);
  const { selected, mode, mapping, name, tags } = choice;
  const thumbnail = useMemo(
    () => (selected ? templateThumbnail(selected.template) : ''),
    [selected],
  );
  const prepare = () => {
    if (!selected) return;
    draft.change(() =>
      mode === 'style'
        ? {
            ...model,
            template: applyTemplateStyle(model.template, selected.template),
          }
        : applyFullTemplate(model, selected.template, mapping),
    );
  };
  const renamed = () => {
    if (!name.trim()) throw new Error('请输入模板名称');
    return {
      ...draft.draft.template,
      metadata: {
        ...draft.draft.template.metadata,
        name: name.trim(),
        tags: tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      },
    };
  };
  useEffect(() => {
    const entries = [...records.builtins, ...records.custom];
    const updated = selected && entries.find((e) => e.id === selected.id);
    if (updated) choice.setSelected(updated);
    else if (entries[0]) choice.choose(entries[0]);
    else choice.setSelected(undefined);
  }, [records.custom]);
  return { ...records, ...choice, draft, thumbnail, prepare, renamed, model };
}
export type TemplateLibraryState = ReturnType<typeof useTemplateLibrary>;
