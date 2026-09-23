// @vitest-environment jsdom
import { openPropertyFeature } from '../test-utils/property-navigation.js';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
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
import { BatchPropertyField } from './BatchPropertyField.js';
import { parseBatchField } from './batch-field-drafts.js';
afterEach(cleanup);
const model = () =>
  importTables({ template: defaultTemplate(), workspace: emptyWorkspace() }, [
    createDataTable({
      tableId: 't',
      source: { kind: 'csv', name: 'points.csv' },
      rows: [
        ['X', 'Y'],
        ['1', '2'],
        ['2', '3'],
        ['2', '3'],
      ],
    }),
  ]);
it('对数尺寸超出定义域给出预览提示，原行不存在则阻止应用', () => {
  const m = model();
  m.template.panels[0]!.axes[0]!.scale = 'log10';
  const p = m.template.panels[0]!.plotSlots[0]! as XyPlot;
  p.markerDetails = { fixedSize: { value: 4, unit: 'x-data' } };
  render(
    <FigurePropertiesDialog
      template={m.template}
      data={bindWorkspace(m.template, m.workspace)}
      onApply={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '展开预览' }));
  expect(screen.getByRole('status', { name: '预览提示' })).toHaveTextContent(
    '超出坐标轴定义域',
  );
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Series 1/ }));
  openPropertyFeature('符号细节');
  fireEvent.click(screen.getByLabelText('显示映射图例样本'));
  fireEvent.change(screen.getByLabelText('图例原始行号'), {
    target: { value: '99' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('原始第 99 行');
});
it('正式符号细节草稿跨页保留，禁用清除错误，应用及项目重开一致', () => {
  const original = model(),
    onApplyModel = vi.fn<(m: WorkspaceEditor) => void>();
  render(
    <FigurePropertiesDialog
      template={original.template}
      workspace={original.workspace}
      data={bindWorkspace(original.template, original.workspace)}
      onApply={vi.fn()}
      onApplyModel={onApplyModel}
      onDismiss={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /Series 1/ }));
  openPropertyFeature('符号细节');
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  for (const value of ['-', '-0.', '0.25']) {
    fireEvent.change(screen.getByLabelText('固定数据尺寸'), {
      target: { value },
    });
    openPropertyFeature('线条');
    openPropertyFeature('符号细节');
    expect(screen.getByLabelText('固定数据尺寸')).toHaveValue(value);
  }
  fireEvent.change(screen.getByLabelText('固定数据尺寸'), {
    target: { value: '-' },
  });
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  expect(screen.getByRole('button', { name: '确定' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '应用' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('使用字符符号'));
  fireEvent.change(screen.getByLabelText('固定符号字符'), {
    target: { value: 'Ω' },
  });
  fireEvent.click(screen.getByLabelText('显示映射图例样本'));
  fireEvent.change(screen.getByLabelText('图例原始行号'), {
    target: { value: '1, 3' },
  });
  openPropertyFeature('线条');
  openPropertyFeature('符号细节');
  expect(screen.getByLabelText('图例原始行号')).toHaveValue('1, 3');
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(onApplyModel).toHaveBeenCalledOnce();
  const saved = onApplyModel.mock.calls[0]![0];
  const reopened = parseWorkspaceProject(
    serializeWorkspaceProject(saved.template, saved.workspace),
  );
  expect(reopened.ok).toBe(true);
  if (reopened.ok) {
    const p = reopened.template.panels[0]!.plotSlots[0]! as XyPlot;
    expect(p.markerDetails?.character).toMatchObject({
      mode: 'constant',
      text: 'Ω',
    });
    expect(p.markerDetails?.legend?.rows).toEqual([1, 3]);
    expect(p.markerDetails?.fixedSize).toBeUndefined();
  }
  fireEvent.click(screen.getByRole('button', { name: '恢复符号细节默认值' }));
  fireEvent.click(screen.getByRole('button', { name: '应用' }));
  expect(
    (onApplyModel.mock.calls[1]![0].template.panels[0]!.plotSlots[0]! as XyPlot)
      .markerDetails,
  ).toBeUndefined();
});
it('批量单项表单保留负号中间态，关闭后可清除；其余细节不显示也不改写', () => {
  const field = {
    key: 'fixedSize',
    label: '固定数据尺寸',
    type: 'marker-details' as const,
    optional: true,
  };
  let raw: string | undefined;
  function Batch() {
    const [text, setText] = useState<string>();
    raw = text;
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
  expect(screen.queryByLabelText('使用字符符号')).toBeNull();
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  fireEvent.change(screen.getByLabelText('固定数据尺寸'), {
    target: { value: '-' },
  });
  expect(screen.getByLabelText('固定数据尺寸')).toHaveValue('-');
  expect(() => parseBatchField(field, raw!)).toThrow();
  fireEvent.click(screen.getByLabelText('按数据单位固定尺寸'));
  expect(parseBatchField(field, raw!)).toBeUndefined();
});
