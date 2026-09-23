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
  file: File | undefined;
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
  try {
    const tables = draft.selected.map((index) => {
      const table = createDataTable({
        tableId: `table-${index + 1}`,
        ...draft.sheets[index]!,
        options: draft.regions[index]!,
      });
      return {
        ...table,
        columns: table.columns.map((column) => ({
          ...column,
          settings: { ...column.settings, type: 'number' as const },
        })),
      };
    });
    return { tables, error: '' };
  } catch (error) {
    return { tables: [], error: errorText(error) };
  }
}
function useDraftState() {
  const [value, setValue] = useState<State>(() => ({
    open: false,
    file: undefined,
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
      draft: typeof action === 'function' ? action(current.draft) : action,
    }));
  return { value, patch, generation, setDraft };
}
type DraftState = ReturnType<typeof useDraftState>;
function makeReader(state: DraftState) {
  return async (file: File, options: TextInputOptions) => {
    const ticket = ++state.generation.current;
    state.patch({ loading: true, error: '', draft: initialDraft() });
    try {
      const sheets = await readImportFile(file, options);
      if (ticket === state.generation.current)
        state.patch({ draft: draftFor(sheets) });
    } catch (cause) {
      if (ticket === state.generation.current)
        state.patch({ error: errorText(cause) });
    } finally {
      if (ticket === state.generation.current) state.patch({ loading: false });
    }
  };
}
function fileActions(state: DraftState, read: ReturnType<typeof makeReader>) {
  const close = () => {
    state.generation.current += 1;
    state.patch({ open: false, draft: initialDraft(), loading: false });
  };
  const openFile = (file: File) => {
    state.patch({ file, options: initialText, open: true });
    void read(file, initialText);
  };
  const openClipboard = () => {
    state.generation.current += 1;
    state.patch({
      file: undefined,
      clipboard: '',
      options: initialText,
      draft: initialDraft(),
      error: '',
      loading: false,
      open: true,
    });
  };
  return { close, openFile, openClipboard };
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
    if (state.value.file) void read(state.value.file, options);
    else if (state.value.clipboard) previewText(options);
  };
  const setClipboard = (clipboard: string) =>
    state.patch({ clipboard, draft: initialDraft(), error: '' });
  return { previewText, changeOptions, setClipboard };
}
export function useImportDraft(onImport: (tables: DataTable[]) => void) {
  const state = useDraftState();
  const built = useMemo(
    () => buildTables(state.value.draft),
    [state.value.draft],
  );
  const read = makeReader(state),
    files = fileActions(state, read);
  const apply = () => {
    try {
      onImport(built.tables);
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
    error: state.value.error || built.error,
    tables: built.tables,
    apply,
  };
}
