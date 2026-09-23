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
import {
  serializeWorkspaceProject,
  parseWorkspaceProject,
} from '../state/workspace-project.js';
import { FigurePropertiesDialog } from './FigurePropertiesDialog.js';
import type { XyPlot } from '@plot-fig/figure-schema';
import { markerSourceForPlot, renderFigureSvg } from '@plot-fig/svg-renderer';
import { BatchPropertyField } from './BatchPropertyField.js';
import { parseBatchField } from './batch-field-drafts.js';
import { useState } from 'react';
afterEach(cleanup);
function model() {
  return importTables(
    { template: defaultTemplate(), workspace: emptyWorkspace() },
    [
      createDataTable({
        tableId: 't',
        source: { kind: 'csv', name: 'points.csv' },
        rows: [
          ['X', 'Y', 'C'],
          ['0', '2', '-1'],
          ['1', '3', '0'],
          ['2', '4', '1'],
        ],
      }),
    ],
  );
}
it('正式弹窗保留小数草稿，原子绑定，单点样式与保存重开一致', () => {
  const original = model(),
    onApplyModel = vi.fn<(m: WorkspaceEditor) => void>();
  render(
    <FigurePropertiesDialog
      {...original}
      data={bindWorkspace(original.template, original.workspace)}
      onApply={vi.fn()}
      onApplyModel={onApplyModel}
      onDismiss={vi.fn()}
    />,
  );
  openPropertyFeature('符号映射');
  fireEvent.click(screen.getByLabelText('启用颜色映射'));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('启用大小映射'));
  fireEvent.change(screen.getByLabelText('最小符号尺寸'), {
    target: { value: '-' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('启用大小映射'));
  expect(screen.getByRole('button', { name: '应用' })).toBeEnabled();
  const option = [
    ...screen.getByLabelText('颜色数据列').querySelectorAll('option'),
  ].find((o) => o.textContent === 'C')!;
  fireEvent.change(screen.getByLabelText('颜色数据列'), {
    target: { value: option.value },
  });
  fireEvent.click(screen.getByLabelText('指定颜色输入范围'));
  for (const raw of ['-', '-0.', '-0.15']) {
    fireEvent.change(screen.getByLabelText('颜色输入起点'), {
      target: { value: raw },
    });
    expect(screen.getByLabelText('颜色输入起点')).toHaveValue(raw);
  }
  openPropertyFeature('单点样式');
  fireEvent.change(screen.getByLabelText('原始数据行号'), {
    target: { value: '2' },
  });
  fireEvent.click(screen.getByLabelText('覆盖大小 (pt)'));
  fireEvent.change(screen.getByLabelText('单点大小 (pt)'), {
    target: { value: '-' },
  });
  fireEvent.change(screen.getByLabelText('原始数据行号'), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText('原始数据行号'), {
    target: { value: '2' },
  });
  expect(screen.getByLabelText('单点大小 (pt)')).toHaveValue('-');
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('单点大小 (pt)'), {
    target: { value: '12.5' },
  });
  fireEvent.change(screen.getByLabelText('原始数据行号'), {
    target: { value: '1' },
  });
  fireEvent.change(screen.getByLabelText('原始数据行号'), {
    target: { value: '2' },
  });
  expect(screen.getByLabelText('单点大小 (pt)')).toHaveValue('12.5');
  openPropertyFeature('线条');
  openPropertyFeature('单点样式');
  expect(screen.getByLabelText('原始数据行号')).toHaveValue('2');
  expect(screen.getByLabelText('单点大小 (pt)')).toHaveValue('12.5');
  expect(screen.getByLabelText('单点大小 (pt)')).toHaveAttribute(
    'aria-valuenow',
    '12.5',
  );
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApplyModel).toHaveBeenCalledOnce();
  const applied = onApplyModel.mock.calls[0]![0];
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(applied.template, applied.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (!reopened.ok) return;
  const plot = reopened.template.panels[0]!.plotSlots[0]! as XyPlot;
  expect(plot.markerMapping?.color?.domain?.min).toBe(-0.15);
  expect(plot.markerOverrides?.points).toEqual([
    { row: 2, style: { sizePt: 12.5 } },
  ]);
  expect(reopened.template.schemaVersion).toBe('1.22.0');
  expect(
    renderFigureSvg(
      reopened.template,
      bindWorkspace(reopened.template, reopened.workspace),
      { purpose: 'export' },
    ).ok,
  ).toBe(true);
});
it('来源变化且另有非法输入时仍暂停旧单点覆盖，可清除后恢复编辑', () => {
  const current = model(),
    data = bindWorkspace(current.template, current.workspace),
    plot = current.template.panels[0]!.plotSlots[0]! as XyPlot;
  plot.markerOverrides = {
    source: markerSourceForPlot(plot, data)!,
    points: [{ row: 1, style: { sizePt: 9 } }],
  };
  data.columns[1]!.values[0] = 8;
  render(
    <FigurePropertiesDialog
      {...current}
      data={data}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('线宽 (pt)'), {
    target: { value: '-' },
  });
  openPropertyFeature('单点样式');
  expect(screen.getByText(/旧单点覆盖已暂停/)).toBeInTheDocument();
  expect(screen.getByLabelText('覆盖大小 (pt)')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '清除全部单点覆盖' }));
  expect(screen.queryByText(/旧单点覆盖已暂停/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('覆盖大小 (pt)')).toBeEnabled();
});
it('批量映射允许中间输入但拒绝提交不完整数字', () => {
  const field = {
    key: 'size',
    label: '大小映射',
    type: 'marker-mapping' as const,
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
  fireEvent.click(screen.getByLabelText('启用大小映射'));
  fireEvent.change(screen.getByLabelText('最小符号尺寸'), {
    target: { value: '-' },
  });
  expect(screen.getByLabelText('最小符号尺寸')).toHaveValue('-');
  expect(() => parseBatchField(field, latest)).toThrow();
  fireEvent.change(screen.getByLabelText('最小符号尺寸'), {
    target: { value: '0.5' },
  });
  expect(parseBatchField(field, latest)).toMatchObject({ minSize: 0.5 });
});
