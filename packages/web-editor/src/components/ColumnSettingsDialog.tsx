import { useMemo, useState } from 'react';
import {
  organizeTable,
  updateTableColumn,
  type DataTable,
  type TableColumn,
} from '@plot-fig/data-binding';
import { WorkspaceDialog } from './WorkspaceDialog.js';
import {
  ColumnBasicFields,
  MissingFields,
  DateFields,
  ColumnConversionPreview,
  type ColumnDraftValue,
} from './ColumnSettingsFields.js';

type Props = {
  table: DataTable;
  column: TableColumn;
  onApply: (table: DataTable) => void;
  onClose: () => void;
};
function useColumnDraft(table: DataTable, column: TableColumn) {
  const [value, setValue] = useState<ColumnDraftValue>(() => ({
    name: column.name,
    settings: column.settings,
    tokens: column.settings.missingTokens.join('\n'),
  }));
  const onChange = (patch: Partial<ColumnDraftValue>) =>
    setValue((current) => ({ ...current, ...patch }));
  const tokens = useMemo(
    () =>
      value.tokens
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    [value.tokens],
  );
  const nextTable = useMemo(
    () =>
      updateTableColumn(table, column.columnId, {
        name: value.name,
        settings: { ...value.settings, missingTokens: tokens },
      }),
    [table, column.columnId, value.name, value.settings, tokens],
  );
  const organized = useMemo(
    () =>
      organizeTable({
        ...nextTable,
        columns: nextTable.columns.filter(
          (c) => c.columnId === column.columnId,
        ),
      }).columns[0]!,
    [nextTable, column.columnId],
  );
  const invalid =
    !value.name.trim() ||
    !Number.isInteger(value.settings.utcOffsetMinutes) ||
    Math.abs(value.settings.utcOffsetMinutes) > 840 ||
    tokens.length > 100 ||
    tokens.some((token) => token.length > 256);
  return { value, onChange, nextTable, organized, invalid };
}
function ColumnSubmit({
  invalid,
  onClose,
}: {
  invalid: boolean;
  onClose: () => void;
}) {
  return (
    <footer className="workspace-actions">
      <button type="button" onClick={onClose}>
        取消
      </button>
      <button type="submit" className="primary-action" disabled={invalid}>
        应用列设置
      </button>
    </footer>
  );
}
export function ColumnSettingsDialog({
  table,
  column,
  onApply,
  onClose,
}: Props) {
  const draft = useColumnDraft(table, column);
  return (
    <WorkspaceDialog title="列设置" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.invalid) {
            onApply(draft.nextTable);
            onClose();
          }
        }}
      >
        <ColumnBasicFields value={draft.value} onChange={draft.onChange} />
        <MissingFields value={draft.value} onChange={draft.onChange} />
        {['date', 'datetime'].includes(draft.value.settings.type) && (
          <DateFields value={draft.value} onChange={draft.onChange} />
        )}
        <ColumnConversionPreview column={draft.organized} />
        {draft.invalid && (
          <p className="workspace-error" role="alert">
            请填写列名、有效时区偏移和最多 100 个缺失标记（每个不超过 256
            字符）。
          </p>
        )}
        <ColumnSubmit invalid={draft.invalid} onClose={onClose} />
      </form>
    </WorkspaceDialog>
  );
}
