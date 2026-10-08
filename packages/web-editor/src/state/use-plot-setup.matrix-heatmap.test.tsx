// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { createDataTable, emptyWorkspace } from '@plot-fig/data-binding';
import { defaultTemplate } from './default-template.js';
import { importTables } from './workspace-editor.js';
import { usePlotSetup } from './use-plot-setup.js';
import type { MatrixHeatmapSelection } from './matrix-heatmap.js';
afterEach(cleanup);
it('热图立即生成独立图层，同时保留已添加的待绘图曲线；失败时保留草稿', () => {
  const initial = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'source',
        source: { kind: 'csv', name: 'XRD.csv' },
        rows: [
          ['x', 'A', 'B'],
          [1, 2, 3],
          [2, 4, 5],
        ],
      }),
    ],
  );
  const table = initial.workspace.tables[0]!;
  const request: MatrixHeatmapSelection = {
    panelId: initial.template.panels[0]!.panelId,
    tableId: table.tableId,
    coordinateColumnId: table.columns[0]!.columnId,
    valueColumnIds: table.columns.slice(1).map((c) => c.columnId),
    layout: 'y-columns',
    coordinates: { mode: 'index' },
    startRow: 1,
    endRow: 2,
  };
  const { result } = renderHook(() => {
    const [model, setModel] = useState(initial);
    return { model, setup: usePlotSetup(model, setModel) };
  });
  act(() => {
    result.current.setup.onBatchY({
      panelId: request.panelId,
      tableId: table.tableId,
      xColumnId: request.coordinateColumnId,
      yColumnIds: request.valueColumnIds,
    });
  });
  act(() => {
    expect(
      result.current.setup.onMatrixHeatmap({
        ...request,
        coordinates: { mode: 'custom', values: [1, 1] },
      }),
    ).toBe(false);
  });
  expect(result.current.model).toBe(initial);
  expect(result.current.setup.pending).toBe(true);
  expect(result.current.setup.error).toMatch(/重复/);
  act(() => {
    expect(result.current.setup.onMatrixHeatmap(request)).toBe(true);
  });
  expect(result.current.model.template.panels).toHaveLength(2);
  expect(result.current.model.template.panels[0]!.plotSlots).toHaveLength(2);
  expect(result.current.setup.activePanel.plotSlots[0]!.kind).toBe('heatmap');
  expect(result.current.setup.choice).toBe('heatmap');
  expect(result.current.setup.pending).toBe(false);
  expect(result.current.setup.error).toBe('');
});
