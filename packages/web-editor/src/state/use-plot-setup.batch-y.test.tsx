// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { renderFigureSvg } from '@plot-fig/svg-renderer';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import { usePlotSetup } from './use-plot-setup.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from './workspace-project.js';
afterEach(cleanup);

it('批量 Y 使用待绘图流程，可重置，确认后保存重开和导出一致', () => {
  const initial = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'batch',
        source: { kind: 'csv', name: 'batch.csv' },
        rows: [
          ['x', 'A', 'B', 'C'],
          [0, 1, 2, 3],
          [1, 4, 5, 6],
        ],
      }),
    ],
  );
  const table = initial.workspace.tables[0]!;
  const request = {
    panelId: initial.template.panels[0]!.panelId,
    tableId: table.tableId,
    xColumnId: table.columns[0]!.columnId,
    yColumnIds: table.columns.slice(1).map((c) => c.columnId),
  };
  const { result } = renderHook(() => {
    const [model, setModel] = useState(initial);
    return { model, setup: usePlotSetup(model, setModel) };
  });
  act(() => {
    result.current.setup.onBatchY(request);
  });
  expect(result.current.setup.activePanel.plotSlots).toHaveLength(3);
  expect(result.current.model).toBe(initial);
  expect(result.current.setup.pending).toBe(true);
  act(() => result.current.setup.reset());
  expect(result.current.setup.activePanel.plotSlots).toHaveLength(1);
  act(() => {
    result.current.setup.onBatchY(request);
  });
  act(() => {
    result.current.setup.confirm();
  });
  expect(result.current.setup.error).toBe('');
  expect(result.current.setup.pending).toBe(false);
  const { template, workspace } = result.current.model;
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(template, workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  expect(reopened.template.panels[0]!.plotSlots).toHaveLength(3);
  const before = renderFigureSvg(template, bindWorkspace(template, workspace));
  const after = renderFigureSvg(
    reopened.template,
    bindWorkspace(reopened.template, reopened.workspace),
  );
  expect(before.ok).toBe(true);
  expect(after).toEqual(before);
});
