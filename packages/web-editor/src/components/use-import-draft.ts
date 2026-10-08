import { useMemo, useRef, useState, type SetStateAction } from 'react';
import {
  createDataTable,
  type DataTable,
  type TableRegion,
} from '@plot-fig/data-binding';
import {
  readImportFile,
  textSheet,
  type TextInputOptions,
} from '../data/file-input.js';
import type { ImportSheet } from '../data/xlsx-import.js';

const initialText: TextInputOptions = { encoding: 'auto', delimiter: 'auto' };
type Draft = {
  sheets: ImportSheet[];
  regions: TableRegion[];
  selected: number[];
  active: number;
};
type State = {
  open: boolean;
  files: File[];
  fileErrors: string[];
  reading: string;
  draft: Draft;
  options: TextInputOptions;
  clipboard: string;
  error: string;
  loading: boolean;
};
const initialDraft = (): Draft => ({
  sheets: [],
  regions: [],
  selected: [],
  active: 0,
});
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : '导入失败';
function draftFor(sheets: ImportSheet[]): Draft {
  return {
    sheets,
    regions: sheets.map(() => ({
      headerRow: 0,
      unitRow: null,
      dataStartRow: 1,
    })),
    selected: sheets.length ? [0] : [],
    active: 0,
  };
}
function buildTables(draft: Draft) {
  const tables: DataTable[] = [],
    errors: string[] = [];
  for (const index of draft.selected) {
    const sheet = draft.sheets[index]!;
    try {
      const table = createDataTable({
        tableId: `table-${index + 1}`,
        ...sheet,
        options: draft.regions[index]!,
      });
      tables.push({
        ...table,
        columns: table.columns.map((column) => ({
          ...column,
          settings: { ...column.settings, type: 'number' as const },
        })),
      });
    } catch (error) {
      errors.push(
        `${[sheet.source.name, sheet.source.sheetName].filter(Boolean).join(' · ')}：${errorText(error)}`,
      );
    }
  }
  return { tables, errors };
}
function useDraftState() {
  const [value, setValue] = useState<State>(() => ({
    open: false,
    files: [],
    fileErrors: [],
    reading: '',
    draft: initialDraft(),
    options: initialText,
    clipboard: '',
    error: '',
    loading: false,
  }));
  const generation = useRef(0);
  const patch = (value: Partial<State>) =>
    setValue((current) => ({ ...current, ...value }));
  const setDraft = (action: SetStateAction<Draft>) =>
    setValue((current) => ({
      ...current,
      error: '',
      draft: typeof action === 'function' ? action(current.draft) : action,
    }));
  return { value, patch, generation, setDraft };
}
type DraftState = ReturnType<typeof useDraftState>;
function makeReader(state: DraftState) {
  return async (files: File[], options: TextInputOptions) => {
    const ticket = ++state.generation.current;
    state.patch({
      loading: true,
      error: '',
      fileErrors: [],
      draft: initialDraft(),
    });
    const sheets: ImportSheet[] = [],
      selected: number[] = [],
      fileErrors: string[] = [];
    // 顺序读取，避免同时解码多个大工作簿；取消后不再读取后续文件。
    for (const [index, file] of files.entries()) {
      if (ticket !== state.generation.current) return;
      state.patch({ reading: `${index + 1}/${files.length} · ${file.name}` });
      try {
        const next = await readImportFile(file, options);
        if (ticket !== state.generation.current) return;
        if (next.length) selected.push(sheets.length);
        sheets.push(...next);
      } catch (cause) {
        fileErrors.push(`${file.name}：${errorText(cause)}`);
      }
    }
    if (ticket === state.generation.current)
      state.patch({
        draft: { ...draftFor(sheets), selected },
        fileErrors,
        loading: false,
        reading: '',
      });
  };
}
function fileActions(state: DraftState, read: ReturnType<typeof makeReader>) {
  const close = () => {
    state.generation.current += 1;
    state.patch({
      open: false,
      files: [],
      fileErrors: [],
      error: '',
      draft: initialDraft(),
      loading: false,
      reading: '',
    });
  };
  const openFiles = (files: File[]) => {
    state.patch({ files, options: initialText, open: true });
    void read(files, initialText);
  };
  const openClipboard = () => {
    state.generation.current += 1;
    state.patch({
      files: [],
      fileErrors: [],
      reading: '',
      clipboard: '',
      options: initialText,
      draft: initialDraft(),
      error: '',
      loading: false,
      open: true,
    });
  };
  return { close, openFiles, openClipboard };
}
function textActions(state: DraftState, read: ReturnType<typeof makeReader>) {
  const previewText = (options = state.value.options) => {
    try {
      state.patch({
        draft: draftFor([
          textSheet(state.value.clipboard, '剪贴板', {
            ...options,
            clipboard: true,
          }),
        ]),
        error: '',
      });
    } catch (cause) {
      state.patch({ draft: initialDraft(), error: errorText(cause) });
    }
  };
  const changeOptions = (options: TextInputOptions) => {
    state.patch({ options });
    if (state.value.files.length) void read(state.value.files, options);
    else if (state.value.clipboard) previewText(options);
  };
  const setClipboard = (clipboard: string) =>
    state.patch({ clipboard, draft: initialDraft(), error: '' });
  return { previewText, changeOptions, setClipboard };
}
export function useImportDraft(
  onImport: (tables: DataTable[]) => boolean | void,
) {
  const state = useDraftState();
  const built = useMemo(
    () => buildTables(state.value.draft),
    [state.value.draft],
  );
  const read = makeReader(state),
    files = fileActions(state, read);
  const apply = () => {
    if (state.value.loading || state.value.error || !built.tables.length)
      return;
    try {
      if (onImport(built.tables) === false) {
        state.patch({ error: '未能追加数据，请减少所选数据表后重试。' });
        return;
      }
      files.close();
    } catch (cause) {
      state.patch({ error: errorText(cause) });
    }
  };
  return {
    ...state.value,
    ...files,
    ...textActions(state, read),
    setDraft: state.setDraft,
    importErrors: [...state.value.fileErrors, ...built.errors],
    tables: built.tables,
    apply,
  };
}
