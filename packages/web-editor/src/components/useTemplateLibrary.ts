import type { WorkspaceEditor } from '../state/workspace-editor.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import type { ColumnRef } from '@plot-fig/data-binding';

import {
  builtInTemplates,
  templateThumbnail,
  type TemplateEntry,
} from '../templates/catalog.js';
import { listTemplates, saveTemplate } from '../templates/library-storage.js';
import { suggestMappings, applyFullTemplate } from '../templates/mapping.js';
import { applyTemplateStyle } from '../templates/styles.js';
import { useModelPreviewDraft } from './use-model-preview-draft.js';
function useTemplateRecords() {
  const mounted = useRef(true);
  const builtins = useMemo(builtInTemplates, []),
    [custom, setCustom] = useState<TemplateEntry[]>([]),
    [message, setMessage] = useState('');
  const reload = async () => {
    const entries = await listTemplates();
    if (mounted.current) setCustom(entries);
  };
  useEffect(() => {
    mounted.current = true;
    void reload().catch((e) => {
      if (mounted.current) setMessage(e.message);
    });
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (!mounted.current) return;
    try {
      const value = await fn();
      await reload();
      if (mounted.current) {
        setMessage('模板库已更新');
        return value;
      }
    } catch (e) {
      if (mounted.current)
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
  const saveImported = async (template: FigureTemplate) => {
    const id = await records.run(() => saveTemplate(template));
    if (!id) return false;
    choice.setSearch('');
    choice.choose({
      id,
      template,
      name: template.metadata.name,
      tags: template.metadata.tags,
      builtIn: false,
    });
    return true;
  };
  useEffect(() => {
    const entries = [...records.builtins, ...records.custom];
    const updated = selected && entries.find((e) => e.id === selected.id);
    if (updated) choice.setSelected(updated);
    else if (entries[0]) choice.choose(entries[0]);
    else choice.setSelected(undefined);
  }, [records.custom]);
  return {
    ...records,
    ...choice,
    draft,
    thumbnail,
    prepare,
    renamed,
    saveImported,
    model,
  };
}
export type TemplateLibraryState = ReturnType<typeof useTemplateLibrary>;
