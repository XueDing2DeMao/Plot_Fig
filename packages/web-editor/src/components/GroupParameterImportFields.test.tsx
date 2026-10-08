// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import type { CurveGroup } from '@plot-fig/figure-schema';
import { defaultTemplate } from '../state/default-template.js';
import { batchYColumns } from '../state/batch-y-columns.js';
import { importTables } from '../state/workspace-editor.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import { GroupParameterImportFields } from './GroupParameterImportFields.js';

afterEach(cleanup);

function fixture(names = ['500', '550', 'Sample_01']) {
  let model = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 'spectra',
        source: { kind: 'csv', name: 'spectra.csv' },
        rows: [
          ['x', ...names],
          [0, 1, 2, 3],
          [1, 2, 3, 4],
        ],
      }),
    ],
  );
  const table = model.workspace.tables[0]!;
  model = batchYColumns(model, {
    panelId: model.template.panels[0]!.panelId,
    tableId: table.tableId,
    xColumnId: table.columns[0]!.columnId,
    yColumnIds: table.columns.slice(1).map((column) => column.columnId),
  });
  const panel = model.template.panels[0]!;
  panel.plotSlots.forEach((plot, i) => {
    plot.legendEntry.text = ['A', 'B', 'C'][i]!;
  });
  panel.groups = [
    {
      groupId: 'spectra-group',
      name: '光谱组',
      members: panel.plotSlots.map((p) => p.plotSlotId),
      mode: 'dependent',
      increment: 'synchronized',
      step: 1,
      colorMapping: {
        source: 'values',
        colors: ['#000000', '#ffffff'],
        values: [{ plotSlotId: panel.plotSlots[2]!.plotSlotId, value: 1000 }],
      },
    },
  ];
  return model;
}

it('previews source Y column names, confirms successful values only, then applies one property draft', () => {
  const model = fixture();
  const before = structuredClone(model);
  const apply = vi.fn();
  render(
    <FigurePropertiesDialog
      template={model.template}
      workspace={model.workspace}
      data={bindWorkspace(model.template, model.workspace)}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '组' }));
  fireEvent.click(screen.getByRole('button', { name: '从数值列名读取参数' }));
  const preview = within(screen.getByRole('table', { name: '列名参数预览' }));
  expect(preview.getByRole('row', { name: /A 500 500/ })).toBeInTheDocument();
  expect(preview.getByRole('row', { name: /B 550 550/ })).toBeInTheDocument();
  expect(preview.getByRole('row', { name: /C Sample_01/ })).toHaveTextContent(
    '保留原值 1000',
  );
  expect(screen.getByLabelText('映射参数 A')).toHaveValue(null);
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '写入 2 个参数' }));
  expect(screen.getByLabelText('映射参数 A')).toHaveValue(500);
  expect(screen.getByLabelText('映射参数 B')).toHaveValue(550);
  expect(screen.getByLabelText('映射参数 C')).toHaveValue(1000);
  expect(apply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /^应用$/ }));
  expect(apply).toHaveBeenCalledTimes(1);
  const mapping = apply.mock.lastCall![0].panels[0].groups[0].colorMapping;
  expect(
    Object.fromEntries(
      mapping.values.map((entry: { plotSlotId: string; value: number }) => [
        entry.plotSlotId,
        entry.value,
      ]),
    ),
  ).toEqual(
    Object.fromEntries(
      model.template.panels[0]!.plotSlots.map((plot, i) => [
        plot.plotSlotId,
        [500, 550, 1000][i],
      ]),
    ),
  );
  expect(model).toEqual(before);
});

it('cancels the preview and the parent draft without writing parameters', () => {
  const model = fixture();
  const before = structuredClone(model);
  const apply = vi.fn();
  render(
    <FigurePropertiesDialog
      template={model.template}
      workspace={model.workspace}
      data={bindWorkspace(model.template, model.workspace)}
      onApply={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('tab', { name: '组' }));
  fireEvent.click(screen.getByRole('button', { name: '从数值列名读取参数' }));
  fireEvent.click(screen.getByRole('button', { name: '取消读取' }));
  expect(
    screen.queryByRole('table', { name: '列名参数预览' }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText('映射参数 A')).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', { name: '从数值列名读取参数' }));
  fireEvent.click(screen.getByRole('button', { name: '写入 2 个参数' }));
  fireEvent.click(screen.getByRole('button', { name: /^取消$/ }));
  expect(apply).not.toHaveBeenCalled();
  expect(model).toEqual(before);
});

it('requires refreshing a preview when column names change before confirmation', () => {
  const model = fixture();
  const plots = model.template.panels[0]!.plotSlots;
  const value = model.template.panels[0]!.groups![0]!.colorMapping! as Extract<
    NonNullable<CurveGroup['colorMapping']>,
    { source: 'values' }
  >;
  const onChange = vi.fn();
  const { rerender } = render(
    <GroupParameterImportFields
      plots={plots}
      workspace={model.workspace}
      value={value}
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '从数值列名读取参数' }));
  const workspace = structuredClone(model.workspace);
  workspace.tables[0]!.columns[1]!.name = '650';
  rerender(
    <GroupParameterImportFields
      plots={plots}
      workspace={workspace}
      value={value}
      onChange={onChange}
    />,
  );
  expect(screen.getByRole('button', { name: '写入 2 个参数' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('重新读取');
  fireEvent.click(screen.getByRole('button', { name: '从数值列名读取参数' }));
  fireEvent.click(screen.getByRole('button', { name: '写入 2 个参数' }));
  expect(onChange.mock.lastCall![0].values).toContainEqual({
    plotSlotId: plots[0]!.plotSlotId,
    value: 650,
  });
});

it('disables empty imports and explains unavailable source data', () => {
  const model = fixture(['Sample_01', 'NaN', 'Infinity']);
  const plots = model.template.panels[0]!.plotSlots;
  const value = model.template.panels[0]!.groups![0]!.colorMapping! as Extract<
    NonNullable<CurveGroup['colorMapping']>,
    { source: 'values' }
  >;
  const onChange = vi.fn();
  const { rerender } = render(
    <GroupParameterImportFields
      plots={plots}
      workspace={model.workspace}
      value={value}
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '从数值列名读取参数' }));
  expect(screen.getByRole('button', { name: '写入 0 个参数' })).toBeDisabled();
  expect(onChange).not.toHaveBeenCalled();
  rerender(
    <GroupParameterImportFields
      plots={plots}
      value={value}
      onChange={onChange}
    />,
  );
  expect(
    screen.getByRole('button', { name: '从数值列名读取参数' }),
  ).toBeDisabled();
  expect(screen.getByText(/需打开包含源数据的项目/)).toBeInTheDocument();
});
