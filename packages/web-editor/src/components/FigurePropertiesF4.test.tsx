// @vitest-environment jsdom
import { openPropertyFeature } from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import {
  bindWorkspace,
  createDataTable,
  emptyWorkspace,
} from '@plot-fig/data-binding';
import { defaultTemplate } from '../state/default-template.js';
import {
  importTables,
  type WorkspaceEditor,
} from '../state/workspace-editor.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import {
  parseWorkspaceProject,
  serializeWorkspaceProject,
} from '../state/workspace-project.js';
import type { XyPlot } from '@plot-fig/figure-schema';
import { changeSeries } from '../state/workspace-editor.js';
import { useState } from 'react';
import { BatchPropertyField } from './BatchPropertyField.js';
import { parseBatchField } from './batch-field-drafts.js';
afterEach(cleanup);
function model() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'f4.csv' },
        rows: [
          ['X', 'Y', 'C'],
          ['0', '2', '1'],
          ['1', '3', '2'],
          ['2', '4', '3'],
        ],
      }),
    ],
  );
}
it('先填写包含标签列的安全模板仍可原子绑定并应用', () => {
  const m = model(),
    apply = vi.fn<(m: WorkspaceEditor) => void>();
  render(
    <FigurePropertiesDialog
      {...m}
      data={bindWorkspace(m.template, m.workspace)}
      onApply={vi.fn()}
      onApplyModel={apply}
      onDismiss={vi.fn()}
    />,
  );
  openPropertyFeature('数据标签');
  fireEvent.click(screen.getByLabelText('显示数据标签'));
  fireEvent.change(screen.getByLabelText('标签来源'), {
    target: { value: 'custom' },
  });
  fireEvent.change(screen.getByLabelText('标签文本模板'), {
    target: { value: '{label}: {y}' },
  });
  const select = screen.getByLabelText('标签数据列'),
    column = [...select.querySelectorAll('option')].find(
      (o) => o.textContent === 'C',
    )!;
  fireEvent.change(select, { target: { value: column.value } });
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  const applied = apply.mock.calls[0]![0],
    plot = applied.template.panels[0]!.plotSlots[0] as XyPlot;
  expect(plot.dataLabels?.template).toBe('{label}: {y}');
  expect(applied.workspace.slotBindings[plot.bindings.label!]!.columnId).toBe(
    m.workspace.tables[0]!.columns[2]!.columnId,
  );
});
it('正式属性入口编辑 F4、阻止无效草稿并保存重开与恢复默认', () => {
  const m = model(),
    apply = vi.fn<(m: WorkspaceEditor) => void>();
  render(
    <FigurePropertiesDialog
      {...m}
      data={bindWorkspace(m.template, m.workspace)}
      onApply={vi.fn()}
      onApplyModel={apply}
      onDismiss={vi.fn()}
    />,
  );
  for (const tab of ['线条', '标签', '子集'])
    expect(screen.getByRole('tab', { name: tab })).toBeInTheDocument();
  openPropertyFeature('数据标签');
  fireEvent.click(screen.getByLabelText('显示数据标签'));
  fireEvent.change(screen.getByLabelText('标签水平偏移'), {
    target: { value: '-' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('标签水平偏移'), {
    target: { value: '-0.5' },
  });
  openPropertyFeature('线条映射');
  fireEvent.click(screen.getByLabelText('启用线条颜色映射'));
  openPropertyFeature('子集');
  fireEvent.click(screen.getByLabelText('启用曲线内部子集'));
  openPropertyFeature('偏移与填充');
  fireEvent.click(screen.getByLabelText('启用 X 偏移'));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  const applied = apply.mock.calls[0]![0],
    reopened = parseWorkspaceProject(
      serializeWorkspaceProject(applied.template, applied.workspace),
    );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  const plot = reopened.template.panels[0]!.plotSlots[0] as XyPlot;
  expect(plot.dataLabels?.offset?.x).toBe(-0.5);
  expect(plot.lineMapping?.mode).toBe('increment');
  expect(plot.subset?.mode).toBe('length');
  expect(plot.transform?.offsetX).toBeDefined();
  openPropertyFeature('数据标签');
  fireEvent.click(screen.getByRole('button', { name: '恢复默认标签' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (apply.mock.calls[1]![0].template.panels[0]!.plotSlots[0] as XyPlot)
      .dataLabels,
  ).toBeUndefined();
});
it('正式误差入口保留非法数值草稿，取消只丢弃未应用修改', () => {
  const m = model(),
    apply = vi.fn<(m: WorkspaceEditor) => void>(),
    dismiss = vi.fn();
  const props = {
    ...m,
    data: bindWorkspace(m.template, m.workspace),
    onApply: vi.fn(),
    onApplyModel: apply,
    onDismiss: dismiss,
  };
  const mounted = render(<FigurePropertiesDialog {...props} />);
  openPropertyFeature('误差');
  fireEvent.change(screen.getByLabelText('误差线宽 (pt)'), {
    target: { value: '-' },
  });
  expect(screen.getByLabelText('误差线宽 (pt)')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('误差线宽 (pt)'), {
    target: { value: '0.75' },
  });
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  openPropertyFeature('数据标签');
  fireEvent.click(screen.getByLabelText('显示数据标签'));
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(dismiss).toHaveBeenCalledOnce();
  expect(apply).toHaveBeenCalledOnce();
  const saved = apply.mock.calls[0]![0];
  mounted.unmount();
  render(<FigurePropertiesDialog {...props} {...saved} />);
  openPropertyFeature('数据标签');
  expect(screen.getByLabelText('显示数据标签')).not.toBeChecked();
  openPropertyFeature('误差');
  expect(screen.getByLabelText('误差线宽 (pt)')).toHaveValue('0.75');
});
it('F4 批量输入保留负数草稿，拒绝不完整标签数值', () => {
  const field = {
    key: 'dataLabels',
    label: '数据标签',
    type: 'f4-object' as const,
    optional: true,
  };
  let latest = '';
  function Batch() {
    const [text, setText] = useState<string | undefined>();
    latest = text ?? '';
    return (
      <BatchPropertyField
        field={field}
        common={{ mixed: true }}
        text={text}
        disabled={false}
        onChange={setText}
        onReset={() => setText(undefined)}
      />
    );
  }
  render(<Batch />);
  fireEvent.click(screen.getByLabelText('显示数据标签'));
  fireEvent.change(screen.getByLabelText('标签水平偏移'), {
    target: { value: '-' },
  });
  expect(screen.getByLabelText('标签水平偏移')).toHaveValue('-');
  expect(() => parseBatchField(field, latest)).toThrow();
  fireEvent.change(screen.getByLabelText('标签水平偏移'), {
    target: { value: '-0.5' },
  });
  expect(parseBatchField(field, latest)).toMatchObject({ offset: { x: -0.5 } });
});
it('图层组与堆叠可编辑且解除依赖保留当前外观', () => {
  const m = changeSeries(model(), 'duplicate', 'series-1'),
    apply = vi.fn<(m: WorkspaceEditor) => void>();
  render(
    <FigurePropertiesDialog
      {...m}
      data={bindWorkspace(m.template, m.workspace)}
      onApply={vi.fn()}
      onApplyModel={apply}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '图层 panel-main' }));
  openPropertyFeature('曲线组');
  fireEvent.click(screen.getByRole('button', { name: '添加曲线组' }));
  fireEvent.change(screen.getByLabelText(/组 1\s*颜色 2/), {
    target: { value: '#aa22bb' },
  });
  fireEvent.click(screen.getByLabelText('组 1 依赖自动样式'));
  openPropertyFeature('堆叠');
  fireEvent.click(screen.getByLabelText('启用曲线堆叠'));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(apply).toHaveBeenCalledOnce();
  const p = apply.mock.calls[0]![0].template.panels[0]!;
  expect(p.groups?.[0]?.mode).toBe('independent');
  expect((p.plotSlots[1] as XyPlot).lineStyle?.color).toBe('#aa22bb');
  expect(p.stack?.members).toEqual(['series-1', 'series-2']);
});
