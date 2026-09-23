import type { DataTable, DataWorkspace } from '@plot-fig/data-binding';
import type { FigureTemplate } from '@plot-fig/figure-schema';
import { WorkspaceDialog } from './WorkspaceDialog.js';

type Props = {
  table: DataTable;
  workspace: DataWorkspace;
  template: FigureTemplate;
  onRemove: (id: string) => void;
  onClose: () => void;
};
export function RemoveTableDialog({
  table,
  workspace,
  template,
  onRemove,
  onClose,
}: Props) {
  const affected = template.panels
    .flatMap((panel) => panel.plotSlots)
    .flatMap((plot, index) =>
      Object.values(plot.bindings).some(
        (slot) =>
          slot && workspace.slotBindings[slot]?.tableId === table.tableId,
      )
        ? [`曲线 ${index + 1}`]
        : [],
    );
  return (
    <WorkspaceDialog title="移除数据表" onClose={onClose}>
      <p>移除“{table.name}”及其列绑定？</p>
      <p>
        {affected.length
          ? `受影响：${affected.join('、')}。其他曲线保持不变。`
          : '没有曲线使用此表。'}
      </p>
      <footer className="workspace-actions">
        <button type="button" onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="danger-action"
          onClick={() => {
            onClose();
            onRemove(table.tableId);
          }}
        >
          确认移除
        </button>
      </footer>
    </WorkspaceDialog>
  );
}
