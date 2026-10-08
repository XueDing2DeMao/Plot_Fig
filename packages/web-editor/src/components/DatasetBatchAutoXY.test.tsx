// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  bindTableToPlot,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import { changeSeries, importTables } from '../state/workspace-editor.js';
import { batchYColumns } from '../state/batch-y-columns.js';
import { DatasetBatchDialog } from './DatasetBatchDialog.js';

vi.mock('../templates/library-storage.js', () => ({
  listTemplates: async () => [],
}));
afterEach(cleanup);

it('automatically prepares two-column tables and keeps the mapping UI and full template consistent', async () => {
  let model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'a',
        source: { name: 'source.csv', kind: 'csv' },
        rows: [
          ['angle', 'sample1', 'sample2'],
          ['1', '2', '3'],
          ['2', '4', '6'],
        ],
      }),
      createDataTable({
        tableId: 'b',
        source: { name: 'target.csv', kind: 'csv' },
        rows: [
          ['position', 'intensity'],
          ['10', '20'],
          ['20', '40'],
        ],
      }),
    ],
  );
  const source = model.workspace.tables[0]!;
  model = batchYColumns(model, {
    panelId: model.template.panels[0]!.panelId,
    tableId: 'a',
    xColumnId: source.columns[0]!.columnId,
    yColumnIds: [source.columns[2]!.columnId],
  });
  render(<DatasetBatchDialog model={model} onDismiss={() => {}} />);
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('2 / 2 项可运行'),
  );
  const automatic = screen.getByRole('checkbox', { name: '自动识别两列 XY' });
  expect(automatic).toBeChecked();
  fireEvent.change(screen.getByLabelText('映射项目'), {
    target: { value: 'b' },
  });
  expect(screen.getAllByLabelText(/^映射 .* \([xy]\)$/)).toHaveLength(2);
  expect(screen.getByText(/已自动简化为一条曲线/)).toBeInTheDocument();
  expect(screen.getByLabelText('映射 X (x)')).toHaveTextContent('position');
  expect(screen.getByLabelText('映射 Y (y)')).toHaveTextContent('intensity');
  fireEvent.click(automatic);
  expect(screen.getByRole('status')).toHaveTextContent('1 / 2 项可运行');
  fireEvent.click(automatic);
  fireEvent.change(screen.getByLabelText('绘图依据'), {
    target: { value: 'current-style' },
  });
  fireEvent.change(screen.getByLabelText('套用范围'), {
    target: { value: 'full' },
  });
  expect(screen.getByRole('status')).toHaveTextContent('2 / 2 项可运行');
  expect(screen.getAllByLabelText(/^映射 .* \([xy]\)$/)).toHaveLength(2);
});

it('keeps all mappings available for a figure that uses multiple source tables', async () => {
  let model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    ['a', 'b'].map((id) =>
      createDataTable({
        tableId: id,
        source: { name: id + '.csv', kind: 'csv' },
        rows: [
          [id + 'x', id + 'y'],
          ['1', '2'],
          ['2', '4'],
        ],
      }),
    ),
  );
  model = changeSeries(model, 'duplicate', 'series-1');
  model.workspace = bindTableToPlot(model.workspace, model.template, {
    plotSlotId: 'series-2',
    tableId: 'b',
  });
  render(<DatasetBatchDialog model={model} onDismiss={() => {}} />);
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('0 / 2 项可运行'),
  );
  expect(screen.getAllByLabelText(/^映射 .* \([xy]\)$/)).toHaveLength(4);
  const table = model.workspace.tables[0]!;
  for (const role of ['x', 'y']) {
    for (const select of screen.getAllByLabelText(
      `映射 ${role.toUpperCase()} (${role})`,
    )) {
      fireEvent.change(select, {
        target: {
          value: JSON.stringify({
            tableId: table.tableId,
            columnId: table.columns[role === 'x' ? 0 : 1]!.columnId,
          }),
        },
      });
    }
  }
  expect(screen.getByRole('status')).toHaveTextContent('1 / 2 项可运行');
});
