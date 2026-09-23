// @vitest-environment jsdom
import {
  openPropertyFeature,
  selectAxisObject,
} from '../test-utils/property-navigation.js';
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
import { AxisPropertiesDialog } from './AxisPropertiesDialog.js';
import { defaultTemplate } from '../state/default-template.js';
import {
  importTables,
  type WorkspaceEditor,
} from '../state/workspace-editor.js';
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from '../state/workspace-project.js';
afterEach(cleanup);

it('can abandon a failed tick-data operation without losing other axis edits', () => {
  const { apply } = setup();
  openPropertyFeature('标题');
  fireEvent.change(screen.getByLabelText('X 轴标题'), {
    target: { value: 'Keep title' },
  });
  openPropertyFeature('刻度');
  fireEvent.click(screen.getByLabelText('启用指定刻度位置'));
  fireEvent.change(screen.getByLabelText('指定刻度位置 · 主刻度来源'), {
    target: { value: 'column' },
  });
  const column = screen.getByLabelText('指定刻度位置 · 主刻度 · 数据列');
  const labelColumn = within(column)
    .getAllByRole('option')
    .find((option) =>
      option.textContent?.endsWith('/ Label'),
    ) as HTMLOptionElement;
  fireEvent.change(column, { target: { value: labelColumn.value } });
  expect(screen.getByRole('alert')).toHaveTextContent('类型匹配');
  fireEvent.click(screen.getByLabelText('启用指定刻度位置'));
  fireEvent.click(screen.getByRole('button', { name: '放弃本次操作' }));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply.mock.lastCall![0].template.panels[0]!.axes[0]!.title?.text).toBe(
    'Keep title',
  );
});
const selectAxis = () => selectAxisObject('下 X 轴');
function setup() {
  const m = importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'f5.csv' },
        rows: [
          ['X', 'Y', 'Label'],
          ['0', '1', 'A'],
          ['50', '2', 'B'],
          ['100', '3', 'C'],
        ],
      }),
    ],
  );
  const apply = vi.fn<(m: WorkspaceEditor) => void>();
  render(
    <AxisPropertiesDialog
      panelId="panel-main"
      axisId="axis-x"
      {...m}
      data={bindWorkspace(m.template, m.workspace)}
      onApply={vi.fn()}
      onApplyModel={apply}
      onDismiss={vi.fn()}
    />,
  );
  selectAxis();
  return { m, apply };
}
it('F5 完整入口保留非法断区草稿，纠正后应用并保存重开', () => {
  const { apply } = setup();
  for (const name of ['特殊刻度线', '参照线', '轴须', '断点', '刻度'])
    expect(screen.getByRole('tab', { name })).toBeInTheDocument();
  openPropertyFeature('刻度');
  fireEvent.change(screen.getByLabelText('X 轴最小值'), {
    target: { value: '0' },
  });
  fireEvent.change(screen.getByLabelText('X 轴最大值'), {
    target: { value: '100' },
  });
  openPropertyFeature('断轴');
  fireEvent.click(screen.getByLabelText('启用断轴'));
  fireEvent.change(screen.getByLabelText('断轴 · 断区 1 · 断区起点'), {
    target: { value: '-' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  openPropertyFeature('参考线');
  fireEvent.click(screen.getByLabelText('启用参考线与填色'));
  openPropertyFeature('断轴');
  expect(screen.getByLabelText('断轴 · 断区 1 · 断区起点')).toHaveValue('-');
  fireEvent.change(screen.getByLabelText('断轴 · 断区 1 · 断区起点'), {
    target: { value: '20' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  const m = apply.mock.calls[0]![0],
    parsed = parseWorkspaceProject(
      serializeWorkspaceProject(m.template, m.workspace),
    );
  expect(parsed.ok).toBe(true);
  if (parsed.ok)
    expect(parsed.template.panels[0]!.axes[0]!.advanced).toMatchObject({
      breaks: { intervals: [{ from: 20, to: 75 }] },
      references: { items: [{ value: 0 }] },
    });
});
it('刻度标签可直接绑定数据表中未使用的文本列，应用为原子操作', () => {
  const { apply } = setup();
  openPropertyFeature('刻度线标签');
  fireEvent.click(screen.getByLabelText('启用标签来源'));
  fireEvent.change(screen.getByLabelText('标签来源 · 来源'), {
    target: { value: 'column' },
  });
  const input = screen.getByLabelText('标签来源 · 数据列'),
    option = [...input.querySelectorAll('option')].find((o) =>
      o.textContent?.endsWith('/ Label'),
    )!;
  expect(option).toBeDefined();
  fireEvent.change(input, { target: { value: option.value } });
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  const m = apply.mock.calls[0]![0],
    slot = m.template.panels[0]!.axes[0]!.advanced!.labels!.dataSlotId!;
  expect(m.workspace.slotBindings[slot]?.columnId).toBe(
    m.workspace.tables[0]!.columns[2]!.columnId,
  );
  expect(
    m.template.dataSlots.find((s) => s.dataSlotId === slot)?.valueType,
  ).not.toBe('number');
});
it('手动刻度可切换为数据列来源，自定义尺度可切回对数而无遗留参数', () => {
  setup();
  openPropertyFeature('刻度');
  fireEvent.click(screen.getByLabelText('启用指定刻度位置'));
  fireEvent.change(screen.getByLabelText('指定刻度位置 · 主刻度来源'), {
    target: { value: 'column' },
  });
  expect(
    screen.getByLabelText('指定刻度位置 · 主刻度 · 数据列'),
  ).toBeInTheDocument();
  openPropertyFeature('刻度');
  fireEvent.change(screen.getByLabelText('X 轴尺度'), {
    target: { value: 'custom' },
  });
  expect(
    screen.getByLabelText('尺度参数 · 正逆公式 · 正向公式 f(x)'),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('X 轴尺度'), {
    target: { value: 'log2' },
  });
  expect(
    screen.queryByLabelText('尺度参数 · 正逆公式 · 正向公式 f(x)'),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
});
